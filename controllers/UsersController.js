import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) res.status(400).json({ error: 'Missing email' });
    if (!password) res.status(400).json({ error: 'Missing password' });

    const hashPwd = sha1(password);

    try {
      const userCollection = dbClient.db.collection('users');
      if (await userCollection.findOne({ email })) {
        res.status(400).json({ error: 'Already exist' });
      } else {
        userCollection.insertOne({ email, password: hashPwd });
        const newUser = await userCollection.findOne({ email }, { projection: { email: 1 } });
        res.status(201).json({ id: newUser._id, email: newUser.email });
      }
    } catch (err) {
      console.log(err);
      res.send(500).json({ error: 'Server error' });
    }
  }
}

export default UsersController;
