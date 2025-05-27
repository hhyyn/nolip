import { ProfileCard } from './ProfileCard';
import useGameStore from '../../../store/gameStore';

export const ProfileGrid = ({ side = "left" }) => {
    const { getLeftParticipants, getRightParticipants } = useGameStore();

    // 해당 방향의 참가자 가져오기
    const participants =
        side === "left" ? getLeftParticipants() : getRightParticipants();

    // 4개의 슬롯 준비 (0-3 또는 4-7)
    const slots = Array(4)
        .fill(null)
        .map((_, index) => {
            const position = side === "left" ? index : index + 4;
            return participants.find((p) => p.position === position) || null;
        });

    return (
        <div className="flex flex-col h-full w-full">
            {slots.map((participant, index) => (
                <div key={`${side}-${index}`} className="flex flex-1 w-full">
                    <ProfileCard
                        participant={participant}
                    />
                </div>
            ))}
        </div>
    );
};
