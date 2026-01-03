const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to serve static files from the root directory
// This ensures index.html, chat_app.html, etc., are accessible
app.use(express.static(__dirname));

// Route for the main landing page (Signup/Login)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the chat interface
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat_app.html'));
});

// In-memory store for active users
let onlineUsers = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining with their profile data
    socket.on('join', (profile) => {
        if (!profile || !profile.username) return;

        // Store user data associated with the socket ID
        const userData = {
            id: socket.id,
            username: profile.username,
            age: profile.age,
            gender: profile.gender,
            uid: profile.uid
        };

        onlineUsers.push(userData);

        // Notify everyone that a new user joined
        io.emit('message', {
            system: true,
            text: `${profile.username} has entered the lounge`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Broadcast the updated user list to all clients
        io.emit('userListUpdate', onlineUsers);
    });

    // Handle incoming chat messages (Public)
    socket.on('sendMessage', (data) => {
        const user = onlineUsers.find(u => u.id === socket.id);
        if (user && data.text) {
            io.emit('message', {
                username: user.username,
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                system: false
            });
        }
    });

    // Handle Private Messages (DMs)
    socket.on('privateMessage', (data) => {
        const sender = onlineUsers.find(u => u.id === socket.id);
        if (!sender || !data.target || !data.text) return;

        // Find the recipient in the online users list
        const recipient = onlineUsers.find(u => 
            u.username.toLowerCase() === data.target.toLowerCase()
        );

        if (recipient) {
            const dmPayload = {
                username: sender.username,
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isPrivate: true
            };

            // Send specifically to the recipient's socket ID
            io.to(recipient.id).emit('privateMessage', dmPayload);
        } else {
            // Notify sender if user is offline
            socket.emit('message', {
                system: true,
                text: `User ${data.target} is currently offline.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const userIndex = onlineUsers.findIndex(u => u.id === socket.id);
        if (userIndex !== -1) {
            const user = onlineUsers[userIndex];
            onlineUsers.splice(userIndex, 1);

            // Notify others
            io.emit('message', {
                system: true,
                text: `${user.username} has left the lounge`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            // Update user list for everyone
            io.emit('userListUpdate', onlineUsers);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
