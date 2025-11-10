from flask import Flask, request, jsonify, make_response
from flask_cors import CORS, cross_origin
from pymongo import MongoClient
import os
from datetime import datetime

app = Flask(__name__)
ALLOWED_ORIGINS = [
    'https://passive-bot-detection-using-rfgb.onrender.com',
    'https://passive-bot-detection-using-3qdu.onrender.com',
    'http://localhost:3000',
]

CORS(app, resources={r"/*": {"origins": ALLOWED_ORIGINS}})  # allow frontend JS to send requests


@app.before_request
def _handle_options_preflight():
    """Return a short-circuited response for OPTIONS preflight with the
    correct CORS headers when the Origin is in our allow list. This ensures
    Access-Control-Allow-Origin is present even if something upstream
    interferes with Flask's automatic OPTIONS handling.
    """
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin')
        resp = make_response()
        if origin and origin in ALLOWED_ORIGINS:
            resp.headers['Access-Control-Allow-Origin'] = origin
            resp.headers['Vary'] = 'Origin'
            resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            # If your frontend sends cookies/auth, uncomment the next line
            # resp.headers['Access-Control-Allow-Credentials'] = 'true'
        return resp

# MongoDB connection (you’ll set this in Railway as an env var)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["pacaptchaDB"]
collection = db["userData"]

@app.route("/collect", methods=["POST", "OPTIONS"])
@cross_origin(origins=['https://passive-bot-detection-using-rfgb.onrender.com', 'https://passive-bot-detection-using-3qdu.onrender.com'], methods=['POST', 'OPTIONS'], allow_headers=['Content-Type', 'Authorization'])
def collect_data():
    try:
        data = request.json
        data["timestamp"] = datetime.utcnow()
        collection.insert_one(data)
        return jsonify({"message": "Data received"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/", methods=["GET"])
def home():
    return "Pacaptcha backend running!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
