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

// Middleware
app.use(cors({
  origin: ['*','https://passive-bot-detection-using-rfgb.onrender.com'] // allow all origins, you can restrict if needed
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Atlas connection
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is missing! Set it in your .env or Render environment variables.');
  process.exit(1);
}

const client = new MongoClient(uri);
const dbName = 'botDetectionDB';
const collectionName = 'behavioralData';
let collection;

// Start server only after DB is connected
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

// POST endpoint to collect data
app.post('/collect', async (req, res) => {
  if (!collection) {
    console.error('❌ Collection not initialized!');
    return res.status(500).json({ message: 'Database not connected' });
  }

  try {
    const data = {
      ...req.body,
      timestamp: new Date().toISOString(),
    };
    await collection.insertOne(data);
    console.log('✅ Data saved:', data);
    res.status(200).json({ message: 'Data saved successfully' });
  } catch (err) {
    console.error('❌ Failed to save data:', err.message);
    res.status(500).json({ message: 'Failed to save data', error: err.message });
  }
});

// GET endpoint to fetch all data (optional)
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

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
