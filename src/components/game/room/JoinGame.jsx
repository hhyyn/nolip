import { useState } from 'react';
import { Button, Input, Card } from 'pixel-retroui';

export default function JoinGame({ onJoinGame }) {
    const [gameCode, setGameCode] = useState('');

    const handleJoinGame = () => {
        if (gameCode.trim()) {
            onJoinGame(gameCode);
        }
    };

    return (
        <Card
            bg="#f6c7ce"
            textColor="black"
            borderColor="white"
            shadowcolor="white"
            className="flex-1 py-8 h-full"
        >
            <div className="flex flex-col items-center h-full justify-between py-15">
                <div className="text-6xl">🎯</div>
                <h2 className="text-2xl font-bold whitespace-nowrap">게임 참여하기</h2>
                <p className="text-gray-600 text-center whitespace-nowrap">
                    친구가 만든 게임에<br />
                    참여해보세요!
                </p>
                <div className="flex gap-2 w-full mt-10 px-7">
                    <Input
                        bg="white"
                        textColor="black"
                        borderColor="black"
                        shadowcolor="black"
                        placeholder="게임 코드 입력"
                        value={gameCode}
                        onChange={(e) => setGameCode(e.target.value)}
                        className="w-full text-center h-10"
                    />
                    <Button
                        bg="white"
                        textColor="black"
                        borderColor="black"
                        shadowcolor="black"
                        onClick={handleJoinGame}
                        className="whitespace-nowrap h-10"
                    >
                        입장
                    </Button>
                </div>
            </div>
        </Card>
    );
} 