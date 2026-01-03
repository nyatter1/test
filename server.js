const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to serve static files from the root or a 'public' folder
// Adjust this if your HTML files are inside a specific subdirectory
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit routes for your documents
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/chat.html', (req, res) => {
    // If chat.html is in a public folder, use path.join(__dirname, 'public', 'chat.html')
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// In-memory state (Note: resets when server restarts)
const users = new Map(); // socket.id -> { username, id }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // This event is triggered by chat.html after the redirect
    socket.on('join', (username) => {
        const cleanName = username ? username.trim() : `Guest_${socket.id.substring(0, 4)}`;
        
        users.set(socket.id, {
            id: socket.id,
            username: cleanName
        });

        console.log(`${cleanName} joined the chat`);

        // Update the online list for everyone
        io.emit('userListUpdate', Array.from(users.values()));

        // Send a welcome message
        io.emit('message', {
            username: 'System',
            text: `${cleanName} has joined the lounge!`,
            system: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Handle chat messages
    socket.on('sendMessage', (data) => {
        const user = users.get(socket.id);
        if (user && data.text) {
            io.emit('message', {
                username: user.username,
                text: data.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`${user.username} disconnected`);
            users.delete(socket.id);
            io.emit('userListUpdate', Array.from(users.values()));
        }
    });
});

// Render provides a PORT environment variable automatically
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
