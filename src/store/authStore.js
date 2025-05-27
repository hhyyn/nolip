import { create } from 'zustand';
import { getCurrentUser, loginUser as dummyLoginUser, logoutUser as dummyLogout } from '../lib/firebase';

// localStorage에서 사용자 정보 가져오기
const getStoredUser = () => {
    try {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
};

const setStoredUser = (userData) => {
    if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
    } else {
        localStorage.removeItem('user');
    }
};

// 더미 인증 상태 감지 함수 (Firebase 대신 사용)
const checkDummyAuth = async (set) => {
    try {
        const userData = await getCurrentUser();
        setStoredUser(userData);
        set({ user: userData, isLoading: false });
    } catch {
        setStoredUser(null);
        set({ user: null, isLoading: false });
    }
};

const useAuthStore = create((set) => {
    // 초기 더미 인증 상태 확인
    checkDummyAuth(set);
    
    return {
        user: getStoredUser(),
        isLoading: true, // 초기 상태는 로딩 중
        error: null,

        // 현재 사용자 상태 확인
        checkAuth: async () => {
            set({ isLoading: true, error: null });
            await checkDummyAuth(set);
        },

        // 로그인
        login: async (email, password) => {
            set({ isLoading: true, error: null });
            try {
                const userData = await dummyLoginUser(email, password);
                setStoredUser(userData);
                set({ user: userData, isLoading: false });
                return userData;
            } catch (error) {
                setStoredUser(null);
                set({ error: error.message, isLoading: false, user: null });
                throw error;
            }
        },

        // 로그아웃
        logout: async () => {
            set({ isLoading: true });
            try {
                await dummyLogout();
                setStoredUser(null);
                set({ user: null, error: null, isLoading: false });
            } catch (error) {
                console.error("Logout error:", error);
                set({ error: error.message, isLoading: false });
                throw error;
            }
        },

        // 사용자 정보 업데이트
        updateUser: (userData) => {
            setStoredUser(userData);
            set({ user: userData });
        },
    };
});

export default useAuthStore; 