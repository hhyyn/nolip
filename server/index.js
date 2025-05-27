const express = require('express');
const http = require('http');
const { initializeSocket } = require('./socket');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// 실행 환경 검사
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(`Running in ${isDevelopment ? 'development' : 'production'} mode`);

// CORS 설정
app.use(cors({
    origin: function(origin, callback) {
        // 개발 환경에서는 모든 요청 허용
        if (isDevelopment || !origin) {
            return callback(null, true);
        }
        
        // 허용할 도메인 목록 (프로덕션 환경)
        const allowedOrigins = [
            'https://nolip-game.web.app',
            'https://nolip-game.firebaseapp.com',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        } else {
            console.log('CORS blocked for origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// JSON 파싱 미들웨어
app.use(express.json());

// 요청 로그 미들웨어
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
    next();
});

// 기본 라우트
app.get('/', (req, res) => {
    res.json({
        message: 'Nolip Game Server',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// 상태 확인 엔드포인트
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        connections: initializeSocket.getConnections ? initializeSocket.getConnections() : 'unknown'
    });
});

// API 문서
app.get('/api', (req, res) => {
    res.json({
        version: '1.0.0',
        endpoints: {
            '/': 'Server information',
            '/health': 'Server health status',
            '/api': 'API documentation'
        },
        websocket: {
            events: {
                'joinRoom': 'Join a game room',
                'createRoom': 'Create a game room',
                'leaveRoom': 'Leave a game room',
                'message': 'Send/receive chat messages',
                'toggleReady': 'Toggle ready status',
                'rejoinRoom': 'Rejoin a previously connected room',
                'gameStart': 'Start the game',
                'correctAnswer': 'Mark an answer as correct'
            }
        }
    });
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
    console.error(`Error: ${err.message}`);
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: isDevelopment ? err.message : 'Something went wrong'
    });
});

// 소켓 서버 초기화
initializeSocket(server);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`서버가 http://${HOST}:${PORT} 에서 실행 중입니다.`);
    console.log(`웹소켓 서버가 ws://${HOST}:${PORT} 에서 실행 중입니다.`);
}); 