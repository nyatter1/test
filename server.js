const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route to serve the login/signup page (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit route to serve the chat dashboard (public/chat.html)
app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// In-memory store for active users
// Key: socket.id, Value: { username: string, id: string, joinedAt: Date }
const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log(`Connection established: ${socket.id}`);

    // Triggered when chat.html initializes and sends the username from localStorage
    socket.on('join', (username) => {
        // Sanitize username or fallback to a unique Guest name
        const cleanName = (username && username.trim().length > 0) 
            ? username.trim() 
            : `Guest_${socket.id.substring(0, 5)}`;

        // Store the user session
        activeUsers.set(socket.id, {
            username: cleanName,
            id: socket.id,
            joinedAt: new Date()
        });

        console.log(`User registered: ${cleanName} (${socket.id})`);

        // 1. Update the 'Online Players' list for everyone
        io.emit('userListUpdate', Array.from(activeUsers.values()));

        // 2. Broadcast a system message to the lounge
        io.emit('message', {
            username: 'System',
            text: `${cleanName} has entered the lounge!`,
            system: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    // Handle incoming chat messages
    socket.on('sendMessage', (messageData) => {
        const user = activeUsers.get(socket.id);
        
        if (user && messageData.text) {
            io.emit('message', {
                username: user.username,
                text: messageData.text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                socketId: socket.id // Useful for client-side styling
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            const leavingName = user.username;
            activeUsers.delete(socket.id);
            
            console.log(`User left: ${leavingName}`);

            // Update the player list for remaining users
            io.emit('userListUpdate', Array.from(activeUsers.values()));
            
            // Optional: Broadcast departure message
            // io.emit('message', { username: 'System', text: `${leavingName} left the chat.`, system: true });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`>>> Chat Server is live at http://localhost:${PORT}`);
});
