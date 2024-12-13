const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');

const getConnect = async (req, res) => {
  try {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');

    const user = await dbClient
      .client.db()
      .collection('users')
      .findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    const expirationTime = 24 * 60 * 60; // 24 hours in seconds

    await promisify(redisClient.client.set).bind(redisClient.client)(key, user._id.toString(), 'EX', expirationTime);

    res.status(200).json({ token });
  } catch (error) {
    console.error('getConnect Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDisconnect = async (req, res) => {
  try {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    await redisClient.del(key);

    res.status(204).send();
  } catch (error) {
    console.error('getDisconnect Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getConnect, getDisconnect };
