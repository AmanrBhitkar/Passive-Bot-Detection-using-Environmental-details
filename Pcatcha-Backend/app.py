from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import os
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ['*', 'https://passive-bot-detection-using-rfgb.onrender.com', 'https://passive-bot-detection-using-3qdu.onrender.com']}})  # allow frontend JS to send requests

# MongoDB connection (you’ll set this in Railway as an env var)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["pacaptchaDB"]
collection = db["userData"]

@app.route("/collect", methods=["POST"])
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
