import sha1 from 'sha1';
import dbClient from '../utils/db';

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
    return res.status(201).json({ id: user._id, email });
  }
}

export default UsersController;
