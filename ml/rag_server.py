import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from groq import Groq
import requests
from dotenv import load_dotenv
load_dotenv()

# Optional Chroma mirror for local/dev use
CHROMA_ENABLED = os.getenv("CHROMA_ENABLED", "false").lower() == "true"
chroma_collection = None

if CHROMA_ENABLED:
    import chromadb
    chroma_client = chromadb.PersistentClient(path="./chroma_sleepcare")
    chroma_collection = chroma_client.get_or_create_collection(name="sleepcare")

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_EMBED_URL = os.getenv("SUPABASE_EMBED_URL")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL missing")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY missing")
if not SUPABASE_EMBED_URL:
    raise RuntimeError("SUPABASE_EMBED_URL missing")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)


def embed_text(text: str):
    res = requests.post(
        SUPABASE_EMBED_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
        },
        json={"input": text},
        timeout=30,
    )
    res.raise_for_status()
    data = res.json()
    embedding = data.get("embedding")
    if not embedding:
        raise ValueError("Embedding function returned no embedding")
    return embedding


def reading_to_text(data: dict) -> str:
    parts = [
        f"mode={data.get('mode')}",
        f"SpO2={data.get('spo2')}",
        f"HR={data.get('heart_rate')}",
        f"Presence={'Yes' if data.get('presence') else 'No'}",
        f"Alert={data.get('alert', 'None')}",
        f"CNN={data.get('cnn_label', 'None')}",
        f"CNNConfidence={data.get('cnn_confidence')}",
        f"RiskScore={data.get('risk_score')}",
        f"RiskLevel={data.get('risk_level')}",
        f"SleepStage={data.get('sleep_stage', '--')}",
        f"Alpha={data.get('alpha', 0)}",
        f"Beta={data.get('beta', 0)}",
        f"Gamma={data.get('gamma', 0)}",
        f"RMS={data.get('rms', 0)}",
        f"BreathingStatus={data.get('breathing_status', '--')}",
        f"BreathingRate={data.get('breathing_rate')}",
    ]
    return ", ".join([p for p in parts if p is not None])


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "sleepcare-rag-supabase",
        "groq_model": GROQ_MODEL,
        "chroma_enabled": CHROMA_ENABLED
    })


@app.route("/store-reading", methods=["POST"])
def store_reading():
    try:
        data = request.get_json(silent=True) or {}
        text = reading_to_text(data)
        embedding = embed_text(text)

        row = {
            "mode": data.get("mode"),
            "content": text,
            "metadata": {
                "mode": data.get("mode"),
                "risk_level": data.get("risk_level"),
                "cnn_label": data.get("cnn_label"),
                "sleep_stage": data.get("sleep_stage"),
            },
            "embedding": embedding,
        }

        supabase.table("sleepcare_documents").insert(row).execute()

        # Optional advanced local mirror
        if CHROMA_ENABLED and chroma_collection is not None:
            chroma_collection.add(
                documents=[text],
                embeddings=[embedding],
                ids=[str(os.urandom(8).hex())],
                metadatas=[row["metadata"]],
            )

        return jsonify({"status": "stored"})
    except Exception as e:
        return jsonify({"error": f"store-reading failed: {str(e)}"}), 500


@app.route("/query", methods=["POST"])
def query():
    try:
        payload = request.get_json(silent=True) or {}
        question = (payload.get("question") or "").strip()

        if not question:
            return jsonify({"error": "question required"}), 400

        query_embedding = embed_text(question)

        matches = supabase.rpc(
            "match_sleepcare_documents",
            {
                "query_embedding": query_embedding,
                "match_count": 5,
            },
        ).execute()

        docs = matches.data or []

        if not docs:
            return jsonify({"answer": "No relevant patient sensor context was found yet."})

        context = "\n".join(
            [f"[similarity={round(doc['similarity'], 4)}] {doc['content']}" for doc in docs]
        )

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a SleepCare health assistant. "
                        "Answer only from the retrieved patient monitoring context. "
                        "Do not invent vitals, diagnoses, or events. "
                        "If context is insufficient, clearly say that."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Retrieved context:\n{context}\n\nQuestion: {question}",
                },
            ],
            temperature=0.2,
        )

        answer = response.choices[0].message.content or "No answer returned."

        return jsonify({
            "answer": answer,
            "matches": len(docs),
        })

    except Exception as e:
        return jsonify({"error": f"query failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=False)

# from dotenv import load_dotenv
# load_dotenv()
# import os
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import chromadb
# from chromadb.utils import embedding_functions
# from groq import Groq
# import datetime

# #  INIT 
# app = Flask(__name__)
# CORS(app)

# # Groq client
# client = Groq(api_key=os.getenv("GROQ_KEY"))
# print("API KEY:", os.getenv("GROQ_KEY"))

# # Embedding model
# embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
#     model_name="all-MiniLM-L6-v2"
# )

# # ChromaDB
# chroma_client = chromadb.Client()
# collection = chroma_client.get_or_create_collection(
#     name="sleepcare",
#     embedding_function=embedding_function
# )

# #  ROUTES 

# @app.get("/health")
# def health():
#     return jsonify({"status": "ok", "service": "sleepcare-rag"})

# #  STORE SENSOR DATA 
# @app.route("/store-reading", methods=["POST"])
# def store():
#     data = request.get_json(silent=True) or {}

#     text = (
#         f"Time: {datetime.datetime.now().strftime('%I:%M %p')}, "
#         f"Mode={data.get('mode')}, "
#         f"SpO2={data.get('spo2')}, "
#         f"HR={data.get('heart_rate')}, "
#         f"Presence={'Yes' if data.get('presence') else 'No'}, "
#         f"Alert={data.get('alert', 'None')}, "
#         f"CNN={data.get('cnn_label', 'None')}, "
#         f"RiskScore={data.get('risk_score')}, "
#         f"RiskLevel={data.get('risk_level')}, "
#         f"SleepStage={data.get('sleep_stage', '--')}, "
#         f"Breathing={data.get('breathing_status', '--')}"
#     )

#     doc_id = str(datetime.datetime.now().timestamp())

#     collection.add(
#         documents=[text],
#         ids=[doc_id],
#         metadatas=[{
#             "mode": data.get("mode"),
#             "risk_level": data.get("risk_level"),
#         }]
#     )

#     return jsonify({"status": "stored", "id": doc_id})

# # QUERY RAG 
# @app.route("/query", methods=["POST"])
# def query():
#     try:
#         payload = request.get_json(silent=True) or {}
#         question = (payload.get("question") or "").strip()

#         if not question:
#             return jsonify({"error": "question required"}), 400

#         # Retrieve context
#         results = collection.query(query_texts=[question], n_results=5)
#         docs = (results.get("documents") or [[]])[0]

#         if not docs:
#             return jsonify({
#                 "answer": "No sensor data available yet.",
#                 "context_count": 0
#             })

#         context = "\n".join(docs)[:1200]  # truncate for safety

        
#         response = client.chat.completions.create(
#             model="llama3-70b-8192",
#             messages=[
#                 {
#                     "role": "system",
#                     "content": (
#                         "You are a SleepCare AI assistant.\n"
#                         "Answer ONLY using the provided sensor data.\n"
#                         "If unsure, say 'Insufficient data'.\n"
#                         "Be clear, short, and medically cautious."
#                     )
#                 },
#                 {
#                     "role": "user",
#                     "content": f"""
# Sensor Context:
# {context}

# Question:
# {question}
# """
#                 }
#             ],
#             temperature=0.3
#         )

#         answer = response.choices[0].message.content

#         return jsonify({
#             "answer": answer,
#             "context_count": len(docs)
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5002, debug=False)



# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import chromadb
# from chromadb.utils import embedding_functions
# import ollama
# import datetime

# app = Flask(__name__)
# CORS(app)

# from groq import Groq

# client = Groq(api_key="YOUR_API_KEY")

# response = client.chat.completions.create(
#     model="llama3-70b-8192",
#     messages=[
#         {"role": "user", "content": query}
#     ]
# )

# print(response.choices[0].message.content)

# @app.get("/health")
# def health():
#     return jsonify({"status": "ok", "service": "sleepcare-rag"})

# @app.route("/store-reading", methods=["POST"])
# def store():
#     data = request.get_json(silent=True) or {}

#     text = (
#         f"At {datetime.datetime.now().strftime('%I:%M %p')}: "
#         f"mode={data.get('mode')}, "
#         f"SpO2={data.get('spo2')}, "
#         f"HR={data.get('heart_rate')}, "
#         f"Presence={'Yes' if data.get('presence') else 'No'}, "
#         f"Alert={data.get('alert', 'None')}, "
#         f"CNN={data.get('cnn_label', 'None')}, "
#         f"RiskScore={data.get('risk_score')}, "
#         f"RiskLevel={data.get('risk_level')}, "
#         f"SleepStage={data.get('sleep_stage', '--')}, "
#         f"Alpha={data.get('alpha', 0)}, "
#         f"Beta={data.get('beta', 0)}, "
#         f"Gamma={data.get('gamma', 0)}, "
#         f"RMS={data.get('rms', 0)}, "
#         f"BreathingStatus={data.get('breathing_status', '--')}"
#     )

#     doc_id = str(datetime.datetime.now().timestamp())

#     collection.add(
#         documents=[text],
#         ids=[doc_id],
#         metadatas=[{
#             "mode": data.get("mode"),
#             "risk_level": data.get("risk_level"),
#             "cnn_label": data.get("cnn_label"),
#         }]
#     )

#     return jsonify({"status": "stored", "id": doc_id})

# @app.route("/query", methods=["POST"])
# def query():
#     payload = request.get_json(silent=True) or {}
#     question = (payload.get("question") or "").strip()

#     if not question:
#         return jsonify({"error": "question required"}), 400

#     results = collection.query(query_texts=[question], n_results=5)
#     docs = (results.get("documents") or [[]])[0]

#     if not docs:
#         return jsonify({"answer": "No stored sensor context is available yet."})

#     context = "\n".join(docs)

#     response = ollama.chat(
#         model="llama3",
#         messages=[{
#             "role": "user",
#             "content": (
#                 "You are a SleepCare assistant.\n"
#                 "Answer only from the provided sensor context.\n"
#                 "If the context is insufficient, say that clearly.\n\n"
#                 f"Context:\n{context}\n\n"
#                 f"Question: {question}"
#             )
#         }]
#     )

#     return jsonify({
#         "answer": response["message"]["content"],
#         "context_count": len(docs)
#     })

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5002, debug=False)

