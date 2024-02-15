import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: redisClient.isAlive(),
    };
    res.status(200).send(status);
  }

  static async getStats(req, res) {
    const stats = {
      users: dbClient.nbUsers(),
      files: dbClient.nbFiles(),
    }
    res.status(200).send(stats);
  }
}

export default AppController;
