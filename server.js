const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let rooms = {}; // Store room information with roomID as key
let users = {}; // Keep track of connected users and their room assignments

io.on('connection', (socket) => {
    console.log('A user connected.');

    // Handle room creation
    socket.on('createRoom', (username) => {
        const roomID = generateRoomID();
        users[socket.id] = { username, room: roomID };
        rooms[roomID] = { users: [socket.id] };

        console.log(`${username} created room ${roomID}.`);
        socket.join(roomID);
        socket.emit('roomCreated', { roomID });
    });

    // Handle room joining
    socket.on('joinRoom', ({ username, roomID }) => {
        console.log(`Join attempt: ${username} trying to join room ${roomID}`);
        if (rooms[roomID] && rooms[roomID].users.length < 2) {
            users[socket.id] = { username, room: roomID };
            rooms[roomID].users.push(socket.id);

            console.log(`${username} joined room ${roomID}.`);
            socket.join(roomID);
            socket.emit('roomJoined', { roomID });
            io.to(roomID).emit('ready'); // Notify both users that they can start the call
        } else {
            socket.emit('full', 'Room is full or does not exist. Please try again later.');
        }
    });

    // Handle ready signal
    socket.on('ready', (roomID) => {
        console.log(`User in room ${roomID} is ready.`);
        const room = users[socket.id]?.room;
        if (room) {
            socket.to(room).emit('ready');
        }
    });

    // Handle offer
    socket.on('offer', ({ offer, roomID }) => {
        console.log(`Offer received for room ${roomID}`);
        socket.to(roomID).emit('offer', offer);
    });

    // Handle answer
    socket.on('answer', ({ answer, roomID }) => {
        console.log(`Answer received for room ${roomID}`);
        socket.to(roomID).emit('answer', answer);
    });

    // Handle ICE candidate
    socket.on('candidate', ({ candidate, roomID }) => {
        console.log(`ICE candidate received for room ${roomID}`);
        socket.to(roomID).emit('candidate', candidate);
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected.');
        const room = users[socket.id]?.room;

        if (room) {
            socket.leave(room);
            const roomUsers = rooms[room].users;
            rooms[room].users = roomUsers.filter(id => id !== socket.id);

            if (rooms[room].users.length === 0) {
                delete rooms[room]; // Delete the room if empty
            } else {
                socket.to(room).emit('disconnected', 'User has left the chat.');
            }
        }

        delete users[socket.id];
        console.log('Current state of rooms:', rooms);
        console.log('Current state of users:', users);
    });
});

// Utility function to generate a unique room ID
function generateRoomID() {
    return Math.random().toString(36).substr(2, 8); // Generate a random 8-character string
}

http.listen(3002, () => {
    console.log('Server is running on port 3002');
});
