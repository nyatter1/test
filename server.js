const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route for the root to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit route for chat to ensure it loads correctly
app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Store online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // This 'join' event is triggered by chat.html using the username from localStorage
    socket.on('join', (username) => {
        // Clean the username or default to Guest
        const cleanUsername = username ? username.trim() : "Guest_" + socket.id.substring(0, 4);
        
        onlineUsers.set(socket.id, {
            username: cleanUsername,
            id: socket.id,
            status: 'online'
        });
        
        console.log(`${cleanUsername} joined the chat`);

        // Send the updated user list to everyone
        io.emit('userListUpdate', Array.from(onlineUsers.values()));
        
        // Broadcast join message
        io.emit('message', {
            username: 'System',
            text: `${cleanUsername} has joined the lounge!`,
            system: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('sendMessage', (messageData) => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            io.emit('message', {
                username: user.username,
                text: messageData.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                socketId: socket.id
            });
        }
    });

    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            const leftUsername = user.username;
            onlineUsers.delete(socket.id);
            io.emit('userListUpdate', Array.from(onlineUsers.values()));
            console.log(`${leftUsername} disconnected`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
