const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- THE FIX FOR THE "NO SUCH FILE" ERROR ---
// We define the directory where your frontend files live.
// On Render/Heroku, __dirname is the root.
const publicPath = path.join(__dirname, 'public');

// Serve static files from the 'public' folder
app.use(express.static(publicPath));

// Explicit route for index.html to prevent the "double public" path error
app.get('*', (req, res) => {
    // This sends index.html for any route not caught by static middleware
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
            console.error("Could not find index.html at:", path.join(publicPath, 'index.html'));
            res.status(404).send("<h1>File Not Found</h1><p>Ensure your 'index.html' is inside a folder named 'public'.</p>");
        }
    });
});

// --- IN-MEMORY DATABASE ---
let posts = [
    {
        id: 'welcome-1',
        user: 'Next System',
        handle: 'system',
        content: 'Server restarted. Connection established! 🚀',
        timestamp: Date.now(),
        likedBy: [],
        comments: []
    }
];

// --- REAL-TIME LOGIC ---
io.on('connection', (socket) => {
    socket.on('join-room', (room) => {
        socket.join(room);
        socket.emit('feed-update', posts);
    });

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
        posts.unshift(newPost);
        io.to('global-feed').emit('feed-update', posts);
    });

    socket.on('toggle-like', ({ postId, handle }) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            const index = post.likedBy.indexOf(handle);
            if (index === -1) post.likedBy.push(handle);
            else post.likedBy.splice(index, 1);
            io.to('global-feed').emit('feed-update', posts);
        }
    });

    socket.on('new-comment', ({ postId, user, content }) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
            post.comments.push({ user, content, timestamp: Date.now() });
            io.to('global-feed').emit('feed-update', posts);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
