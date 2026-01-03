const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve the main index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Store active users in a Map for quick lookup
// Key: socket.id, Value: { username, age, gender, id }
const users = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining with their profile object
    socket.on('join', (profile) => {
        if (!profile || !profile.username) return;

        // Store user data in our map
        users.set(socket.id, {
            id: socket.id,
            username: profile.username,
            age: profile.age || '??',
            gender: profile.gender || 'Unknown'
        });

        // Broadcast system message about the new arrival
        socket.broadcast.emit('message', {
            system: true,
            text: `${profile.username} joined the lounge`
        });

        // Update everyone's player list
        io.emit('userListUpdate', Array.from(users.values()));
    });

    // Handle incoming messages
    socket.on('sendMessage', (data) => {
        const user = users.get(socket.id);
        if (user && data.text) {
            const messageData = {
                username: user.username,
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                system: false
            };
            
            // Send message to everyone including the sender
            io.emit('message', messageData);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            socket.broadcast.emit('message', {
                system: true,
                text: `${user.username} left the lounge`
            });
            users.delete(socket.id);
            
            // Update the player list for remaining users
            io.emit('userListUpdate', Array.from(users.values()));
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
