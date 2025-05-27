import { Input, Button } from 'pixel-retroui';
import { useState, useEffect } from 'react';
import useAuthStore from '../../../store/authStore';
import useSocketStore from '../../../store/socketStore';

export const GameInput = () => {
    const [inputValue, setInputValue] = useState("");
    const { user } = useAuthStore();
    const { sendMessage, currentRoom } = useSocketStore();

    const handleSubmit = () => {
        if (!inputValue.trim() || !user) return;
        
        console.log('메시지 전송 시도:', {
            userId: user.uid,
            message: inputValue.trim(),
            hasRoom: !!currentRoom
        });
        
        try {
            // 메시지 전송
            sendMessage(user.uid, inputValue.trim());
            
            // 입력 필드 초기화
            setInputValue('');
        } catch (error) {
            console.error('메시지 전송 중 오류:', error);
        }
    };

    // 디버깅용: 현재 방 정보 로깅
    useEffect(() => {
        console.log('현재 방 정보:', currentRoom);
    }, [currentRoom]);

    return (
        <div className="flex gap-1 w-full justify-between">
            <Input
                bg="white"
                textColor="black"
                borderColor="black"
                placeholder="채팅 메시지를 입력하세요 (Enter 키로 전송)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full text-lg"
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
            />
            <Button
                bg="white"
                textColor="black"
                borderColor="black"
                shadow="black"
                className="whitespace-nowrap"
                onClick={handleSubmit}
            >
                전송
            </Button>
        </div>
    );
};
