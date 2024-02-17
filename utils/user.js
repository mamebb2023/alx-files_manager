import redisClient from './redis';
import dbClient from './db';

class userUtils {
  static async getUserIdAndKey(req) {
    const obj = { userId: null, key: null };
    const xToken = req.header('X-Token');
    if (!xToken) return obj;

    obj.key = `auth_${xToken}`;
    obj.userId = await redisClient.get(obj.key);

    return obj;
  }
}

export default userUtils;
