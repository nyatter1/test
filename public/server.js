const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware to serve static assets if you have a public folder
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// State management for online users
// Maps socket IDs to user profile objects
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining the lounge
    socket.on('join', (profile) => {
        if (!profile || !profile.username) return;

        // Store the user data
        const userData = {
            id: socket.id,
            username: profile.username,
            age: profile.age,
            gender: profile.gender
        };
        
        onlineUsers.set(socket.id, userData);

        // Notify others that someone joined
        socket.broadcast.emit('message', {
            system: true,
            text: `${userData.username} entered the lounge`
        });

        // Update the global player list for everyone
        io.emit('userListUpdate', Array.from(onlineUsers.values()));
    });

    // Handle chat messages
    socket.on('sendMessage', (data) => {
        const user = onlineUsers.get(socket.id);
        if (user && data.text) {
            io.emit('message', {
                username: user.username,
                text: data.text,
                system: false
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('message', {
                system: true,
                text: `${user.username} left the lounge`
            });
            onlineUsers.delete(socket.id);
            
            // Refresh the list for remaining users
            io.emit('userListUpdate', Array.from(onlineUsers.values()));
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Live Lounge server is running on port ${PORT}`);
});
