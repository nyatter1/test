const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Store connected players
const players = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a new player entry
    players[socket.id] = {
        id: socket.id,
        position: { x: 0, y: 1, z: 0 },
        rotation: { y: 0 },
        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };

    // Send the current players list to the new player
    socket.emit('currentPlayers', players);

    // Broadcast new player to others
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Handle movement updates
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].position = movementData.position;
            players[socket.id].rotation = movementData.rotation;
            // Broadcast the movement to all other players
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
