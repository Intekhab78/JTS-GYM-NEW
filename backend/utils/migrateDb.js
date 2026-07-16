import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const sourceUri = process.env.MONGO_URI;
const targetUri = process.env.TARGET_MONGO_URI || 'mongodb://127.0.0.1:27017/JTS_GYM';

async function migrate() {
  if (!sourceUri) {
    throw new Error('MONGO_URI (source database) must be set in your environment or .env file');
  }

  console.log('Starting migration...');
  // Mask credentials in output
  const maskedSource = sourceUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`Source DB URI: ${maskedSource}`);
  console.log(`Target DB URI: ${targetUri}`);

  console.log('Connecting to Source Database...');
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log('Connected to Source Database successfully.');

  console.log('Connecting to Target Database...');
  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  console.log('Connected to Target Database successfully.');

  const sourceDb = sourceConn.db;
  const targetDb = targetConn.db;

  const collections = await sourceDb.listCollections().toArray();
  console.log(`Found ${collections.length} collections to copy.`);

  for (const col of collections) {
    const name = col.name;
    if (name.startsWith('system.')) {
      console.log(`Skipping system collection: ${name}`);
      continue;
    }

    console.log(`\nMigrating collection: "${name}"`);
    const sourceCol = sourceDb.collection(name);
    const targetCol = targetDb.collection(name);

    // Drop target collection if it exists to start fresh
    try {
      await targetCol.drop();
      console.log(`  - Cleared existing collection on target.`);
    } catch (err) {
      // Collection did not exist, safe to ignore
    }

    // Fetch and insert documents
    const docs = await sourceCol.find({}).toArray();
    if (docs.length > 0) {
      await targetCol.insertMany(docs);
      console.log(`  - Successfully transferred ${docs.length} documents.`);
    } else {
      console.log(`  - Collection is empty. No documents to copy.`);
    }

    // Copy indexes
    try {
      const indexes = await sourceCol.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const { key, name: indexName, ...options } = idx;
        await targetCol.createIndex(key, { name: indexName, ...options });
        console.log(`  - Recreated index: ${indexName}`);
      }
    } catch (idxErr) {
      console.warn(`  - Warning: Could not recreate indexes for "${name}": ${idxErr.message}`);
    }
  }

  console.log('\n=========================================');
  console.log('Migration finished successfully!');
  console.log('=========================================');

  await sourceConn.close();
  await targetConn.close();
}

migrate().catch((err) => {
  console.error('\nMigration failed with error:', err.message);
  process.exit(1);
});
