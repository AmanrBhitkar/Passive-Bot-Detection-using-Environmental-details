import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config(); // loads variables from .env

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Allowed origins
const allowedOrigins = [
  'https://passive-bot-detection-using-rfgb.onrender.com',
  'https://passive-bot-detection-using-3qdu.onrender.com',
];

// ✅ CORS configuration
// Debug info: log CORS-related env and allowed origins to help diagnose path-to-regexp errors
const devAllowAll = (process.env.DEV_ALLOW_ALL_ORIGINS || '').toLowerCase();
console.log('CORS debug -- NODE_ENV:', process.env.NODE_ENV, 'DEV_ALLOW_ALL_ORIGINS:', devAllowAll);
console.log('CORS debug -- allowedOrigins:', allowedOrigins);
try {
  if (process.env.NODE_ENV === 'production' && devAllowAll !== 'true') {
    app.use(
      cors({
        origin: function (origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      })
    );

    // explicit preflight handling for production
    app.options('*', cors());
  } else {
    // permissive CORS in non-production or when DEV_ALLOW_ALL_ORIGINS=true
    app.use(cors());
    console.log('CORS: permissive mode enabled (non-production or DEV_ALLOW_ALL_ORIGINS=true)');
  }
} catch (e) {
  console.error('CORS setup failed:', e && e.stack ? e.stack : e);
  throw e; // rethrow so process exits and logs show the stack
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB Atlas connection
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is missing! Set it in your .env or Render environment variables.');
  process.exit(1);
}

const client = new MongoClient(uri);
const dbName = 'botDetectionDB';
const collectionName = 'behavioralData';
let collection;

// ✅ Start server only after DB connection
async function startServer() {
  try {
    await client.connect();
    collection = client.db(dbName).collection(collectionName);
    console.log('✅ Connected to MongoDB Atlas');

    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err.message);
    process.exit(1); // stop server if DB connection fails
  }
}

startServer();

// ✅ POST endpoint to collect data
app.post('/collect', async (req, res) => {
  if (!collection) {
    console.error('❌ Collection not initialized!');
    return res.status(500).json({ message: 'Database not connected' });
  }

  try {
    const userData = { ...req.body, timestamp: new Date().toISOString() };

    // --- Step 1: Send data to Flask ML API ---
    const flaskResponse = await axios.post('http://127.0.0.1:5001/collect', userData);

    // --- Step 2: Extract prediction from Flask ---
    const { is_bot, confidence } = flaskResponse.data;

    // --- Step 3: Save everything in MongoDB ---
    await collection.insertOne({ ...userData, is_bot, confidence });
    console.log('✅ Data + Prediction saved:', { ...userData, is_bot, confidence });

    // --- Step 4: Return result to frontend ---
    res.status(200).json({
      message: 'Prediction complete',
      is_bot,
      confidence,
    });
  } catch (err) {
    console.error('❌ Error connecting to Flask API:', err.message);
    res.status(500).json({
      message: 'Prediction failed',
      error: err.message,
    });
  }
});


// ✅ GET endpoint (optional)
app.get('/api/data', async (req, res) => {
  if (!collection) return res.status(500).json({ message: 'Database not connected' });
  try {
    const allData = await collection.find({}).toArray();
    res.status(200).json(allData);
  } catch (err) {
    console.error('❌ Failed to fetch data:', err.message);
    res.status(500).json({ message: 'Failed to fetch data', error: err.message });
  }
});

// ✅ Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
