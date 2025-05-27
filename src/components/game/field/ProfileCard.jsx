import { Card } from 'pixel-retroui';
import useAuthStore from '../../../store/authStore';
import useSocketStore from '../../../store/socketStore';

export const ProfileCard = ({ participant }) => {
    const { user } = useAuthStore();
    const { currentRoom } = useSocketStore();
 
    // participant가 없는 경우 빈 카드 표시
    if (!participant) {
        return (
            <Card
                bg="gray"
                textColor="black"
                borderColor="black"
                shadowColor="black"
                className="flex-1 w-full opacity-50"
            />
        );
    }

    // 현재 사용자의 카드인 경우 강조 표시
    const isCurrentUser = user?.uid === participant.userId;
    
    // 게임 시작 여부 확인
    const gameStarted = currentRoom?.gameStarted || false;
    
    // 준비 상태에 따라 배경색 결정 (게임 시작 전에만 적용)
    const bgColor = !gameStarted && participant.isReady ? "#fef08a" : "white"; // #fef08a는 tailwind의 yellow-200 색상

    return (
        <Card
            bg={bgColor}
            textColor="black"
            borderColor="black"
            shadowColor="black"
            className="flex-1 w-full"
        >
            <div className="flex items-center h-full">
                <div className="flex-shrink-0 h-full aspect-square p-1">
                    <img
                        src={`/img/profile-img/${participant.profileIconNumber}.gif`}
                        className="w-full h-full object-cover"
                        alt="프로필"
                    />
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0 px-2">
                    <span className="text-base font-medium truncate">{participant.name}</span>
                    <div className="flex justify-between text-sm">
                        <span>점수</span>
                        <span>{participant.score}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};
