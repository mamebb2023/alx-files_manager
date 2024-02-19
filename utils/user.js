import { ObjectId } from 'mongodb';
import redisClient from './redis';
import dbClient from './db';

class userUtils {
  static async getUserIdAndKey(req) {
    const xToken = req.header('X-Token');
    if (!xToken) return {};

    const userKey = `auth_${xToken}`;
    const userId = await redisClient.get(userKey);

    return { userKey, userId };
  }

  static async getUser(...query) {
    const user = await dbClient.userCollection.findOne(...query);
    return user;
  }

  static isValidId(userId) {
    try {
      ObjectId(userId);
    } catch (error) {
      return false;
    }
    return true;
  }
}

export default userUtils;
