import { Button, Card } from 'pixel-retroui';

export default function CreateGame({ onCreateGame }) {
    return (
        <Card
            bg="#f6c7ce"
            textColor="black"
            borderColor="white"
            shadowcolor="white"
            className="flex-1 py-8 h-full"
        >
            <div className="flex flex-col items-center h-full justify-between py-15">
                <div className="text-6xl">🎮</div>
                <h2 className="text-2xl font-bold whitespace-nowrap">새로운 게임 만들기</h2>
                <p className="text-gray-600 text-center whitespace-nowrap">
                    새로운 게임을 만들고<br />
                    친구들을 초대해보세요!
                </p>
                <div className="flex w-full mt-10 px-7">
                    <Button
                        bg="white"
                        textColor="black"
                        borderColor="black"
                        shadowcolor="black"
                        onClick={onCreateGame}
                        className="w-full h-10"
                    >
                        방 만들기
                    </Button>
                </div>
            </div>
        </Card>
    );
} 