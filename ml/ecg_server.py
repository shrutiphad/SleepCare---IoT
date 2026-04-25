
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)

@app.get("/health")
def health():
    return jsonify({"status": "ok", "mode": "rule-based-stub"})

@app.route("/classify-ecg", methods=["POST"])
def classify():
    data = request.get_json(silent=True) or {}
    samples = data.get("samples", [])

    if not isinstance(samples, list):
        return jsonify({"label": "Invalid payload", "confidence": 0.0}), 400

    if len(samples) < 10:
        return jsonify({"label": "Insufficient data", "confidence": 0.0})

    try:
        arr = np.array(samples, dtype=float)
    except Exception:
        return jsonify({"label": "Invalid numeric data", "confidence": 0.0}), 400

    mean = float(np.mean(arr))
    std = float(np.std(arr))

    label = "Normal"
    confidence = 0.60

    if mean > 3000 or std > 800:
        label = "Tachycardia"
        confidence = 0.82
    elif mean < 400:
        label = "Bradycardia"
        confidence = 0.78
    elif std > 600:
        label = "AFib"
        confidence = 0.74

    return jsonify({
        "label": label,
        "confidence": confidence,
        "mean": round(mean, 2),
        "std": round(std, 2),
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)

