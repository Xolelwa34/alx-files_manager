const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const getStatus = async (req, res) => {
  try {
    const redisAlive = redisClient.isAlive();
    const dbAlive = dbClient.isAlive();

    res.status(200).json({ redis: redisAlive, db: dbAlive });
  } catch (error) {
    console.error('getStatus Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getStats = async (req, res) => {
  try {
    const numUsers = await dbClient.nbUsers();
    const numFiles = await dbClient.nbFiles();

    res.status(200).json({ users: numUsers, files: numFiles });
  } catch (error) {
    console.error('getStats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { getStatus, getStats };
