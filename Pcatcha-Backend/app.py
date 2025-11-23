from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
from pymongo import MongoClient
import joblib
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)

# ✅ CORS setup
ALLOWED_ORIGINS = [
    'https://passive-bot-detection-using-rfgb.onrender.com',
    'https://passive-bot-detection-using-3qdu.onrender.com',
    'http://localhost:3000',
]
CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})


@app.before_request
def _handle_options_preflight():
    """Handle CORS preflight OPTIONS request."""
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin')
        resp = make_response()
        if origin and origin in ALLOWED_ORIGINS:
            resp.headers['Access-Control-Allow-Origin'] = origin
            resp.headers['Vary'] = 'Origin'
            resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return resp


# ✅ MongoDB connection
MONGO_URI = "mongodb+srv://amanbhitkar:aman9890@cluster0.kmnkr0i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)

db = client["pacaptchaDB"]
collection = db["userData"]

# ✅ Load your trained ML model (.pkl)
try:
    model = joblib.load("./model/vk_bot_detection_model (2).pkl")  # change this to your model filename
    print("✅ ML model loaded successfully.")
except Exception as e:
    model = None
    print("❌ Error loading ML model:", e)


# ✅ Route: Collect + Predict
@app.route("/collect", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=ALLOWED_ORIGINS,
    methods=['POST', 'OPTIONS'],
    allow_headers=['Content-Type', 'Authorization']
)
def collect_data():
    try:
        data = request.json or {}

        # --- Add timestamp ---
        data["timestamp"] = datetime.utcnow()

        # --- Run prediction if model loaded ---
        if model is not None:
            try:
                # Collect available features
                feature_list = [
                    data.get("keyPressCount", 0),
                    data.get("clickCount", 0),
                    data.get("scrollDepth", 0),
                    data.get("hardwareConcurrency", 0),
                    data.get("deviceMemory", 0)
                ]
                
                features = np.array([feature_list])
                
                # Check expected shape and pad if necessary
                expected_features = model.n_features_in_ if hasattr(model, 'n_features_in_') else None
                if expected_features and features.shape[1] != expected_features:
                    print(f"⚠️  Feature mismatch: model expects {expected_features}, got {features.shape[1]}")
                    print(f"   Original features: {feature_list}")
                    
                    # Pad with zeros to match expected shape
                    padded = np.zeros((1, expected_features))
                    padded[0, :len(feature_list)] = feature_list
                    features = padded
                    print(f"   Padded to shape: {features.shape}")

                # predict
                pred = model.predict(features)[0]
                prob = (
                    model.predict_proba(features)[0][1]
                    if hasattr(model, "predict_proba")
                    else float(pred)
                )

                # attach prediction
                data["is_bot"] = bool(pred)
                data["confidence"] = float(prob)
            except Exception as e:
                print(f"❌ Prediction error: {e}")
                data["is_bot"] = None
                data["confidence"] = None
        else:
            data["is_bot"] = None
            data["confidence"] = None

        # --- Save to MongoDB ---
        collection.insert_one(data)

        # --- Return prediction to frontend ---
        return jsonify({
            "message": "Prediction complete",
            "is_bot": data["is_bot"],
            "confidence": data["confidence"]
        }), 200

    except Exception as e:
        print("❌ Error:", e)
        return jsonify({"error": str(e)}), 500


# ✅ Simple root route
@app.route("/", methods=["GET"])
def home():
    return "Pacaptcha backend with ML model running!"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
