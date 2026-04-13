from flask import Flask, request, jsonify
import chromadb
from chromadb.utils import embedding_functions
import ollama, datetime

app = Flask(__name__)
client = chromadb.Client()
collection = client.get_or_create_collection(
  name="sleepcare",
  embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction()
)

@app.route("/store-reading", methods=["POST"])
def store():
    data = request.json
    text = (
      f"At {datetime.datetime.now().strftime('%I:%M %p')}: "
      f"SpO2={data.get('spo2')}%, HR={data.get('heart_rate')} BPM, "
      f"Presence={'Yes' if data.get('presence') else 'No'}, "
      f"Alert={data.get('alert','None')}, "
      f"EEG Alpha={data.get('alpha',0)} Beta={data.get('beta',0)}"
    )
    collection.add(
      documents=[text],
      ids=[str(datetime.datetime.now().timestamp())]
    )
    return jsonify({"status": "stored"})

@app.route("/query", methods=["POST"])
def query():
    question = request.json.get("question")
    results  = collection.query(query_texts=[question], n_results=5)
    context  = "\n".join(results["documents"][0])

    response = ollama.chat(model="llama3", messages=[{
      "role": "user",
      "content": (
        f"You are a medical assistant for SleepCare patient monitoring.\n"
        f"Context from patient sensor data:\n{context}\n\n"
        f"Question: {question}\n"
        f"Answer concisely based only on the data provided."
      )
    }])
    return jsonify({"answer": response["message"]["content"]})

if __name__ == "__main__":
    app.run(port=5002)