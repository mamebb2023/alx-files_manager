import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    if (await dbClient.userCollection.findOne({ email })) {
      return res.status(400).send({ error: 'Already exist' })
    }

    // Strong password encryption here
    const hashPwd = sha1(password);

    let result;
    try {
      result = await dbClient.userCollection.insertOne({ email, password: hashPwd });
    } catch (err) {
      return res.status(500).send({ error: 'Server Error' });
    }
    const newUser = { id: result.insertedId, email, };
    return res.status(201).send(newUser);
  }
}

export default UsersController;
