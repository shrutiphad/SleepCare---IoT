
# --- Load your trained model here ---
# For now, use a rule-based stub so you can test the pipeline
# Replace with: model = tf.keras.models.load_model("ecg_model.h5")
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)  # ← ADD THIS

@app.route("/classify-ecg", methods=["POST"])
def classify():
    data    = request.json
    samples = data.get("samples", [])
    if len(samples) < 10:
        return jsonify({"label": "Insufficient data"})
    
    arr  = np.array(samples, dtype=float)
    mean = float(np.mean(arr))
    std  = float(np.std(arr))
    
    # Rule-based stub until you have a real model
    if mean > 3000 or std > 800:  return jsonify({"label": "Tachycardia"})
    if mean < 400:                 return jsonify({"label": "Bradycardia"})
    if std > 600:                  return jsonify({"label": "AFib"})
    return jsonify({"label": "Normal"})

if __name__ == "__main__":
    app.run(port=5001, debug=False)