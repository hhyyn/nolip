import { forwardRef, useState, useEffect, useRef, useImperativeHandle, useCallback } from 'react';
import { Button } from 'pixel-retroui';
import { ProfileGrid } from './ProfileGrid';
import { MessageBubble } from './MessageBubble';
import useGameStore from '../../../store/gameStore';
import useSocketStore from '../../../store/socketStore';
import { getRandomSong } from '../../../lib/firebase';

export const GameField = forwardRef(({ mode = 'ready', onToggleReady, currentUser, onRoundChange, onGameOver, currentRound, totalRounds }, ref) => {
    const [isReady, setIsReady] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gamePhase, setGamePhase] = useState('waiting'); // 'waiting' | 'playing' | 'answering'
    const [audio, setAudio] = useState(null);
    const [isProcessingAnswer, setIsProcessingAnswer] = useState(false); // 정답 처리 중인지 확인하는 상태
    const [recentMessages, setRecentMessages] = useState({});
    const isPlayingRef = useRef(false);
    const listenersSetupRef = useRef(false); // 이벤트 리스너 설정 여부 추적
    const roundAnsweredRef = useRef({}); // 각 라운드별 정답 처리 여부 추적
    const [messages, setMessages] = useState([]);
    
    const { getLeftParticipants, getRightParticipants, updateParticipantReady, updateParticipantScore } = useGameStore();
    const { currentRoom, socket } = useSocketStore();

    // 컴포넌트 마운트 시 전역 상태 초기화
    useEffect(() => {
        window.gamePhaseState = 'waiting';
        window.roundAnswered = {}; // 전역 변수로 각 라운드별 정답 처리 여부 추적
    }, []);

    // gamePhase 상태 변경을 추적하여 window 객체도 업데이트
    useEffect(() => {
        window.gamePhaseState = gamePhase;
    }, [gamePhase]);

    // 라운드 변경 시 해당 라운드의 정답 처리 여부 초기화
    useEffect(() => {
        // 이전 라운드들의 상태를 모두 초기화
        Object.keys(roundAnsweredRef.current).forEach(round => {
            if (Number(round) < currentRound) {
                delete roundAnsweredRef.current[round];
                delete window.roundAnswered[round];
            }
        });
        
        // 현재 라운드 초기화
        roundAnsweredRef.current[currentRound] = false;
        window.roundAnswered[currentRound] = false;
        
        // 메시지 배열 초기화
        setMessages([]);
        
        console.log(`라운드 ${currentRound} 시작, 정답 처리 상태 초기화`, 
            { roundAnsweredRef: { ...roundAnsweredRef.current }, windowRoundAnswered: { ...window.roundAnswered } });
    }, [currentRound]);

    // 정답 체크 함수
    const checkAnswer = (message, userId) => {
        if (!currentSong || !message) {
            return false;
        }
        
        console.log("정답 체크 - 입력값:", message, "정답:", currentSong.name);
        
        // 한글 문자열 비교를 위한 Intl.Collator 사용
        const collator = new Intl.Collator('ko', { sensitivity: 'base' });
        
        // 입력값과 정답의 공백 제거
        const userAnswer = message.replace(/\s+/g, '');
        const correctAnswer = currentSong.name.replace(/\s+/g, '');
        
        // 정확한 비교
        const isCorrect = collator.compare(userAnswer, correctAnswer) === 0;
        
        console.log("정답 체크 - 공백 제거 후:", { userAnswer, correctAnswer, isCorrect });
        return isCorrect;
    };

    // 소켓 이벤트 리스너 설정
    useEffect(() => {
        if (!socket) {
            console.log('소켓 없음, 이벤트 리스너 설정 건너뜀');
            return;
        }

        // 중복 리스너 설정 방지를 위한 체크
        if (listenersSetupRef.current) {
            console.log('이미 이벤트 리스너가 설정되어 있음, 중복 설정 방지');
            return;
        }

        console.log('소켓 이벤트 리스너 설정 (소켓 ID:', socket.id, ')');
        
        // 새로운 노래 수신 이벤트
        const handleNewSong = async (data) => {
            const currentUserUid = currentUser?.uid;
            const currentRoomHostId = currentRoom?.hostId;
            
            console.log('새로운 노래 수신:', data?.song?.name);
            
            if (currentUserUid !== currentRoomHostId) {
                setCurrentSong(data.song);
                try {
                    await playSongAudio();
                } catch (error) {
                    console.error('참가자 노래 재생 실패:', error);
                }
            }
        };

        // 정답 처리 이벤트
        const handleCorrectAnswer = (data) => {
            console.log('정답 처리 이벤트 수신:', data);
            
            // 이미 정답 처리가 된 라운드인지 확인
            if (roundAnsweredRef.current[currentRound] && data.round === currentRound) {
                console.log('이미 정답 처리가 된 라운드입니다. 중복 처리 방지:', currentRound);
                return;
            }
            
            // 현재 라운드 정답 처리 여부 기록
            roundAnsweredRef.current[currentRound] = true;
            window.roundAnswered[currentRound] = true;
            
            // 오디오 정지
            const currentAudio = audio;
            if (currentAudio) {
                currentAudio.pause();
            }
            
            // 게임 상태 변경
            setIsPlaying(false);
            setGamePhase('waiting');
            window.gamePhaseState = 'waiting';
            isPlayingRef.current = false;
            
            // 정답 처리 중 상태로 설정
            setIsProcessingAnswer(true);
            
            // 서버에서 전달받은 newScore 값으로 점수 업데이트
            if (data.userId && data.newScore !== undefined) {
                updateParticipantScore(data.userId, data.newScore);
            }
            
            // 마지막 라운드 체크 - 명확하게 확인
            console.log(`현재 라운드: ${currentRound}, 총 라운드: ${totalRounds}, 마지막 라운드 여부: ${currentRound > totalRounds}`);
            
            // 6라운드(totalRounds + 1)에서 정답을 맞추면 게임 종료
            if (currentRound >= totalRounds + 1 || data.round >= totalRounds + 1) {
                console.log('5라운드 정답 처리 - 게임 종료 처리 시작');
                // 즉시 게임 종료 처리 실행
                findWinnerAndEndGame();
                
                // 5초 후에 정답 처리 상태 초기화
                setTimeout(() => {
                    setIsProcessingAnswer(false);
                }, 5000);
                return; // 여기서 함수 종료하여 다음 카운트다운이 시작되지 않도록 함
            }

            // 다음 라운드로 진행
            console.log(`현재 라운드 ${currentRound}에서 다음 라운드로 진행합니다.`);
            const nextRound = currentRound + 1;
            
            // 정답 처리 상태 초기화 및 다음 라운드로 변경
            setTimeout(() => {
                setIsProcessingAnswer(false);
                if (onRoundChange) {
                    onRoundChange(nextRound);
                }
            }, 2000);
            
            // 5초 후에 정답 처리 상태 초기화 (안전장치)
            setTimeout(() => {
                setIsProcessingAnswer(false);
            }, 5000);
        };
        
        // 게임 종료 이벤트
        const handleGameEnd = (data) => {
            console.log('게임 종료 이벤트 수신:', data);
            // 우승자 설정
            if (data.winner) {
                if (onGameOver) {
                    onGameOver(true, data.winner);
                }
            }
        };

        // 이벤트 리스너 등록
        socket.on('newSong', handleNewSong);
        socket.on('correctAnswer', handleCorrectAnswer);
        socket.on('gameEnd', handleGameEnd);
        
        // 소켓 상태 로그
        console.log('소켓 이벤트 리스너 등록 완료, 소켓 상태:', socket.connected ? '연결됨' : '연결 중');
        
        // 리스너 설정 플래그를 true로 설정
        listenersSetupRef.current = true;

        // 소켓 연결 끊김 감지
        const handleDisconnect = (reason) => {
            console.log('소켓 연결 끊김 감지, 이유:', reason);
            
            // 단순히 연결 복구만 시도
            console.log('서버 연결이 끊김, 연결 복구 시도');
            if (useSocketStore.getState) {
                setTimeout(() => {
                    const socketStore = useSocketStore.getState();
                    if (socketStore) {
                        socketStore.checkConnection();
                    }
                }, 500);
            }
        };
        
        // 소켓 재연결 감지
        const handleReconnect = (attemptNumber) => {
            console.log(`소켓 재연결 성공 (${attemptNumber}회 시도)`);
        };
        
        // 연결 관련 이벤트 리스너 등록
        socket.on('disconnect', handleDisconnect);
        socket.on('reconnect', handleReconnect);
        socket.on('connect', () => {
            console.log('소켓 연결 완료');
        });

        return () => {
            console.log('소켓 이벤트 리스너 제거');
            // 리스너 제거 전 소켓 연결 상태 확인
            if (socket) {
                socket.off('newSong', handleNewSong);
                socket.off('correctAnswer', handleCorrectAnswer);
                socket.off('gameEnd', handleGameEnd);
                socket.off('disconnect', handleDisconnect);
                socket.off('reconnect', handleReconnect);
                socket.off('connect');
            }
            listenersSetupRef.current = false;
        };
    }, [socket, currentUser?.uid, currentRoom?.hostId, currentRoom]);

    // 현재 방 정보 변경 감지
    useEffect(() => {
        if (currentRoom) {
            // 이전 값과 비교하여 실제 변경 여부 확인 (불필요한 리렌더링 방지)
            const prevRoomId = sessionStorage.getItem('current-room-id');
            const currentRoomId = currentRoom.roomId;
            
            if (prevRoomId !== currentRoomId) {
                console.log('현재 방 정보 업데이트:', currentRoomId, '(이전:', prevRoomId || '없음', ')');
                sessionStorage.setItem('current-room-id', currentRoomId);
                
                // 새로운 방에 입장했을 때만 리스너 설정 상태 업데이트
                if (!listenersSetupRef.current) {
                    listenersSetupRef.current = true;
                    console.log('리스너 설정 완료 플래그 설정');
                }
            } else {
                console.log('방 정보 업데이트 - 동일한 방:', currentRoomId);
            }
            
            // 방 정보가 변경되었을 때, 소켓 연결이 유지되는지 확인 (항상 수행)
            console.log('방 입장 후 소켓 상태 확인:', socket ? (socket.connected ? '연결됨' : '연결 끊김') : '소켓 없음');
            
            // 소켓 연결이 끊어진 경우 연결 복구 시도
            if (socket && !socket.connected) {
                console.log('방 입장 후 소켓 연결이 끊어짐, 복구 시도');
                
                // useSocketStore 접근
                if (useSocketStore.getState) {
                    const socketStore = useSocketStore.getState();
                    if (socketStore) {
                        socketStore.initializeSocket();
                    }
                }
            }
        } else {
            console.log('방 정보 없음');
            listenersSetupRef.current = false;
            sessionStorage.removeItem('current-room-id');
        }
    }, [currentRoom, socket]);

    // 메시지 처리 로직
    useEffect(() => {
        if (!socket) return;

        const handleMessage = (message) => {
            console.log("메시지 수신:", message);
            
            if (message.type === 'chat' && message.userId) {
                // messages 배열에 메시지 추가
                setMessages(prev => [...prev, message]);
                
                // 최근 메시지 업데이트
                setRecentMessages(prev => ({
                    ...prev,
                    [message.userId]: message.content
                }));

                // 5초 후 메시지 제거
                setTimeout(() => {
                    setRecentMessages(prev => {
                        const newMessages = { ...prev };
                        delete newMessages[message.userId];
                        return newMessages;
                    });
                }, 5000);
            }
        };

        socket.on('message', handleMessage);
        return () => socket.off('message', handleMessage);
    }, [socket]);

    // 메시지 감시 (정답 체크)
    useEffect(() => {
        // 게임 진행 중이 아니면 메시지 체크하지 않음
        if (gamePhase !== 'answering') {
            return;
        }

        if (!messages.length || !currentRoom || !currentSong) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        
        // 시스템 메시지 처리
        if (lastMessage.type === 'system' || lastMessage.type !== 'chat') {
            return;
        }
        
        // 현재 라운드에 이미 정답 처리가 되었는지 확인
        if (isProcessingAnswer || roundAnsweredRef.current[currentRound] || window.roundAnswered[currentRound]) {
            return;
        }
        
        // 정답 체크
        const isCorrect = checkAnswer(lastMessage.content, lastMessage.userId);
        
        // 정답 처리 로직
        if (isCorrect && currentRoom.hostId === currentUser.uid && !isProcessingAnswer && !roundAnsweredRef.current[currentRound]) {
            console.log("정답 처리 시작");
            // 정답 처리 중 상태로 설정
            setIsProcessingAnswer(true);
            
            // 현재 라운드 정답 처리 여부 기록
            roundAnsweredRef.current[currentRound] = true;
            window.roundAnswered[currentRound] = true;
            
            // 게임 상태를 대기 상태로 변경
            setGamePhase('waiting');
            window.gamePhaseState = 'waiting';
            
            // 현재 사용자 정보 가져오기
            const answerer = Array.from(currentRoom.users || []).find(u => u.userId === lastMessage.userId);
            const answererName = answerer?.name || '알 수 없음';
            
            // 소켓 연결 상태 확인
            if (socket && socket.connected) {
                // 서버에 정답 처리 이벤트 전송
                socket.emit('correctAnswer', {
                    roomId: currentRoom.roomId,
                    userId: lastMessage.userId,
                    userName: answererName,
                    songName: currentSong.name,
                    round: currentRound
                });
            } else {
                console.error('정답 처리 실패: 소켓 연결이 끊어짐');
                
                // 소켓 연결이 끊어진 경우에도 다음 라운드로 진행하도록 함
                const nextRound = currentRound + 1;
                setTimeout(() => {
                    setIsProcessingAnswer(false);
                    if (onRoundChange) {
                        onRoundChange(nextRound);
                    }
                }, 2000);
            }
        }
    }, [messages, currentSong, currentRoom, currentUser, socket, gamePhase, isProcessingAnswer, currentRound, onRoundChange]);

    // 메시지 위치 계산 함수
    const getMessagePosition = (userId) => {
        const leftParticipants = getLeftParticipants();
        const rightParticipants = getRightParticipants();
        
        // 왼쪽 참가자 목록에서 찾기
        const leftIndex = leftParticipants.findIndex(p => p.userId === userId);
        if (leftIndex !== -1) {
            return {
                top: `${(leftIndex * 100) + 35}px`,
                left: '100%', // 프로필 카드 오른쪽에 바로 붙임
                transform: 'translateX(10px)', // 약간의 간격을 줌
                position: 'absolute'
            };
        }
        
        // 오른쪽 참가자 목록에서 찾기
        const rightIndex = rightParticipants.findIndex(p => p.userId === userId);
        if (rightIndex !== -1) {
            return {
                top: `${(rightIndex * 100) + 35}px`,
                right: '100%', // 프로필 카드 왼쪽에 바로 붙임
                transform: 'translateX(-10px)', // 약간의 간격을 줌
                position: 'absolute'
            };
        }
        
        return null;
    };

    // 준비 상태 변경 처리
    const handleToggleReady = () => {
        if (mode === 'ready') {
            const newReadyState = !isReady;
            setIsReady(newReadyState);
            updateParticipantReady(currentUser.uid, newReadyState);
            onToggleReady();
        }
    };

    // 준비 버튼 내용
    const getReadyContent = () => {
        return (
            <div className="flex flex-col items-center justify-center">
                <button 
                    className={`flex flex-col items-center justify-center px-8 py-5 rounded-lg transition-all ${
                        isReady 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleReady();
                    }}
                >
                    <div className="text-6xl text-white mb-2">
                        {isReady ? '✅' : '🎮'}
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {isReady ? '준비 완료!' : '준비하기'}
                    </h2>
                </button>
                
                <button
                    style={{
                        marginTop: '20px',
                        padding: '4px 8px',
                        backgroundColor: 'red',
                        color: 'white',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#ef4444'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'red'}
                    onClick={() => {
                        // useSocketStore를 통해 현재 방 정보와 사용자 정보 가져오기
                        const { currentRoom, leaveRoom } = useSocketStore.getState();
                        
                        if (currentRoom && currentUser) {
                            console.log('방 나가기 버튼 클릭');
                            leaveRoom(currentRoom.roomId, currentUser.uid);
                            
                            // 페이지 새로고침
                            window.location.reload();
                        }
                    }}
                >
                    나가기
                </button>
            </div>
        );
    };

    // 노래 재생 함수
    const playSong = async () => {
        try {
            if (isPlayingRef.current) {
                return;
            }

            setGamePhase('playing');
            window.gamePhaseState = 'playing';
            
            if (!currentRoom) {
                console.log("[playSong] 현재 방 정보 없음");
                return;
            }

            // 방장인 경우에만 새로운 노래를 선택하고 다른 참가자들에게 전달
            if (currentRoom.hostId === currentUser.uid) {
                console.log("[playSong] 방장이 노래 선택 시작");
                const song = await getRandomSong();
                console.log("[playSong] Firebase에서 가져온 노래:", song);
                
                if (!song) {
                    throw new Error('응원가를 찾을 수 없습니다.');
                }
                
                // 선택된 노래를 모든 참가자에게 전달
                const songData = {
                    name: song.name,
                    id: song.id
                };
                console.log("[playSong] 참가자들에게 전송할 노래 데이터:", songData);
                
                socket.emit('newSong', { 
                    roomId: currentRoom.roomId, 
                    song: songData
                });
                setCurrentSong(song);
                await playSongAudio();
            } else {
                console.log("[playSong] 방장이 아님, 노래 선택 건너뜀");
            }
        } catch (error) {
            console.error('[playSong] 노래 선택 중 오류:', error);
            setIsPlaying(false);
            setGamePhase('answering');
            window.gamePhaseState = 'answering';
        }
    };

    // 오디오 재생 함수 (타이머만 실행)
    const playSongAudio = async () => {
        return new Promise((resolve) => {
            if (isPlayingRef.current) {
                resolve();
                return;
            }

            isPlayingRef.current = true;
            setIsPlaying(true);
            
            // 5초 후 다음 단계로 진행
            setTimeout(() => {
                setIsPlaying(false);
                setGamePhase('answering');
                window.gamePhaseState = 'answering';
                isPlayingRef.current = false;
                resolve();
            }, 5000);
        });
    };

    // 컴포넌트가 언마운트되거나 게임 상태가 변경될 때 정리
    useEffect(() => {
        return () => {
            if (audio) {
                audio.pause();
                audio.src = '';
                audio.load();
            }
            isPlayingRef.current = false;
        };
    }, []);

    // ref를 통해 외부에서 접근할 수 있는 메서드 정의
    useImperativeHandle(ref, () => ({
        handleCountdownEnd: async () => {
            try {
                console.log('handleCountdownEnd 함수 호출됨');
                
                if (!currentRoom) {
                    console.log('방 정보가 없어 처리 중단');
                    return;
                }
                
                // 게임 시작 시에만 상태 초기화 (첫 라운드일 때만)
                if (currentRound === 1) {
                    console.log('첫 라운드 시작, 게임 상태 초기화');
                    if (onGameOver) {
                        onGameOver(false, null);
                    }
                }
                
                // 현재 라운드 정답 처리 상태 초기화
                roundAnsweredRef.current[currentRound] = false;
                window.roundAnswered[currentRound] = false;
                setIsProcessingAnswer(false);
                
                console.log(`라운드 ${currentRound} 카운트다운 종료, 정답 처리 상태 초기화: `, 
                    { roundAnswered: roundAnsweredRef.current[currentRound] });
                
                // 5라운드(totalRounds + 1)에서는 노래를 재생하지 않음
                if (currentRound > totalRounds + 1) {
                    console.log('최대 라운드 초과, 노래 재생 중단');
                    return;
                }
                
                // 현재 게임 상태 확인 (window 객체에 저장된 값도 확인)
                const currentGamePhase = window.gamePhaseState || gamePhase;
                console.log('현재 게임 상태:', { gamePhase, windowGamePhase: currentGamePhase });
                
                // 다음 곡 재생 시작
                console.log(`라운드 ${currentRound}: 노래 재생 시작`);
                window.gamePhaseState = 'playing';
                setGamePhase('playing');
                await playSong();
            } catch (error) {
                console.error('handleCountdownEnd 함수 실행 중 오류:', error);
                setGamePhase('waiting');
                window.gamePhaseState = 'waiting';
            }
        }
    }));

    // 우승자를 찾고 게임 종료 처리하는 함수
    const findWinnerAndEndGame = () => {
        // 모든 참가자 가져오기
        const allParticipants = [...getLeftParticipants(), ...getRightParticipants()];
        console.log('게임 종료 처리 시작: 모든 참가자', allParticipants);
        
        // 점수가 가장 높은 참가자 찾기
        if (allParticipants.length > 0) {
            const winnerParticipant = allParticipants.reduce((prev, current) => 
                (prev.score > current.score) ? prev : current
            );
            
            console.log('게임 종료: 우승자 정보', winnerParticipant);
            
            // 부모 컴포넌트에 게임 종료 상태 전달
            if (onGameOver) {
                console.log('onGameOver 호출', { isOver: true, winner: winnerParticipant });
                onGameOver(true, winnerParticipant);
            }
            
            // 게임 종료 이벤트 서버에 전송
            if (socket && currentRoom) {
                console.log('gameEnd 이벤트 전송', { roomId: currentRoom.roomId, winner: winnerParticipant });
                socket.emit('gameEnd', {
                    roomId: currentRoom.roomId,
                    winner: winnerParticipant
                });
            }
        } else {
            console.log('게임 종료: 참가자가 없습니다.');
        }
    };

    return (
        <div className="relative w-full h-full">
            <div className="flex h-full w-full">
                <div className="relative w-1/5">
                    <ProfileGrid side="left" />
                    <div className="absolute top-0 left-full h-full flex flex-col items-start" style={{ width: '200px' }}>
                        {getLeftParticipants().map((participant, index) => (
                            <div key={participant.userId} className="relative" style={{ top: `${index * 100 + 35}px`, position: 'absolute', left: '10px' }}>
                                <MessageBubble 
                                    message={recentMessages[participant.userId]} 
                                    direction="right"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-3/5 flex items-center">
                    {/* 게임 모드에 따라 다른 내용 표시 */}
                    <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{
                            backgroundImage: mode === 'play' ? "url('/images/background.jpg')" : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            minHeight: '300px',
                            backgroundColor: 'transparent',
                            position: 'relative'
                        }}
                    >
                        {mode === 'ready' && getReadyContent()}
                    </div>
                </div>

                <div className="relative w-1/5">
                    <ProfileGrid side="right" />
                    <div className="absolute top-0 right-full h-full flex flex-col items-end" style={{ width: '200px' }}>
                        {getRightParticipants().map((participant, index) => (
                            <div key={participant.userId} className="relative" style={{ top: `${index * 100 + 35}px`, position: 'absolute', right: '10px' }}>
                                <MessageBubble 
                                    message={recentMessages[participant.userId]} 
                                    direction="left"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}); 