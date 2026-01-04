const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

/**
 * PROJECT: SocialChat Combined (Twitter/Instagram/Chat)
 * DESCRIPTION: Central server handling HTTP routes and real-time Socket.io events.
 * RENDER SETTINGS: Root Directory: public | Start Command: node server.js
 */

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Environment Port (Render default is 10000)
const PORT = process.env.PORT || 10000;

// Middleware to serve static files from the current directory
// Since this file is in /public, it will serve all HTML/CSS/JS from here
app.use(express.static(__dirname));
app.use(express.json());

// --- ROUTES ---

// Route for the landing page (Login/Signup)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the main platform (Feed & Chat)
app.get('/site', (req, res) => {
    res.sendFile(path.join(__dirname, 'site.html'));
});

// --- REAL-TIME LOGIC (SOCKET.IO) ---

// Memory storage for current session (Initial version uses volatile memory)
let globalPosts = [];

io.on('connection', (socket) => {
    console.log('New User Connected:', socket.id);

    // 1. CHAT LOGIC: Handle incoming messages
    socket.on('chat_message', (data) => {
        // Data expected: { user: string, text: string, timestamp: string }
        console.log(`Chat from ${data.user}: ${data.text}`);
        io.emit('chat_broadcast', data);
    });

    // 2. SOCIAL FEED LOGIC: Handle new posts (Twitter/Instagram style)
    socket.on('new_post', (postData) => {
        // Data expected: { user: string, content: string, type: 'text'|'image', mediaUrl: string }
        const newPost = {
            id: Date.now(),
            ...postData,
            likes: 0,
            comments: [],
            timestamp: new Date().toISOString()
        };
        
        globalPosts.unshift(newPost); // Add to start of array
        io.emit('post_broadcast', newPost);
    });

    // 3. INITIAL LOAD: Send existing posts to the newly connected user
    socket.emit('load_posts', globalPosts);

    // 4. DISCONNECT
    socket.on('disconnect', () => {
        console.log('User Disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`SERVER ACTIVE: http://localhost:${PORT}`);
    console.log(`ROOT DIRECTORY: ${__dirname}`);
    console.log(`=========================================`);
});
