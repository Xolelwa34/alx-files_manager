const { MongoClient } = require('mongodb');

class DBClient {
  constructor(host = 'localhost', port = 27017, database = 'files_manager') {
    this.uri = `mongodb://${host}:${port}/${database}`;
    this.client = null;
  }

  async connect() {
    try {
      this.client = await MongoClient.connect(this.uri, { useNewUrlParser: true });
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB Connection Error:', error);
    }
  }

  isAlive() {
    return this.client && this.client.isConnected();
  }

  async nbUsers() {
    try {
      const collection = this.client.db().collection('users');
      const count = await collection.countDocuments();
      return count;
    } catch (error) {
      console.error('MongoDB nbUsers Error:', error);
      return 0;
    }
  }

  async nbFiles() {
    try {
      const collection = this.client.db().collection('files');
      const count = await collection.countDocuments();
      return count;
    } catch (error) {
      console.error('MongoDB nbFiles Error:', error);
      return 0;
    }
  }
}

const dbClient = new DBClient();
(async () => {
  await dbClient.connect();
})(); // Connect on module load
module.exports = dbClient;
