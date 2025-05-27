import { useEffect, useRef, useState } from 'react';
import useSocketStore from '../../store/socketStore';
import useAuthStore from '../../store/authStore';

export const SocketProvider = ({ children }) => {
    const { user } = useAuthStore();
    const { 
        initializeSocket, 
        checkConnection, 
        socket,
        error,
        currentRoom
    } = useSocketStore();
    
    // 연결 상태 추적
    const [isConnected, setIsConnected] = useState(false);
    
    // 연결 확인용 타이머 참조
    const connectionCheckTimerRef = useRef(null);
    const previousRoomIdRef = useRef(null);
    const roomChangeTimerRef = useRef(null);

    // 앱 시작 시 소켓 연결 초기화 및 항상 연결 유지
    useEffect(() => {
        console.log('SocketProvider 마운트: 소켓 연결 초기화');
        
        // 앱 시작 시 소켓 연결 시도
        if (socket && socket.connected) {
            console.log('SocketProvider: 이미 연결된 소켓 발견');
            setIsConnected(true);
        } else {
            console.log('SocketProvider: 초기 연결 시도');
            initializeSocket();
        }
        
        // 주기적으로 연결 상태 확인 (3초마다)
        connectionCheckTimerRef.current = setInterval(() => {
            if (socket && !socket.connected) {
                console.log('주기적 연결 확인: 연결 끊김 감지, 재연결 시도');
                initializeSocket(); // 연결이 끊어진 경우 직접 초기화
            } else if (socket && socket.connected) {
                setIsConnected(true);
            }
        }, 3000);

        // 컴포넌트 언마운트 시에도 소켓 연결 유지
        return () => {
            console.log('SocketProvider 언마운트: 연결 확인 타이머 해제');
            
            // 타이머 정리
            if (connectionCheckTimerRef.current) {
                clearInterval(connectionCheckTimerRef.current);
                connectionCheckTimerRef.current = null;
            }
            
            if (roomChangeTimerRef.current) {
                clearTimeout(roomChangeTimerRef.current);
                roomChangeTimerRef.current = null;
            }
            
            // 소켓 연결 유지 (disconnect 호출하지 않음)
        };
    }, []);
    
    // 소켓 상태 변경 감지 및 로깅
    useEffect(() => {
        if (socket) {
            const connected = socket.connected;
            console.log('소켓 상태 변경:', connected ? '연결됨' : '연결 끊김');
            setIsConnected(connected);
            
            // 연결 상태가 변할 때마다 이벤트 리스너 설정
            const handleConnect = () => {
                console.log('Socket connected event');
                setIsConnected(true);
            };
            
            const handleDisconnect = () => {
                console.log('Socket disconnected event');
                setIsConnected(false);
                // 연결이 끊어지면 즉시 재연결 시도
                setTimeout(() => {
                    initializeSocket();
                }, 500);
            };
            
            // 이벤트 리스너 등록
            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('connect_error', (error) => {
                console.log('연결 오류 발생:', error);
                // 연결 오류 시 재연결 시도
                setTimeout(() => {
                    initializeSocket();
                }, 1000);
            });
            
            // 소켓 연결이 끊기면 핑 보내기 시도
            const pingIntervalRef = setInterval(() => {
                if (socket && !socket.connected) {
                    console.log('연결 끊김 감지, 핑 보내기 시도');
                    try {
                        socket.connect();
                    } catch (e) {
                        console.error('연결 시도 중 오류:', e);
                    }
                }
            }, 2000);
            
            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('connect_error');
                clearInterval(pingIntervalRef);
            };
        }
    }, [socket]);
    
    // 방 정보 변경 감지 (단순 로깅용)
    useEffect(() => {
        if (currentRoom && currentRoom.roomId !== previousRoomIdRef.current) {
            console.log('방 정보 변경:', currentRoom.roomId);
            previousRoomIdRef.current = currentRoom.roomId;
            
            // 방 입장 직후 소켓 연결 상태 확인 (약간의 지연 후)
            if (roomChangeTimerRef.current) {
                clearTimeout(roomChangeTimerRef.current);
            }
            
            roomChangeTimerRef.current = setTimeout(() => {
                if (socket && !socket.connected) {
                    console.log('방 입장 후 소켓 연결이 끊어진 것을 감지, 재연결 시도');
                    initializeSocket();
                }
                roomChangeTimerRef.current = null;
            }, 500);
            
        } else if (!currentRoom && previousRoomIdRef.current) {
            console.log('방에서 나감');
            previousRoomIdRef.current = null;
        }
    }, [currentRoom, socket]);
    
    // 오류 발생 시 즉시 재연결 시도
    useEffect(() => {
        if (error) {
            console.log('소켓 오류 발생, 즉시 재연결 시도:', error);
            initializeSocket();
        }
    }, [error]);

    return children;
}; 