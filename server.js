const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user joins the chat
    socket.on('join', (username) => {
        onlineUsers.set(socket.id, {
            username: username,
            id: socket.id,
            status: 'online'
        });
        
        // Broadcast updated user list to everyone
        io.emit('userListUpdate', Array.from(onlineUsers.values()));
        
        // System message
        io.emit('message', {
            username: 'System',
            text: `${username} has joined the lounge!`,
            system: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Handle chat messages
    socket.on('sendMessage', (messageData) => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            io.emit('message', {
                username: user.username,
                text: messageData.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                socketId: socket.id // Used to identify 'self' on client side
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            const username = user.username;
            onlineUsers.delete(socket.id);
            io.emit('userListUpdate', Array.from(onlineUsers.values()));
            console.log(`${username} disconnected`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
