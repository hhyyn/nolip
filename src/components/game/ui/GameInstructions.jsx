import { Card, Button } from "pixel-retroui";
import { useState, useEffect, useRef } from "react";
import useSocketStore from "../../../store/socketStore";
import { useNavigate } from "react-router-dom";

export const GameInstructions = ({
    mode,
    onCountdownEnd,
    currentRound,
    totalRounds,
    gameOver,
    winner,
    onRoundChange,
    onLeaveRoom
}) => {
    const { currentRoom } = useSocketStore();
    const [countdown, setCountdown] = useState(null);
    const [message, setMessage] = useState("");
    const countdownStartedRef = useRef(false);
    const timersRef = useRef([]);
    const firstStartRef = useRef(true);
    const needsRoundIncrementRef = useRef(false);
    const navigate = useNavigate();

    // mode�? �?경될 ?마다 카운?? ?초기?
    useEffect(() => {
        if (mode === "play") {
            if (firstStartRef.current) {
                firstStartRef.current = false;
                countdownStartedRef.current = false;
                needsRoundIncrementRef.current = false;
                setCountdown(null);
                setMessage("");

                // ? ? ?카운? ?초기?
                setTimeout(() => {
                    startCountdown();
                }, 500);
            }
        }
    }, [mode]);

    // 컴포? ?마운? ??? ?머?? ??
    useEffect(() => {
        return () => {
            if (timersRef.current.length > 0) {
                timersRef.current.forEach((timer) => clearTimeout(timer));
                timersRef.current = [];
            }
        };
    }, []);

    // 카운? ? ?카운?
    const startCountdown = () => {
        if (mode !== "play" || countdownStartedRef.current) {
            return;
        }

        countdownStartedRef.current = true;

        // ?? 맞춤 ? ?? 카운??? ?? ? ??? 증??
        // 6???? ?? 게임 종료
        if (needsRoundIncrementRef.current && onRoundChange) {
            const nextRound = currentRound + 1;

            if (nextRound > totalRounds + 1) {
                return;
            }

            onRoundChange(nextRound);
            needsRoundIncrementRef.current = false;
        }

        setCountdown(3);
        setMessage("");

        // 카운??? 2
        const timer1 = setTimeout(() => {
            setCountdown(2);
        }, 1000);
        timersRef.current.push(timer1);

        // 카운??? 1
        const timer2 = setTimeout(() => {
            setCountdown(1);
        }, 2000);
        timersRef.current.push(timer2);

        // 카운??? 종료
        const timer3 = setTimeout(() => {
            setMessage("");
            setCountdown(null);
            countdownStartedRef.current = false;
            if (onCountdownEnd) {
                onCountdownEnd();
            }
            // ????? 배열 초기?
            timersRef.current = [];
        }, 3000);
        timersRef.current.push(timer3);
    };

    // 정답 맞춤 이벤트 처리
    useEffect(() => {
        const { socket } = useSocketStore.getState();
        if (!socket) return;

        const handleCorrectAnswer = (data) => {
            // 정답 맞춤 메시지 설정
            if (data && data.userName) {
                setMessage(
                    `${data.userName}님이 정답을 맞추셨습니다!`
                );
            } else if (data && data.winner && data.winner.name) {
                setMessage(
                    `${data.winner.name}님이 우승하셨습니다! (5초 후 게임 선택 화면으로 돌아갑니다)`
                );
            } else {
                setMessage("정답을 맞추셨습니다!");
            }
            
            setCountdown(null);

            // 모든 타이머를 모두 제거
            if (timersRef.current.length > 0) {
                timersRef.current.forEach((timer) => clearTimeout(timer));
                timersRef.current = [];
            }

            // 다음 카운트다운에서 라운드 증가시킬 지 여부 설정
            needsRoundIncrementRef.current = true;

            // 6라운드에서 정답을 맞추면 게임 종료
            if (
                currentRound >= totalRounds + 1 ||
                (data && data.round >= totalRounds + 1)
            ) {
                // 5초 후 게임 목록 화면으로 리다이렉트
                const timer = setTimeout(() => {
                    navigate("/game");
                }, 5000);
                timersRef.current.push(timer);

                return;
            }

            // 정답 맞춤 후 5초 대기 후 다음 카운트다운 시작
            const timer = setTimeout(() => {
                countdownStartedRef.current = false;
                startCountdown();
            }, 5000);
            timersRef.current.push(timer);
        };

        socket.on("correctAnswer", handleCorrectAnswer);

        return () => {
            socket.off("correctAnswer", handleCorrectAnswer);
        };
    }, [mode, currentRound, totalRounds, navigate]);

    // 게임 종료 ?벤트 처리
    useEffect(() => {
        const { socket } = useSocketStore.getState();
        if (!socket) return;

        const handleGameEnd = (data) => {
            if (data.winner) {
                // 메시?? ???? ?? gameOver??? winner ??? ?? UI?? 직접 ??
                setCountdown(null);

                // ?? ????? 모두 ??
                if (timersRef.current.length > 0) {
                    timersRef.current.forEach((timer) => clearTimeout(timer));
                    timersRef.current = [];
                }

                // 5�? ?게임 ?면으? ????
                const timer = setTimeout(() => {
                    navigate("/game");
                }, 5000);
                timersRef.current.push(timer);
            }
        };

        socket.on("gameEnd", handleGameEnd);

        return () => {
            socket.off("gameEnd", handleGameEnd);
        };
    }, [navigate]);

    return (
        <Card
            bg="white"
            textColor="black"
            borderColor="black"
            shadowcolor="black"
            className="p-4 text-center"
            style={{ fontSize: "1.575rem" }}
        >
            {mode === "ready" ? (
                <div className="flex flex-col gap-2">
                    <div className="text-lg font-bold">
                        방 코드: {currentRoom?.roomId}
                    </div>
                    <div className="text-sm">
                        친구들과 함께 플레이하려면 방 코드를 공유하세요!
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    
                    {!gameOver && (
                        <div className="text-xl font-bold">
                            Round{" "}
                            {currentRound > totalRounds
                                ? totalRounds
                                : currentRound}{" "}
                            / {totalRounds + 1}
                        </div>
                    )}

                    {gameOver && winner ? (
                        <>
                            <div className="text-3xl font-bold">게임 종료</div>
                            <div className="text-2xl font-bold">
                                {winner.name}님이 우승하셨습니다!
                            </div>
                            <div className="text-xl">점수: {winner.score}</div>
                            <div className="text-lg mt-2">
                                5초 후에 자동으로 메인 화면으로 이동합니다.
                            </div>
                        </>
                    ) : (
                        <div className="text-2xl">
                            {countdown ? countdown : gameOver ? "🏆" : "🎵"}{" "}
                            {message}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};
