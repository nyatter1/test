const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to serve static files from the root directory
app.use(express.static(__dirname));

// Route for the main landing page (Signup/Login)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the chat interface
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat_app.html'));
});

// In-memory stores
let onlineUsers = [];
// Persistent registry to track users even when they go offline
let userRegistry = []; 

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
            uid: profile.uid || socket.id
        };

        // Add to online list
        onlineUsers.push(userData);

        // Update the global registry if this is a new user
        const existingIndex = userRegistry.findIndex(u => u.username.toLowerCase() === profile.username.toLowerCase());
        if (existingIndex === -1) {
            userRegistry.push({
                username: userData.username,
                uid: userData.uid,
                isStaff: /dev|owner|helper|admin|mod|ceo|sadmin/i.test(userData.username)
            });
        }

        // Notify everyone that a new user joined
        io.emit('message', {
            system: true,
            text: `${profile.username} has entered the lounge`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Broadcast the updated user list AND the full registry to all clients
        io.emit('userListUpdate', onlineUsers);
        io.emit('registryUpdate', userRegistry);
    });

    // Handle incoming chat messages (Public) - UPDATED TO SUPPORT MEDIA
    socket.on('sendMessage', (data) => {
        const user = onlineUsers.find(u => u.id === socket.id);
        if (user) {
            io.emit('message', {
                username: user.username,
                text: data.text || '',
                file: data.file || null,         // Base64 data for images/audio
                fileType: data.fileType || null, // MimeType (e.g., image/png)
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                system: false
            });
        }
    });

    // Handle Private Messages (DMs)
    socket.on('privateMessage', (data) => {
        const sender = onlineUsers.find(u => u.id === socket.id);
        if (!sender || !data.target || (!data.text && !data.file)) return;

        const recipient = onlineUsers.find(u => 
            u.username.toLowerCase() === data.target.toLowerCase()
        );

        if (recipient) {
            const dmPayload = {
                username: sender.username,
                text: data.text || '',
                file: data.file || null,
                fileType: data.fileType || null,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isPrivate: true
            };
            io.to(recipient.id).emit('privateMessage', dmPayload);
        } else {
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

            // Update online user list for everyone
            io.emit('userListUpdate', onlineUsers);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
