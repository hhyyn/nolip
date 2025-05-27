import { Card, Input, Button } from "pixel-retroui";
import { useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuthStore from "../store/authStore";

// 커스텀 이벤트 생성
const LOGIN_STATUS_CHANGED = "loginStatusChanged";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login, user, isLoading } = useAuthStore();
    const [error, setError] = useState("");

    // 이미 로그인된 사용자는 게임 페이지로 리다이렉션
    if (user && !isLoading) {
        return <Navigate to="/" replace />;
    }

    const handleLogin = async (e) => {
        if (e) e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

        try {
            setError("");
            const userData = await login(email, password);

            // 로그인 성공 시 이벤트 발생
            window.dispatchEvent(
                new CustomEvent(LOGIN_STATUS_CHANGED, { detail: userData })
            );

            alert(`${userData.name}님 안녕하세요!`);
            navigate("/");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center py-5">
            <Card
                bg="#f6c7ce"
                textColor="white"
                borderColor="white"
                shadowColor="white"
                className="flex h-full"
                style={{ 
                    padding: 30,
                    width: 'min(100%, 350px)'
                }}
            >
                <form onSubmit={handleLogin} className="flex flex-col justify-between item-center w-full h-full py-15">
                    <h1 className="text-black font-bold text-center" style={{ fontSize: '1.5rem' }}>로그인</h1>
                    {error && (
                        <div className="text-red-500 text-center text-sm">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col w-full">
                        <div className="flex flex-col w-full px-2">
                            <Input
                                bg="white"
                                textColor="black"
                                borderColor="black"
                                shadowColor="black"
                                placeholder="이메일"
                                className="text-base"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Input
                                bg="white"
                                textColor="black"
                                borderColor="black"
                                shadowColor="black"
                                type="password"
                                placeholder="비밀번호"
                                className="text-base"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button
                            type="submit"
                            bg="#87212e"
                            textColor="white"
                            borderColor="black"
                            shadowColor="black"
                            className="py-2 font-bold"
                        >
                            로그인
                        </Button>
                    </div>
                    <div className="flex flex-col gap-0">
                        
                        <Button
                            type="button"
                            bg="white"
                            textColor="black"
                            borderColor="black"
                            shadowColor="black"
                            className="py-2"
                            onClick={() => navigate("/signup")}
                        >
                            회원가입
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
