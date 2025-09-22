import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Atlas connection
const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const dbName = 'botDetectionDB';
const collectionName = 'behavioralData';

let collection;

// Connect once at server start
async function connectToMongo() {
  try {
    await client.connect();
    collection = client.db(dbName).collection(collectionName);
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
  }
}
connectToMongo();

// POST endpoint to collect data
app.post('/collect', async (req, res) => {
  try {
    const data = {
      ...req.body,
      timestamp: new Date().toISOString(),
    };
    await collection.insertOne(data);
    console.log('✅ Data saved:', data);
    res.status(200).json({ message: 'Data saved successfully' });
  } catch (err) {
    console.error('❌ Failed to save data:', err);
    res.status(500).json({ message: 'Failed to save data', error: err.message });
  }
});

// GET endpoint to fetch all data (for you only)
app.get('/api/data', async (req, res) => {
  try {
    const allData = await collection.find({}).toArray();
    res.status(200).json(allData);
  } catch (err) {
    console.error('❌ Failed to fetch data:', err);
    res.status(500).json({ message: 'Failed to fetch data', error: err.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
