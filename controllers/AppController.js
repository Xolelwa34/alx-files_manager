// Import the Redis and DB client utilities for interacting with Redis and MongoDB
import RedisClient from '../utils/redis'; // RedisClient handles the Redis connection and operations
import DBClient from '../utils/db'; // DBClient handles MongoDB connection and operations

// Define the AppController class that contains the API endpoint handlers
class AppController {
  // getStatus is a static method to check the health of both Redis and the MongoDB connection
  static getStatus(req, res) {
    // Create an object to hold the status of Redis and DB connections
    const data = {
      redis: RedisClient.isAlive(), // Check if Redis is alive
      db: DBClient.isAlive(), // Check if the database connection is alive
    };

    // Respond with a 200 OK status and the health check data
    return res.status(200).send(data);
  }

  // getStats is a static method to fetch and return statistics from the database
  static async getStats(req, res) {
    // Await the asynchronous calls to get user and file counts from the database
    const data = {
      users: await DBClient.nbUsers(), // Get the number of users in the DB
      files: await DBClient.nbFiles(), // Get the number of files in the DB
    };

    // Respond with a 200 OK status and the statistics data
    return res.status(200).send(data);
  }
}

// Export the AppController class for use in routes
module.exports = AppController; // CommonJS export for compatibility

