import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "pixel-retroui";
import { useEffect, useState } from "react";
import useAuthStore from "../store/authStore";
import useSocketStore from "../store/socketStore";
import { motion } from "framer-motion";

// 커스텀 이벤트 이름 정의
const LOGIN_STATUS_CHANGED = "loginStatusChanged";
const CORRECT_ANSWER = "correctAnswer";

export default function RootLayout() {
    const { user, isLoading, checkAuth, logout } = useAuthStore();
    const { currentRoom, leaveRoom } = useSocketStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCorrect, setIsCorrect] = useState(false);

    useEffect(() => {
        checkAuth();

        // 정답 이벤트 리스너 추가
        const handleCorrectAnswer = () => {
            setIsCorrect(true);
            setTimeout(() => setIsCorrect(false), 1500); // 1.5초 후 원래대로
        };

        window.addEventListener(CORRECT_ANSWER, handleCorrectAnswer);
        return () =>
            window.removeEventListener(CORRECT_ANSWER, handleCorrectAnswer);
    }, [checkAuth]);

    const handleLogout = async () => {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            await logout();
            navigate("/login");
        }
    };

    const handleLogoClick = () => {
        // 현재 게임 플레이 중이라면 방을 나가고 게임 화면으로 리다이렉션
        if (currentRoom) {
            if (window.confirm("현재 게임을 종료하고 메인 화면으로 돌아가시겠습니까?")) {
                leaveRoom(currentRoom.roomId, user?.uid);
                // 게임 화면으로 리다이렉션 (새로고침)
                window.location.href = "/";
            }
        } else {
            // 이미 게임 화면에 있으면 그냥 새로고침
            window.location.href = "/";
        }
    };

    return (
        <motion.div     
            className="font-dunggeunmo h-screen overflow-hidden flex flex-col relative"
            animate={{ 
                backgroundColor: isCorrect ? '#4ade80' : '#87212e'
            }}
            transition={{ duration: 0.3 }}
        >
            <div className="h-32 flex justify-between items-center px-4 bg-transparent py-5">
                <div className="flex-1"></div>
                <div 
                    className="flex justify-center cursor-pointer"
                    onClick={handleLogoClick}
                >
                    <img
                        src="/logo.png"
                        alt="logo"
                        className="max-h-24 object-contain hover:opacity-80 transition-opacity"
                    />
                </div>
                <div className="flex gap-2 flex-1 justify-end">
                    {isLoading ? (
                        <div className="w-8 h-8 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        </div>
                    ) : user ? (
                        <div
                            className="flex items-center gap-2 ml-2 cursor-pointer hover:opacity-80"
                            onClick={handleLogout}
                            title="클릭하여 로그아웃"
                        >
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                                <img
                                    src={`/img/profile-img/${user.profileIconNumber}.gif`}
                                    alt="프로필"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="text-base text-white">
                                {user.name}님
                            </span>
                            <span className="text-base text-white">
                                ({user.score || 0}점)
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
            <Outlet />
        </motion.div>
    );
}
