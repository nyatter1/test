const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// 1. Serve static files from the root directory
app.use(express.static(__dirname));

// 2. Explicitly handle the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Add a specific route for the chat page to ensure it doesn't loop back
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat_app.html'));
});

// In-memory state for basic real-time functionality
const activeUsers = new Map();
const messageHistory = [];
const MAX_HISTORY = 100;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (userProfile) => {
        if (!userProfile || !userProfile.username) return;

        const userData = {
            ...userProfile,
            socketId: socket.id,
            joinedAt: new Date()
        };
        
        activeUsers.set(socket.id, userData);
        socket.emit('history', messageHistory);
        io.emit('userListUpdate', Array.from(activeUsers.values()));
        
        const systemMsg = {
            id: `sys-${Date.now()}`,
            username: 'System',
            text: `${userData.username} has joined the lounge.`,
            timestamp: new Date(),
            system: true // Ensure frontend recognizes this as a system message
        };
        io.emit('message', systemMsg);
    });

    socket.on('sendMessage', (data) => {
        const user = activeUsers.get(socket.id);
        if (!user) return;

        const newMessage = {
            id: `msg-${Date.now()}-${socket.id}`,
            userId: user.uid,
            username: user.username,
            text: data.text || data, // Handle both object and string inputs
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(),
            system: false
        };

        messageHistory.push(newMessage);
        if (messageHistory.length > MAX_HISTORY) messageHistory.shift();

        io.emit('message', newMessage);
    });

    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            activeUsers.delete(socket.id);
            io.emit('userListUpdate', Array.from(activeUsers.values()));
            io.emit('message', {
                username: 'System',
                text: `${user.username} has left.`,
                system: true
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
