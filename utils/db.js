import { MongoClient } from 'mongodb';

class DBClient {
  constructor () {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const uri = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect();
    this.db = this.client.db(database);
  }

  isAlive () {
    return this.client.isConnected();
  }

  async nbUsers () {
    const usersCollection = this.db.collection('users');
    const count = await usersCollection.countDocuments();
    return count;
  }

  async nbFiles () {
    const filesCollection = this.db.collection('files');
    const count = await filesCollection.countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
export default dbClient;
