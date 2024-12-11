// Import the necessary modules
import express from 'express'; // Import express framework for building the server
import { router as appRoutes } from './routes/index.js'; // Import custom router from the routes folder

// Initialize the Express app
const app = express();

// Set the server's port either from the environment variable or fallback to 5000
const PORT = process.env.PORT || 5000;

// Use the custom routes by applying the appRoutes middleware to the root route ('/')
app.use('/', appRoutes); // Routes will be handled by the router defined in routes/index.js

// Start the server and listen on the specified port
app.listen(PORT, () => {
  // Log a message to indicate the server is running and listening on the specified port
  console.log(`Server is up and running on port ${PORT}`);
});

