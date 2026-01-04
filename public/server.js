const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store active users in memory
// Map of socket.id -> { username, age, gender, joined, rank }
const users = new Map();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat_app.html'));
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join room and set profile
    socket.on('join', (profile) => {
        users.set(socket.id, {
            ...profile,
            id: socket.id,
            joined: profile.joined || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });

        // Broadcast to everyone that a user joined
        io.emit('message', {
            system: true,
            text: `${profile.username} entered the lounge`
        });

        // Send updated user list to everyone
        updateUserList();
    });

    // Public Message Handler
    socket.on('sendMessage', (data) => {
        const user = users.get(socket.id);
        if (user) {
            io.emit('message', {
                username: user.username,
                text: data.text,
                system: false
            });
        }
    });

    // Private Message Handler
    socket.on('privateMessage', (data) => {
        const sender = users.get(socket.id);
        if (!sender) return;

        const targetUsername = data.target;
        const messageText = data.text;

        // Find the target user's socket(s)
        let targetSocketId = null;
        for (const [id, user] of users.entries()) {
            if (user.username === targetUsername) {
                targetSocketId = id;
                break;
            }
        }

        const payload = {
            username: sender.username,
            target: targetUsername,
            text: messageText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // 1. Send to the receiver (if online)
        if (targetSocketId) {
            io.to(targetSocketId).emit('privateMessage', payload);
        }

        // 2. ALWAYS send back to the sender so they see their own message
        socket.emit('privateMessage', payload);
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            io.emit('message', {
                system: true,
                text: `${user.username} left the lounge`
            });
            users.delete(socket.id);
            updateUserList();
        }
    });

    function updateUserList() {
        const userArray = Array.from(users.values());
        io.emit('userListUpdate', userArray);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Lounge Server running on port ${PORT}`);
});
