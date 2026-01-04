const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS and basic settings
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- IN-MEMORY DATABASE ---
// This stores the state for all connected users
let posts = [
    {
        id: 'welcome-1',
        user: 'Next System',
        handle: 'system',
        content: 'Welcome to the multiplayer feed! Everything you see here is syncing in real-time via Node.js and WebSockets. 🚀',
        timestamp: Date.now(),
        likedBy: [],
        comments: [
            { user: 'Admin', content: 'Feel free to test the like button!' }
        ]
    }
];

// Serve static files (put your index.html in a folder named 'public')
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- REAL-TIME MULTIPLAYER LOGIC ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When a user logs in/joins the feed
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
        
        // Send existing data immediately to the new user
        socket.emit('feed-update', posts);
    });

    // Handle New Post Creation
    socket.on('new-post', (data) => {
        const newPost = {
            id: 'post_' + Date.now() + Math.random().toString(36).substr(2, 4),
            user: data.user,
            handle: data.handle,
            content: data.content,
            timestamp: Date.now(),
            likedBy: [],
            comments: []
        };

        // Add to start of array
        posts.unshift(newPost);

        // Keep memory lean (optional: limit to 100 posts)
        if (posts.length > 100) posts.pop();

        // Broadcast updated feed to all clients in the room
        io.to('global-feed').emit('feed-update', posts);
    });

    // Handle Like Toggling
    socket.on('toggle-like', ({ postId, handle }) => {
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex !== -1) {
            const likedBy = posts[postIndex].likedBy;
            const userIndex = likedBy.indexOf(handle);

            if (userIndex === -1) {
                // Add like
                likedBy.push(handle);
            } else {
                // Remove like
                likedBy.splice(userIndex, 1);
            }

            // Broadcast only the change or the full list
            io.to('global-feed').emit('feed-update', posts);
        }
    });

    // Handle New Comments
    socket.on('new-comment', ({ postId, user, content }) => {
        const post = posts.find(p => p.id === postId);
        
        if (post) {
            post.comments.push({
                user: user,
                content: content,
                timestamp: Date.now()
            });

            // Sync updated comments to everyone
            io.to('global-feed').emit('feed-update', posts);
        }
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('------------------------------------');
    console.log(`Next Social Server is running!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log('------------------------------------');
});
