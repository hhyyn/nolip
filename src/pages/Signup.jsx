import { Card, Input, Button } from 'pixel-retroui';
import { useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from "../store/authStore";
import { 
    registerUser, 
    validateEmail, 
    validatePassword, 
    validateName, 
    validateProfileIcon,
    checkEmailExists 
} from '../lib/firebase';

export default function SignUp() {
    const navigate = useNavigate();
    const { user, isLoading } = useAuthStore();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        profileIconNumber: null
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 이미 로그인된 사용자는 게임 페이지로 리다이렉션
    if (user && !isLoading) {
        return <Navigate to="/" replace />;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const validateForm = async () => {
        const { email, password, name, profileIconNumber } = formData;

        if (!validateEmail(email)) {
            setError('이메일은 영문자와 숫자만 사용 가능하며, @를 포함해야 합니다.');
            return false;
        }

        if (!validatePassword(password)) {
            setError('비밀번호는 영문자와 숫자만 사용 가능합니다.');
            return false;
        }

        if (!validateName(name)) {
            setError('이름은 8글자 이내여야 합니다.');
            return false;
        }

        if (!validateProfileIcon(profileIconNumber)) {
            setError('프로필 아이콘을 선택해주세요.');
            return false;
        }

        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            setError('이미 사용 중인 이메일입니다.');
            return false;
        }

        return true;
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        try {
            setIsSubmitting(true);
            setError('');

            const isValid = await validateForm();
            if (!isValid) {
                setIsSubmitting(false);
                return;
            }

            const { email, password, name, profileIconNumber } = formData;
            await registerUser(email, password, name, profileIconNumber, []);
            
            alert('회원가입이 완료되었습니다!');
            navigate('/login');
        } catch (error) {
            console.error('회원가입 에러:', error);
            setError(error.message || '회원가입 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
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
                <div className="flex flex-col justify-between item-center w-full h-full">
                    <h1 className="text-black font-bold text-center" style={{ fontSize: '1.5rem' }}>회원가입</h1>
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
                                name="name"
                                placeholder="이름"
                                className="text-base"
                                value={formData.name}
                                onChange={handleChange}
                                maxLength={8}
                                required
                                disabled={isSubmitting}
                            />
                            <Input
                                bg="white"
                                textColor="black"
                                borderColor="black"
                                shadowColor="black"
                                name="email"
                                type="email"
                                placeholder="이메일"
                                className="text-base"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={isSubmitting}
                            />
                            <Input
                                bg="white"
                                textColor="black"
                                borderColor="black"
                                shadowColor="black"
                                name="password"
                                type="password"
                                placeholder="비밀번호"
                                className="text-base"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-base text-black">프로필 아이콘 선택</label>
                        <div className="grid grid-cols-6 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                <div 
                                    key={num} 
                                    className={`aspect-square rounded-full border-2 cursor-pointer overflow-hidden ${
                                        formData.profileIconNumber === num 
                                        ? 'bg-[#87212e] border-blue-500' 
                                        : 'bg-transparent border-black hover:border-blue-500'
                                    }`}
                                    onClick={() => setFormData(prev => ({ ...prev, profileIconNumber: num }))}
                                >
                                    <img 
                                        src={`/img/profile-img/${num}.gif`}
                                        alt={`프로필 ${num}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-0">
                        <Button
                            bg="#87212e"
                            textColor="white"
                            borderColor="black"
                            shadowColor="black"
                            className="py-2 font-bold"
                            onClick={handleSignUp}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '처리중...' : '가입하기'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
} 