// Import necessary utilities for database (MongoDB), Redis, and SHA1 hashing
import dbClient from '../utils/db';  // MongoDB database client
import redisClient from '../utils/redis';  // Redis client for managing session or user data
import sha1 from 'sha1';  // SHA1 hashing function for password hashing (consider using a more secure method like bcrypt)
import { ObjectId } from 'mongodb';  // MongoDB's ObjectId to work with user identifiers

// Define the UsersController class to handle user-related API requests
class UsersController {
  // Static method to handle user creation (POST request)
  static async postNew(request, response) {
    // Destructure the email and password from the incoming request body
    const { email, password } = request.body;

    // Validate that both email and password are provided
    if (!email) {
      return response.status(400).json({ error: 'Missing email' });  // Return error if email is missing
    }
    if (!password) {
      return response.status(400).json({ error: 'Missing password' });  // Return error if password is missing
    }

    // Hash the password using SHA1 (Note: Consider using bcrypt for better security)
    const hashPwd = sha1(password);

    try {
      // Access the "users" collection in the MongoDB database
      const collection = dbClient.db.collection('users');
      
      // Check if a user with the same email already exists in the database
      const user1 = await collection.findOne({ email });

      if (user1) {
        // If a user with the given email already exists, return a 400 error
        return response.status(400).json({ error: 'Already exist' });
      } else {
        // If no user exists, insert the new user document into the database
        await collection.insertOne({ email, password: hashPwd });

        // Retrieve the newly inserted user to return relevant details
        const newUser = await collection.findOne(
          { email },
          { projection: { email: 1 } }  // Only return the email in the response
        );

        // Return a 201 status with the new user's details
        return response.status(201).json({ id: newUser._id, email: newUser.email });
      }
    } catch (error) {
      // Catch any errors that occur during the process and log them
      console.log(error);
      // Return a 500 status indicating a server error
      return response.status(500).json({ error: 'Server error' });
    }
  }

  // Static method to handle retrieving user details (GET request)
  static async getMe(request, response) {
    try {
      // Retrieve the user token from the request header "X-Token"
      const userToken = request.header('X-Token');
      
      // Create a Redis key for the user session based on the token
      const authKey = `auth_${userToken}`;

      // Retrieve the user ID associated with the token from Redis
      const userID = await redisClient.get(authKey);

      // If the user ID does not exist in Redis, the user is unauthorized
      if (!userID) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      // Retrieve the user from the MongoDB database by their ID
      const user = await dbClient.getUser({ _id: ObjectId(userID) });

      // Return the user's ID and email as the response
      return response.json({ id: user._id, email: user.email });
    } catch (error) {
      // Catch any errors and log them
      console.log(error);
      // Return a 500 status indicating a server error
      return response.status(500).json({ error: 'Server error' });
    }
  }
}

// Export the UsersController class for use in routing
export default UsersController;

