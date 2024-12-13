const express = require('express');
const app = express();
const cors = require('cors'); // Enable CORS for development

app.use(cors()); // Enable CORS for development
app.use(express.json()); // Parse JSON request bodies

// Load routes from index.js
const routes = require('./routes/index');
app.use('/', routes);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
