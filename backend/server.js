const express = require('express');
const cors = require('cors');
require('dotenv').config();
//const mainRoute = require('./routes/mainRoute');

//const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});