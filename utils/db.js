import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`;
const options = {
  useUnifiedTopology: true,
};

class DBClient {
  constructor() {
    MongoClient.connect(url, options, (err, client) => {
      if (err) {
        console.log(err.message);
        this.db = false;
      }
      
      this.db = client.db(database);
      this.userCollection = this.db.collection('users');
      this.filesCollection = this.db.collection('files');
    });
  }

  isAlive() {
    return Boolean(this.db);
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
