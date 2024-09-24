const socket = io();

let localStream;
let peerConnection;
let currentRoomID = null; // Store the current room ID
const config = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Google's free STUN server
        }
    ]
};

function createRoom() {
    const username = document.getElementById('username').value.trim();
    if (username.length > 0) {
        socket.emit('createRoom', username);
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function joinRoom() {
    const username = document.getElementById('username').value.trim();
    const roomID = document.getElementById('roomIdInput').value.trim();
    if (username.length > 0 && roomID.length > 0) {
        socket.emit('joinRoom', { username, roomID });
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

socket.on('roomCreated', ({ roomID }) => {
    currentRoomID = roomID; // Set the current room ID
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('chatPage').style.display = 'block';
    document.getElementById('roomIdDisplay').textContent = `Room ID: ${roomID}`;
});

socket.on('roomJoined', ({ roomID }) => {
    currentRoomID = roomID; // Set the current room ID
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('chatPage').style.display = 'block';
    document.getElementById('roomIdDisplay').textContent = `Room ID: ${roomID}`;
});

// Get media stream from user's camera and microphone
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        document.getElementById('localVideo').srcObject = stream;
        localStream = stream;
        document.getElementById('callStatus').textContent = 'Media ready. Waiting for connection...';
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
        document.getElementById('callStatus').textContent = 'Error accessing media devices.';
    });

socket.on('ready', () => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(config);
        peerConnection.addStream(localStream);

        peerConnection.onaddstream = (event) => {
            document.getElementById('remoteVideo').srcObject = event.stream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', { candidate: event.candidate, roomID: currentRoomID });
            }
        };

        peerConnection.createOffer()
            .then(offer => {
                peerConnection.setLocalDescription(offer);
                socket.emit('offer', { offer, roomID: currentRoomID });
            });
    }
});

socket.on('offer', (offer) => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.addStream(localStream);

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    peerConnection.createAnswer()
        .then(answer => {
            peerConnection.setLocalDescription(answer);
            socket.emit('answer', { answer, roomID: currentRoomID });
        });

    peerConnection.onaddstream = (event) => {
        document.getElementById('remoteVideo').srcObject = event.stream;
    };
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', (candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection.addIceCandidate(iceCandidate);
});

// Mute audio button functionality
document.getElementById('muteAudio').addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        document.getElementById('muteAudio').textContent = 'Unmute Audio';
    } else {
        audioTrack.enabled = true;
        document.getElementById('muteAudio').textContent = 'Mute Audio';
    }
});

// Toggle video button functionality
document.getElementById('toggleVideo').addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack.enabled) {
        videoTrack.enabled = false;
        document.getElementById('toggleVideo').textContent = 'Enable Video';
    } else {
        videoTrack.enabled = true;
        document.getElementById('toggleVideo').textContent = 'Disable Video';
    }
});
