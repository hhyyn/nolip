const { Server } = require('socket.io');

let io;
let rooms = new Map(); // roomId -> {users: Map<userId, userInfo>, settings: {...}}
let activeSockets = new Map(); // socketId -> userId
let activeConnections = 0;

// 방 정보 브로드캐스트
const broadcastRoomInfo = (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
        io.to(roomId).emit('userList', {
            roomId,
            users: Array.from(room.users.values()),
            hostId: room.hostId  // 방장 ID 포함
        });
    }
};

// 방 정보 정리 (빈 방 제거)
const cleanupRooms = () => {
    for (const [roomId, room] of rooms.entries()) {
        if (room.users.size === 0) {
            rooms.delete(roomId);
        }
    }
};

// 접속 통계 반환
const getConnections = () => ({
    sockets: activeConnections,
    rooms: rooms.size
});

const handleError = (socket, message) => {
    socket.emit('error', { message });
};

const handleCorrectAnswer = (roomId, userId, userName, songName, round) => {
    const room = rooms.get(roomId);
    if (!room || room.answerSubmitted) {
        return;
    }

    room.answerSubmitted = true;
    room.scores[userId] = (room.scores[userId] || 0) + 1;

    io.to(roomId).emit('roundEnd', {
        correctAnswer: songName,
        scores: room.scores
    });

    if (round < room.totalRounds) {
        setTimeout(() => {
            startNextRound(roomId);
        }, 5000);
    } else {
        endGame(roomId);
    }
};

const startNextRound = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.currentRound++;
    room.answerSubmitted = false;

    const startTime = Date.now();
    const endTime = startTime + (room.roundDuration * 1000);

    io.to(roomId).emit('roundStart', {
        song: room.currentSong,
        roundNumber: room.currentRound,
        startTime,
        endTime
    });
};

const endGame = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const results = {
        scores: room.scores,
        rounds: room.totalRounds,
        winner: Object.entries(room.scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    };

    io.to(roomId).emit('gameEnd', results);
    room.isGameStarted = false;
    room.currentRound = 1;
    room.scores = {};
    room.readyUsers.clear();
};

const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.handshake.auth.userId;
        if (!userId) {
            handleError(socket, '사용자 ID가 필요합니다.');
            socket.disconnect();
            return;
        }

        activeSockets.set(socket.id, { userId, socket });
        activeConnections++;

        socket.on('disconnect', () => {
            const socketData = activeSockets.get(socket.id);
            if (socketData) {
                for (const [roomId, room] of rooms.entries()) {
                    if (room.users.has(socketData.userId)) {
                        room.users.delete(socketData.userId);
                        room.readyUsers.delete(socketData.userId);
                        if (room.hostId === socketData.userId) {
                            const nextHost = Array.from(room.users.values())[0];
                            if (nextHost) {
                                room.hostId = nextHost.userId;
                            }
                        }
                        broadcastRoomInfo(roomId);
                    }
                }
                activeSockets.delete(socket.id);
                activeConnections--;
            }
            cleanupRooms();
        });

        socket.on('createRoom', () => {
            const roomId = Math.random().toString(36).substring(2, 8);
            const user = { userId, socket };

            rooms.set(roomId, {
                users: new Map([[userId, user]]),
                hostId: userId,
                isGameStarted: false,
                currentRound: 1,
                totalRounds: 5,
                roundDuration: 30,
                scores: {},
                readyUsers: new Set(),
                answerSubmitted: false
            });

            socket.join(roomId);
            broadcastRoomInfo(roomId);
        });

        socket.on('joinRoom', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room) {
                handleError(socket, '존재하지 않는 방입니다.');
                return;
            }

            if (room.isGameStarted) {
                handleError(socket, '이미 게임이 시작된 방입니다.');
                return;
            }

            if (room.users.size >= 8) {
                handleError(socket, '방이 가득 찼습니다.');
                return;
            }

            const user = { userId, socket };
            room.users.set(userId, user);
            socket.join(roomId);
            broadcastRoomInfo(roomId);
        });

        socket.on('leaveRoom', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room) return;

            room.users.delete(userId);
            room.readyUsers.delete(userId);
            socket.leave(roomId);

            if (room.hostId === userId) {
                const nextHost = Array.from(room.users.values())[0];
                if (nextHost) {
                    room.hostId = nextHost.userId;
                }
            }

            broadcastRoomInfo(roomId);
            cleanupRooms();
        });

        socket.on('toggleReady', ({ roomId }) => {
            const room = rooms.get(roomId);
            if (!room) return;

            if (room.readyUsers.has(userId)) {
                room.readyUsers.delete(userId);
            } else {
                room.readyUsers.add(userId);
            }

            io.to(roomId).emit('userReady', {
                userId,
                readyStatus: room.readyUsers.has(userId)
            });

            if (room.readyUsers.size === room.users.size && room.users.size >= 2) {
                room.isGameStarted = true;
                startNextRound(roomId);
            }
        });

        socket.on('submitAnswer', ({ roomId, answer }) => {
            const room = rooms.get(roomId);
            if (!room || !room.isGameStarted || room.answerSubmitted) return;

            if (answer.toLowerCase() === room.currentSong.name.toLowerCase()) {
                handleCorrectAnswer(roomId, userId, socket.userName, room.currentSong.name, room.currentRound);
            }
        });
    });

    return io;
};

module.exports = {
    initializeSocket,
    getConnections
}; 