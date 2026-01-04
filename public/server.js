/**
 * WHISPER SERVER (Node.js/Express)
 * This server hosts the static frontend and provides a 
 * starting point for custom backend APIs.
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. Serve static files from the 'public' directory
// This ensures that when your HTML asks for "default.png" or other assets, 
// the server knows to look inside the public folder.
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies
app.use(express.json());

// 2. Fix the path to point inside the 'public' folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat_app.html'));
});

// Route for the login page if needed specifically
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * OPTIONAL: Backend API Endpoints
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'Whisper Protocol Active', timestamp: new Date() });
});

// Start the server
app.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    WHISPER SERVER ACTIVE
    URL: http://localhost:${PORT}
    ROOT FILE: public/chat_app.html
    -------------------------------------------
    `);
});
