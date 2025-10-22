import { MongoClient } from "mongodb";

const uri = "mongodb+srv://amanbhitkar:<aman9890>@cluster0.kmnkr0i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected Successfully!");
    const dbs = await client.db().admin().listDatabases();
    console.log("📂 Databases:", dbs.databases.map(db => db.name));
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
  } finally {
    await client.close();
  }
}

run();
