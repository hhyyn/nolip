import { create } from 'zustand';

const MAX_PARTICIPANTS = 8;
const MESSAGE_TIMEOUT = 5000; // 5초

const useGameStore = create((set, get) => ({
    participants: [], // [{userId, name, profileIconNumber, score, position}, ...]
    messages: {}, // {userId: {message: string, timeoutId: number}}
    
    // 참가자 추가
    addParticipant: (participant) => {
        set((state) => {
            if (state.participants.length >= MAX_PARTICIPANTS) {
                throw new Error('더 이상 참가할 수 없습니다. (최대 8명)');
            }
            if (state.participants.some(p => p.userId === participant.userId)) {
                throw new Error('이미 참가 중인 사용자입니다.');
            }

            const participantCount = state.participants.length;
            const isEven = participantCount % 2 === 0;
            const usedPositions = state.participants.map(p => p.position);
            
            let newPosition;
            if (isEven) {
                newPosition = [0, 1, 2, 3].find(pos => !usedPositions.includes(pos));
            } else {
                newPosition = [4, 5, 6, 7].find(pos => !usedPositions.includes(pos));
            }

            if (newPosition === undefined) {
                newPosition = [...Array(8).keys()]
                    .filter(pos => !usedPositions.includes(pos))[0];
            }

            return { 
                participants: [...state.participants, { ...participant, position: newPosition }]
                    .sort((a, b) => a.position - b.position)
            };
        });
    },

    // 참가자 제거
    removeParticipant: (userId) => 
        set((state) => ({
            participants: state.participants.filter(p => p.userId !== userId)
        })),

    // 참가자 위치 변경
    updateParticipantPosition: (userId, newPosition) =>
        set((state) => {
            const participant = state.participants.find(p => p.userId === userId);
            if (!participant || state.participants.some(p => p.position === newPosition && p.userId !== userId)) {
                return state;
            }

            return { 
                participants: state.participants
                    .map(p => p.userId === userId ? { ...p, position: newPosition } : p)
                    .sort((a, b) => a.position - b.position)
            };
        }),

    // 참가자 목록 초기화
    clearParticipants: () => set({ participants: [] }),

    // 참가자 점수 업데이트
    updateParticipantScore: (userId, newScore) => 
        set((state) => ({
            participants: state.participants.map(p => 
                p.userId === userId ? { ...p, score: newScore } : p
            )
        })),

    // 현재 참가자 수 확인
    getParticipantCount: () => get().participants.length,

    // 참가 가능 여부 확인
    canJoin: () => get().participants.length < MAX_PARTICIPANTS,

    // 왼쪽 참가자 목록 가져오기 (0-3번 위치)
    getLeftParticipants: () => get().participants
        .filter(p => p.position < 4)
        .sort((a, b) => a.position - b.position),

    // 오른쪽 참가자 목록 가져오기 (4-7번 위치)
    getRightParticipants: () => get().participants
        .filter(p => p.position >= 4)
        .sort((a, b) => a.position - b.position),

    // 참가자 준비 상태 업데이트
    updateParticipantReady: (userId, isReady) => 
        set((state) => ({
            participants: state.participants.map(p => 
                p.userId === userId ? { ...p, isReady } : p
            )
        })),

    // 모든 참가자가 준비되었는지 확인
    areAllParticipantsReady: () => {
        const { participants } = get();
        return participants.length > 0 && participants.every(p => p.isReady);
    },

    // 사용자 메시지 설정
    setUserMessage: (userId, message) => {
        const state = get();
        // 이전 타임아웃이 있다면 제거
        if (state.messages[userId]?.timeoutId) {
            clearTimeout(state.messages[userId].timeoutId);
        }

        // 새 타임아웃 설정
        const timeoutId = setTimeout(() => {
            set((state) => ({
                messages: {
                    ...state.messages,
                    [userId]: null
                }
            }));
        }, MESSAGE_TIMEOUT);

        // 메시지 설정
        set((state) => ({
            messages: {
                ...state.messages,
                [userId]: {
                    message,
                    timeoutId
                }
            }
        }));
    },

    // 사용자 메시지 가져오기
    getUserMessage: (userId) => get().messages[userId]?.message || null,
}));

export default useGameStore; 