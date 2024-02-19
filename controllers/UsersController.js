import sha1 from 'sha1';
import { ObjectId } from 'mongodb';

import dbClient from '../utils/db';
import userUtils from '../utils/user';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const emailExists = await dbClient.userCollection.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Strong password encryption here
    const hashPwd = sha1(password);

    try {
      await dbClient.userCollection.insertOne({ email, password: hashPwd });
    } catch (err) {
      return res.status(500).send({ error: 'Server Error' });
    }
    const user = userUtils.getUser({ email });
    return res.status(201).send({ id: user.insertedId, email });
  }

  static async getMe(req, res) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(req);
      console.log (userId);
      // Validate userId format before conversion
      if (!ObjectId.isValid(userId)) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const userObjId = ObjectId(userId);
      const user = await userUtils.getUser({ _id: userObjId }, { projection: { password: false } });
      if (!user) return res.status(401).send({ error: 'Unauthorized' });

      const sanitizedUser = { id: user._id, ...user };
      delete sanitizedUser._id;

      return res.status(200).send(sanitizedUser);
    } catch (error) {
      console.error('Error getting user data:', error);
      return res.status(500).send({ error: 'Server error' });
    }
  }
}

export default UsersController;
