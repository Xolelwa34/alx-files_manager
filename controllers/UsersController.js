const dbClient = require('../utils/db');
const bcrypt = require('bcrypt'); // For password hashing

const postNew = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    const existingUser = await dbClient
      .client.db()
      .collection('users')
      .findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Already exists' });
    }

    const newUser = {
      email,
      password: hashedPassword,
    };

    const result = await dbClient
      .client.db()
      .collection('users')
      .insertOne(newUser);

    res.status(201).json({ id: result.insertedId.toString(), email });
  } catch (error) {
    console.error('postNew Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.userId; // User ID from middleware (see AuthController)

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient
      .client.db()
      .collection('users')
      .findOne({ _id: new ObjectId(userId) }, { projection: { _id: 1, email: 1 } });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('getMe Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { postNew, getMe };
