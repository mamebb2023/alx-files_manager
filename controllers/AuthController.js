import { v4 } from 'uuid';
import sha1 from 'sha1';
import userUtils from '../utils/user';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const Authorization = req.header('Authorization') || '';
    const creds = Authorization.split(' ')[1];
    if (!creds) return res.status(401).send({ error: 'Unauthorized' });

    const credentials = Buffer.from(creds, 'base64').toString('utf-8');
    const parts = credentials.split(':');
    if (parts.length !== 2) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const [email, pwd] = parts;
    if (!email || !pwd) return res.status(401).send({ error: 'Unauthorized' });

    // Password encryption
    const hashPwd = sha1(pwd);

    const user = await userUtils.getUser({ email, password: hashPwd });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const token = v4();
    const key = `auth_${token}`;
    const expirationHour = 24;

    await redisClient.set(key, user._id.toString(), expirationHour * 3600);

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const { userId, userKey } = await userUtils.getUserIdAndKey(req);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    await redisClient.del(userKey);

    return res.status(204).send();
  }
}

export default AuthController;
