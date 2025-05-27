import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import RootLayout from "./layouts/RootLayout";
import Game from "./pages/Game";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import useAuthStore from "./store/authStore";
import useSocketStore from "./store/socketStore";
// Import other pages as needed

// 로그인 상태에 따른 보호 라우트 컴포넌트
function ProtectedRoute({ children }) {
    const { user, isLoading } = useAuthStore();
    
    // 로딩 중이면 로딩 표시
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-[#87212e]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
        </div>;
    }
    
    // 로그인되지 않았으면 로그인 페이지로 리다이렉트
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    // 로그인되었으면 자식 컴포넌트 렌더링
    return children;
}

function App() {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    const { initializeSocket, checkConnection, disconnect, error: socketError, clearError } = useSocketStore();

    useEffect(() => {
        checkAuth().then(() => {
            if (document.visibilityState === 'visible') {
                initializeSocket();
            }
        });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkConnection();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            disconnect?.();
        };
    }, [checkAuth, initializeSocket, checkConnection, disconnect]);

    return (
        <BrowserRouter>
            {socketError && (
                <div className="fixed top-0 left-0 right-0 bg-red-500 text-white py-2 px-4 text-center z-50 flex justify-between items-center">
                    <span>{socketError}</span>
                    <button 
                        className="text-white hover:text-gray-200 focus:outline-none"
                        onClick={() => {
                            clearError();
                            initializeSocket();
                        }}
                    >
                        재연결
                    </button>
                </div>
            )}
            <Routes>
                <Route element={<RootLayout />}>
                    {/* 인증이 필요한 라우트 */}
                    <Route 
                        path="/" 
                        element={
                            <ProtectedRoute>
                                <Game />
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* 인증이 필요없는 라우트 */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Route>
                
                {/* 기타 모든 라우트는 홈으로 리다이렉트 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
