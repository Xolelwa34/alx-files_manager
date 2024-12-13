const redis = require('redis');

class RedisClient {
  constructor(host = 'localhost', port = 6379) {
    this.client = redis.createClient({ host, port });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null; // Parse JSON for data retrieval
    } catch (error) {
      console.error('Redis Get Error:', error);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', duration); // Set expiration
    } catch (error) {
      console.error('Redis Set Error:', error);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis Del Error:', error);
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
