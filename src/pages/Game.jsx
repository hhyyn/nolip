import { useState, useEffect, useRef } from "react";
import { GameInstructions } from "../components/game/ui/GameInstructions";
import { GameField } from "../components/game/field/GameField";
import { GameInput } from "../components/game/ui/GameInput";
import GameMake from "../components/game/room/GameMake";
import { SocketProvider } from "../components/game/SocketProvider";
import useAuthStore from "../store/authStore";
import useGameStore from "../store/gameStore";
import useSocketStore from "../store/socketStore";
import { useNavigate, useLocation } from "react-router-dom";
import { updateUserScore } from "../lib/firebase";

export default function Game() {
    const [gameState, setGameState] = useState("make");
    const [currentRound, setCurrentRound] = useState(1);
    const [totalRounds] = useState(4);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const { user } = useAuthStore();
    const { addParticipant, clearParticipants } = useGameStore();
    const { createRoom, joinRoom, toggleReady, currentRoom, leaveRoom } = useSocketStore();
    const navigate = useNavigate();
    const location = useLocation();
    const gameFieldRef = useRef();

    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, [user, navigate]);

    useEffect(() => {
        clearParticipants();
    }, [currentRoom?.roomId]);

    useEffect(() => {
        if (currentRoom?.users) {
            currentRoom.users.forEach((participant) => {
                try {
                    addParticipant({
                        userId: participant.userId,
                        name: participant.name,
                        profileIconNumber: participant.profileIconNumber,
                        score: participant.score || 0,
                        isReady: participant.isReady || false,
                    });
                } catch (error) {
                    console.error("참가자 추가 오류:", error);
                }
            });
        }
    }, [currentRoom?.users]);

    useEffect(() => {
        if (currentRoom?.gameStarted) {
            localStorage.removeItem("gameStarted");
            setGameState("play");
            setCurrentRound(1);
            setGameOver(false);
            setWinner(null);
        }
    }, [currentRoom?.gameStarted]);

    useEffect(() => {
        const { socket } = useSocketStore.getState();
        if (!socket) return;

        const handleGameStart = (data) => {
            localStorage.removeItem("gameStarted");
            setGameState("play");
            setCurrentRound(data.currentRound || 1);
            setGameOver(false);
            setWinner(null);
        };

        const handleCorrectAnswer = (data) => {
            window.dispatchEvent(new Event("correctAnswer"));

            if (
                currentRound >= totalRounds + 1 ||
                data.round >= totalRounds + 1
            ) {
                const allParticipants = [
                    ...useGameStore.getState().getLeftParticipants(),
                    ...useGameStore.getState().getRightParticipants(),
                ];
                if (allParticipants.length > 0) {
                    const winnerParticipant = allParticipants.reduce(
                        (prev, current) =>
                            prev.score > current.score ? prev : current
                    );
                    handleGameOver(true, winnerParticipant);
                }
            }
        };

        const handleGameEnd = (data) => {
            if (data.winner) {
                setGameOver(true);
                setWinner(data.winner);

                localStorage.setItem("gameEnded", "true");
                localStorage.setItem("winner", JSON.stringify(data.winner));

                setTimeout(() => {
                    setGameState("make");
                    setCurrentRound(1);
                    setGameOver(false);
                    setWinner(null);

                    localStorage.removeItem("gameEnded");
                    localStorage.removeItem("winner");
                }, 5000);
            }
        };

        socket.on("gameStart", handleGameStart);
        socket.on("correctAnswer", handleCorrectAnswer);
        socket.on("gameEnd", handleGameEnd);

        return () => {
            socket.off("gameStart", handleGameStart);
            socket.off("correctAnswer", handleCorrectAnswer);
            socket.off("gameEnd", handleGameEnd);
        };
    }, []);

    useEffect(() => {
        return () => {
            console.log('Game 컴포넌트 언마운트 - 방 정보 유지');
        };
    }, []);

    const handleRoundChange = (round) => {
        if (round > totalRounds + 1) {
            const allParticipants = [
                ...useGameStore.getState().getLeftParticipants(),
                ...useGameStore.getState().getRightParticipants(),
            ];
            if (allParticipants.length > 0) {
                const winnerParticipant = allParticipants.reduce(
                    (prev, current) =>
                        prev.score > current.score ? prev : current
                );
                handleGameOver(true, winnerParticipant);
            }
            return;
        }

        setCurrentRound(round);
    };

    const handleGameOver = (isOver, winnerData) => {
        setGameOver(isOver);
        setWinner(winnerData);

        if (isOver && winnerData && currentRoom) {
            if (currentRoom.users) {
                currentRoom.users.forEach(async (participant) => {
                    try {
                        await updateUserScore(participant.userId, participant.score || 0);
                    } catch (error) {
                    }
                });
            }

            setTimeout(() => {
                setGameState("make");
                setCurrentRound(1);
                setGameOver(false);
                setWinner(null);
            }, 5000);
        }
    };

    const handleCreateGame = () => {
        if (user) {
            const userData = {
                userId: user.uid,
                name: user.name,
                profileIconNumber: user.profileIconNumber,
            };
            
            // 방 생성 전 소켓 연결 상태 확인 로그
            const { socket } = useSocketStore.getState();
            console.log('방 생성 전 소켓 연결 상태:', socket ? (socket.connected ? '연결됨' : '연결 끊김') : '소켓 없음');
            
            // 상태 변경을 먼저 하고 약간의 지연 후 방 생성 요청
            setGameState("ready");
            
            // 조금 지연시켜 UI 렌더링 이후에 방 생성 요청
            setTimeout(() => {
                createRoom(userData);
            }, 100);
        }
    };

    const handleJoinGame = (roomId) => {
        if (user && roomId) {
            const userData = {
                userId: user.uid,
                name: user.name,
                profileIconNumber: user.profileIconNumber,
            };
            
            // 방 참가 전 소켓 연결 상태 확인 로그
            const { socket } = useSocketStore.getState();
            console.log('방 참가 전 소켓 연결 상태:', socket ? (socket.connected ? '연결됨' : '연결 끊김') : '소켓 없음');
            
            // 상태 변경을 먼저 하고 약간의 지연 후 방 참가 요청
            setGameState("ready");
            
            // 조금 지연시켜 UI 렌더링 이후에 방 참가 요청
            setTimeout(() => {
                joinRoom(roomId, userData);
            }, 100);
        }
    };

    const handleToggleReady = () => {
        if (user) {
            toggleReady(user.uid);
        }
    };

    const handleLeaveRoom = () => {
        if (currentRoom && user) {
            console.log('사용자가 방 나가기 버튼 클릭:', currentRoom.roomId);
            leaveRoom(currentRoom.roomId, user.uid);
            setGameState("make");
        }
    };

    if (!user) {
        return null;
    }

    return (
        <SocketProvider>
            <div className="flex flex-col flex-1 pb-5 px-5">
                {gameState === "make" ? (
                    <GameMake
                        onCreateGame={handleCreateGame}
                        onJoinGame={handleJoinGame}
                    />
                ) : (
                    <>
                        <GameInstructions
                            mode={gameState}
                            onCountdownEnd={() => {
                                if (gameFieldRef.current) {
                                    gameFieldRef.current.handleCountdownEnd();
                                }
                            }}
                            currentRound={currentRound}
                            totalRounds={totalRounds}
                            gameOver={gameOver}
                            winner={winner}
                            onRoundChange={handleRoundChange}
                            onLeaveRoom={handleLeaveRoom}
                        />
                        <GameField
                            ref={gameFieldRef}
                            mode={gameState}
                            onToggleReady={handleToggleReady}
                            currentUser={user}
                            onRoundChange={handleRoundChange}
                            onGameOver={handleGameOver}
                            currentRound={currentRound}
                            totalRounds={totalRounds}
                        />
                        <GameInput />
                    </>
                )}
            </div>
        </SocketProvider>
    );
}
