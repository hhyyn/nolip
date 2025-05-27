import { create } from 'zustand';
import { io } from 'socket.io-client';
import { persist } from 'zustand/middleware';

// 서버 주소 설정 - 항상 현재 호스트 기준으로 상대 경로 사용
const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000'  // 로컬 개발 환경
    : `${window.location.protocol}//${window.location.hostname}:4000`;  // 배포 환경
const MESSAGE_TIMEOUT = 5000; // 5초

console.log('Configured socket URL:', SOCKET_URL);

const SOCKET_CONFIG = {
    transports: ['websocket', 'polling'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    path: '/socket.io/',
    withCredentials: true,
    pingTimeout: 10000,
    pingInterval: 25000
};

// Room 정보 지속성을 위한 persist 미들웨어 사용
const useSocketStore = create(
    persist(
        (set, get) => ({
            socket: null,
            currentRoom: null, // {roomId: string, users: Array, hostId: string}
            messages: [], // [{type: 'system' | 'chat', content: string, userId?: string, name?: string, timestamp: number, ...}]
            errorMessage: '',
            isConnected: false,
            isReconnecting: false,
            users: [],
            hostId: null,
            gameState: null,
            currentRound: 1,
            totalRounds: 5,
            roundStartTime: null,
            roundEndTime: null,
            roundDuration: 30,
            currentSong: null,
            isPlaying: false,
            isGameStarted: false,
            isGameEnded: false,
            scores: {},
            correctAnswer: null,
            hasAnswered: false,
            isAnswerCorrect: false,
            isAnswerRevealed: false,
            isHost: false,
            isReady: false,
            readyUsers: new Set(),
            gameResults: null,
            
            // 소켓 연결 초기화
            initializeSocket: (userId) => {
                const socket = io(SOCKET_URL, {
                    ...SOCKET_CONFIG,
                    auth: { userId }
                });

                socket.on('connect', () => {
                    set({ isConnected: true, isReconnecting: false });
                });

                socket.on('disconnect', () => {
                    set({ isConnected: false });
                });

                socket.on('reconnecting', () => {
                    set({ isReconnecting: true });
                });

                socket.on('reconnect_failed', () => {
                    set({ isReconnecting: false });
                });

                socket.on('userList', ({ users, hostId }) => {
                    set({ users, hostId, isHost: hostId === userId });
                });

                socket.on('gameState', (gameState) => {
                    set({ gameState });
                });

                socket.on('roundStart', ({ song, roundNumber, startTime, endTime }) => {
                    set({
                        currentSong: song,
                        currentRound: roundNumber,
                        roundStartTime: startTime,
                        roundEndTime: endTime,
                        isPlaying: true,
                        hasAnswered: false,
                        isAnswerCorrect: false,
                        isAnswerRevealed: false,
                        correctAnswer: null
                    });
                });

                socket.on('roundEnd', ({ correctAnswer, scores }) => {
                    set({
                        isPlaying: false,
                        correctAnswer,
                        scores,
                        isAnswerRevealed: true
                    });
                });

                socket.on('gameEnd', (results) => {
                    set({
                        isGameEnded: true,
                        gameResults: results,
                        isPlaying: false
                    });
                });

                socket.on('userReady', ({ userId, readyStatus }) => {
                    set((state) => {
                        const newReadyUsers = new Set(state.readyUsers);
                        if (readyStatus) {
                            newReadyUsers.add(userId);
                        } else {
                            newReadyUsers.delete(userId);
                        }
                        return { readyUsers: newReadyUsers };
                    });
                });

                socket.on('error', ({ message }) => {
                    set({ errorMessage: message });
                    setTimeout(() => set({ errorMessage: '' }), MESSAGE_TIMEOUT);
                });

                set({ socket });
            },

            // 방 생성
            createRoom: () => {
                const { socket } = get();
                if (socket) {
                    socket.emit('createRoom');
                }
            },

            // 방 참가
            joinRoom: (roomId) => {
                const { socket } = get();
                if (socket) {
                    socket.emit('joinRoom', { roomId });
                    set({ currentRoom: roomId });
                }
            },

            // 방 나가기
            leaveRoom: () => {
                const { socket, currentRoom } = get();
                if (socket && currentRoom) {
                    socket.emit('leaveRoom', { roomId: currentRoom });
                    set({ currentRoom: null });
                }
            },

            // 준비 상태 토글
            toggleReady: () => {
                const { socket, currentRoom, isReady } = get();
                if (socket && currentRoom) {
                    socket.emit('toggleReady', { roomId: currentRoom });
                    set({ isReady: !isReady });
                }
            },

            // 소켓 연결 해제
            disconnectSocket: () => {
                const { socket } = get();
                if (socket) {
                    socket.disconnect();
                    set({ socket: null, isConnected: false });
                }
            },

            // 메시지 초기화
            clearMessages: () => {
                set({ messages: [] });
            },

            // 에러 초기화
            clearError: () => set({ errorMessage: '' }),
            
            // 연결 상태 확인 및 재연결
            checkConnection: () => {
                const { socket, isConnected } = get();
                if (!socket || !isConnected) {
                    get().initializeSocket();
                }
            },

            startGame: () => {
                const { socket, currentRoom } = get();
                if (socket && currentRoom) {
                    socket.emit('startGame', { roomId: currentRoom });
                    set({ isGameStarted: true });
                }
            },

            submitAnswer: (answer) => {
                const { socket, currentRoom } = get();
                if (socket && currentRoom && !get().hasAnswered) {
                    socket.emit('submitAnswer', { roomId: currentRoom, answer });
                    set({ hasAnswered: true });
                }
            },

            resetGame: () => {
                set({
                    currentRound: 1,
                    isGameStarted: false,
                    isGameEnded: false,
                    gameResults: null,
                    scores: {},
                    currentSong: null,
                    isPlaying: false,
                    hasAnswered: false,
                    isAnswerCorrect: false,
                    isAnswerRevealed: false,
                    correctAnswer: null,
                    isReady: false,
                    readyUsers: new Set()
                });
            }
        }),
        {
            name: 'socket-storage',
            partialize: (state) => ({
                currentRoom: state.currentRoom
            })
        }
    )
);

export default useSocketStore; 