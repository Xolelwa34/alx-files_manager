// Import necessary controllers to handle different routes
import AppController from '../controllers/AppController';  // Handles app-level statistics and status
import UsersController from '../controllers/UsersController';  // Manages user-related actions like creation and profile retrieval
import AuthController from '../controllers/AuthController';  // Handles authentication actions (connect/disconnect)
import FilesController from '../controllers/FilesController';  // Manages file uploads, retrieval, and publishing

// Import express for routing setup
const express = require('express');

// Define the router function to configure routes for the app
const router = (app) => {
  // Create a new express router instance
  const route = express.Router();

  // Use express.json() middleware to parse incoming JSON requests
  app.use(express.json());

  // Mount the router on the app at the base URL ('/')
  app.use('/', route);

  // Route for getting app statistics (e.g., total number of users, file count, etc.)
  route.get('/stats', (request, response) => AppController.getStats(request, response));

  // Route for checking the status of the app (e.g., whether it's running)
  route.get('/status', (request, response) => AppController.getStatus(request, response));

  // Route to create a new user (requires email and password in request body)
  route.post('/users', (request, response) => UsersController.postNew(request, response));

  // Route for connecting a user (e.g., starting a session or logging in)
  route.get('/connect', (request, response) => AuthController.getConnect(request, response));

  // Route for disconnecting a user (e.g., logging out or ending a session)
  route.get('/disconnect', (request, response) => AuthController.getDisconnect(request, response));

  // Route for getting the currently authenticated user's details
  route.get('/users/me', (request, response) => UsersController.getMe(request, response));

  // Route for uploading files (requires file data in the request body)
  route.post('/files', (request, response) => FilesController.postUpload(request, response));

  // Route for retrieving a specific file by its ID
  route.get('/files/:id', (request, response) => FilesController.getShow(request, response));

  // Route for retrieving a list of all files (e.g., file index)
  route.get('/files', (request, response) => FilesController.getIndex(request, response));

  // Route for publishing a specific file by its ID (e.g., making it publicly available)
  route.put('/files/:id/publish', (request, response) => FilesController.putPublish(request, response));

  // Route for unpublishing a specific file by its ID (e.g., making it private)
  route.put('/files/:id/unpublish', (request, response) => FilesController.putUnpublish(request, response));

  // Route for retrieving file data (e.g., file contents or metadata) by file ID
  route.get('/files/:id/data', (request, response) => FilesController.getFile(request, response));
};

// Export the router function to be used in the main app setup
export default router;

