import sha1 from 'sha1';
import { ObjectId } from 'mongodb';

import dbClient from '../utils/db';
import userUtils from '../utils/user';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    if (await dbClient.userCollection.findOne({ email })) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Strong password encryption here
    const hashPwd = sha1(password);

    try {
      await dbClient.userCollection.insertOne({ email, password: hashPwd });
    } catch (err) {
      return res.status(500).json({ error: 'Server Error' });
    }
    const user = dbClient.userCollection.findOne({ email });
    return res.status(201).json({ id: user.insertedId, email });
  }

  static async getMe(req, res) {
    const userID = await userUtils.getUserIdAndKey(req);
    const user = await userUtils.getUser({ _id: ObjectId(userID) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const processedUser = { id: user._id, ...user };
    delete processedUser._id;
    delete processedUser.password;

    return res.status(200).send(processedUser);
  }
}

export default UsersController;
