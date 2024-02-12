import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`;
const options = {
  useUnifiedTopology: true,
}

class DBClient {
  constructor() {
    this.db = null;
    MongoClient.connect(url, options, (err, client) => {
      if (err) console.log(err);
      this.db = client.db(database);
      this.db.createCollection('users');
      this.db.createCollection('files');
    });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users').countDocumnets();
  }

  async nbFiles() {
    return this.db.collection('files').countDocumnets();
  }
}

const dbClient = new DBClient();

module.exports = dbClient;