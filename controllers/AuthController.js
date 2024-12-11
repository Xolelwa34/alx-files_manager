// Import necessary modules and utilities for authentication functionality
import { v4 as uuidv4 } from 'uuid'; // UUID generator to create unique tokens
import redisClient from '../utils/redis'; // Redis client for handling token storage
import dbClient from '../utils/db'; // MongoDB client for querying the database
import sha1 from 'sha1'; // SHA1 hashing function for password encryption

// Define the AuthController object to handle authentication-related routes
const AuthController = {
  // getConnect is an asynchronous method for authenticating a user and generating a token
  async getConnect(req, res) {
    // Retrieve the 'Authorization' header from the request
    const authHeader = req.headers.authorization;

    // Check if the 'Authorization' header is provided and starts with 'Basic'
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' }); // Unauthorized if invalid
    }

    // Decode the credentials from base64 format and split into email and password
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    // Hash the password using SHA1 to match the stored password in the DB
    const hashedPassword = sha1(password);

    // Query the DB to find a user matching the provided email and hashed password
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });

    // If no matching user is found, return Unauthorized response
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a new unique token and store it in Redis with the associated user ID
    const token = uuidv4(); // Generate a new UUID token
    const key = `auth_${token}`; // Use the token as part of the Redis key
    await redisClient.set(key, user._id.toString(), 'EX', 86400); // Set the token in Redis with a 24-hour expiration

    // Respond with the generated token for the client to use in future requests
    return res.status(200).json({ token });
  },

  // getDisconnect is an asynchronous method for logging out a user by deleting their token
  async getDisconnect(req, res) {
    // Retrieve the 'x-token' header from the request to get the user's token
    const { 'x-token': token } = req.headers;

    // If no token is provided, return Unauthorized response
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Construct the Redis key using the token
    const key = `auth_${token}`;
    // Retrieve the user ID associated with the token from Redis
    const userId = await redisClient.get(key);

    // If the token is not found or invalid, return Unauthorized response
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete the token from Redis, effectively logging out the user
    await redisClient.del(key);

    // Respond with a 204 No Content status to indicate successful logout
    return res.status(204).send();
  }
};

// Export the AuthController for use in the routes
export default AuthController;

