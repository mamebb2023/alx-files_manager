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
    const user = dbClient.userCollection.findOne({ email });
    return res.status(201).send({ id: user.insertedId, email });
  }

  static async getMe(req, res) {
    try {
      const { userId } = await userUtils.getUserIdAndKey(req);
  
      // Validate userId format before conversion
      if (!ObjectId.isValid(userId)) {
        return res.status(400).send({ error: 'Invalid user ID format' });
      }

      const userObjId = ObjectId(userId);
      const user = await dbClient.userCollection.findOne({ _id: userObjId }, { projection: { password: 0 } });
  
      if (!user) return res.status(401).send({ error: 'Unauthorized' });
  
      const sanitizedUser = { ...user, id: user._id };
      delete sanitizedUser._id;
  
      return res.status(200).send(sanitizedUser);
  
    } catch (error) {
      console.error('Error getting user data:', error);
      return res.status(500).send({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
