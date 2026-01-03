const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active users: { socketId: { username, age, gender, ... } }
const users = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a user joins the lounge
    socket.on('join', (profile) => {
        // Store profile with socket ID
        users.set(socket.id, {
            ...profile,
            socketId: socket.id,
            joinedAt: new Date()
        });

        // Broadcast to everyone that a user joined
        io.emit('message', {
            system: true,
            text: `${profile.username} has entered the lounge.`
        });

        // Update the global user list for everyone
        updateUserList();
    });

    // Handle Public Messages
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

    // Handle Private Messages (DMs)
    socket.on('privateMessage', (data) => {
        const sender = users.get(socket.id);
        if (!sender) return;

        // Find the recipient by username (case insensitive)
        const recipientEntry = Array.from(users.entries()).find(([id, profile]) => 
            profile.username.toLowerCase() === data.target.toLowerCase()
        );

        if (recipientEntry) {
            const [recipientSocketId, recipientProfile] = recipientEntry;
            
            const dmPayload = {
                username: sender.username,
                text: data.text,
                timestamp: new Date(),
                isPrivate: true
            };

            // Send to recipient
            io.to(recipientSocketId).emit('privateMessage', dmPayload);

            // Optional: Send back to sender for their own local history/confirmation
            // socket.emit('privateMessageSent', { ...dmPayload, target: data.target });
        } else {
            // Recipient not found or offline
            socket.emit('message', {
                system: true,
                text: `User ${data.target} is currently offline.`
            });
        }
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            io.emit('message', {
                system: true,
                text: `${user.username} has left the lounge.`
            });
            users.delete(socket.id);
            updateUserList();
        }
        console.log('User disconnected:', socket.id);
    });

    function updateUserList() {
        const userList = Array.from(users.values()).map(u => ({
            username: u.username,
            age: u.age,
            gender: u.gender
        }));
        io.emit('userListUpdate', userList);
    }
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
