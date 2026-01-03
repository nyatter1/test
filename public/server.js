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

// Port configuration
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory state for basic real-time functionality
// Note: In production, you would typically use a database or Redis
const activeUsers = new Map();
const messageHistory = [];
const MAX_HISTORY = 100;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user joins the chat with their profile
    socket.on('join', (userProfile) => {
        const userData = {
            ...userProfile,
            socketId: socket.id,
            joinedAt: new Date()
        };
        
        activeUsers.set(socket.id, userData);

        // Send message history to the new user
        socket.emit('history', messageHistory);

        // Broadcast to everyone that a new user joined
        io.emit('userListUpdate', Array.from(activeUsers.values()));
        
        // System message about the new user
        const systemMsg = {
            id: `sys-${Date.now()}`,
            username: 'System',
            text: `${userData.username} has joined the lounge.`,
            timestamp: new Date(),
            type: 'system'
        };
        io.emit('message', systemMsg);
    });

    // Handling new chat messages
    socket.on('sendMessage', (messageText) => {
        const user = activeUsers.get(socket.id);
        if (!user) return;

        const newMessage = {
            id: `msg-${Date.now()}-${socket.id}`,
            userId: user.uid,
            username: user.username,
            text: messageText,
            timestamp: new Date(),
            type: 'user'
        };

        // Store in history
        messageHistory.push(newMessage);
        if (messageHistory.length > MAX_HISTORY) {
            messageHistory.shift();
        }

        // Broadcast to all users
        io.emit('message', newMessage);
    });

    // Handling typing indicators
    socket.on('typing', (isTyping) => {
        const user = activeUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('userTyping', {
                username: user.username,
                isTyping: isTyping
            });
        }
    });

    // Handling disconnection
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            console.log('User disconnected:', user.username);
            
            // System message about the departure
            const systemMsg = {
                id: `sys-out-${Date.now()}`,
                username: 'System',
                text: `${user.username} has left the lounge.`,
                timestamp: new Date(),
                type: 'system'
            };
            
            activeUsers.delete(socket.id);
            io.emit('userListUpdate', Array.from(activeUsers.values()));
            io.emit('message', systemMsg);
        }
    });
});

// Error handling for the server
server.on('error', (err) => {
    console.error('Server error:', err);
});

// Start the server
server.listen(PORT, () => {
    console.log(`Lounge Server running on port ${PORT}`);
});
