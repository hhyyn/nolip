// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    where,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// 환경 변수 확인
const requiredEnvVars = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
];

// 환경 변수 누락 확인
const missingEnvVars = requiredEnvVars.filter(
    (varName) => !import.meta.env[varName]
);
if (missingEnvVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
}

// Firebase 설정
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Get all songs from Firestore
async function getAllSongs(collectionName = "cheerup-songs", userId = null) {
    try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);

        const songs = [];
        let userSongs = [];
        let userScore = 0;
        let isLoggedIn = false;

        if (userId) {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                userSongs = userDoc.data().songs || [];
                userScore = userDoc.data().score || 0;
                isLoggedIn = true;
            }
        }

        snapshot.forEach((doc) => {
            const songData = doc.data();
            const isOwned = isLoggedIn && userSongs.includes(doc.id);

            songs.push({
                id: doc.id,
                ...songData,
                isLocked: !isLoggedIn,
                isPurchased: isOwned,
                purchaseButtonText: isOwned ? "보유중" : "구매하기",
                price: 1,
                canPurchase: isLoggedIn && !isOwned && userScore >= 1,
            });
        });

        return songs;
    } catch (error) {
        throw error;
    }
}

// Get a single song by ID
async function getSongById(collectionName = "cheerup-songs", songId) {
    try {
        const docRef = doc(db, collectionName, songId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Song not found");
        }

        return {
            id: docSnap.id,
            ...docSnap.data(),
        };
    } catch (error) {
        throw error;
    }
}

// Get songs by name (case-insensitive partial match)
async function getSongsByName(collectionName, searchName) {
    try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);

        const songs = [];
        snapshot.forEach((doc) => {
            const songData = doc.data();
            if (songData.name.toLowerCase().includes(searchName.toLowerCase())) {
                songs.push({
                    id: doc.id,
                    ...songData,
                });
            }
        });

        return songs;
    } catch (error) {
        throw error;
    }
}

// Get exact song by name (case-insensitive)
async function getSongByName(collectionName, songName) {
    try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);

        for (const doc of snapshot.docs) {
            const songData = doc.data();
            if (songData.name.toLowerCase() === songName.toLowerCase()) {
                return {
                    id: doc.id,
                    ...songData,
                };
            }
        }

        throw new Error("Song not found");
    } catch (error) {
        throw error;
    }
}

// 이메일 유효성 검사
function validateEmail(email) {
    if (!email || typeof email !== "string") {
        throw new Error("이메일을 입력해주세요.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error("유효한 이메일 주소를 입력해주세요.");
    }
}

// 비밀번호 유효성 검사
function validatePassword(password) {
    if (!password || typeof password !== "string") {
        throw new Error("비밀번호를 입력해주세요.");
    }
    if (password.length < 6) {
        throw new Error("비밀번호는 최소 6자 이상이어야 합니다.");
    }
}

// 이름 유효성 검사
function validateName(name) {
    if (!name || typeof name !== "string") {
        throw new Error("이름을 입력해주세요.");
    }
}

// 프로필 아이콘 번호 유효성 검사
function validateProfileIcon(iconNumber) {
    if (typeof iconNumber !== "number" || iconNumber < 1 || iconNumber > 8) {
        throw new Error("프로필 아이콘 번호는 1부터 8 사이의 숫자여야 합니다.");
    }
}

// 이메일 중복 체크
async function checkEmailExists(email) {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

// 사용자 등록
async function registerUser(
    email,
    password,
    name,
    profileIconNumber,
    songs = []
) {
    try {
        validateEmail(email);
        validatePassword(password);
        validateName(name);
        validateProfileIcon(profileIconNumber);

        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            throw new Error("이미 사용 중인 이메일입니다.");
        }

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;
        await updateProfile(user, {
            displayName: name,
        });

        const userData = {
            uid: user.uid,
            email: user.email,
            name,
            profileIconNumber,
            songs,
            score: 0,
            createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", user.uid), userData);

        return userData;
    } catch (error) {
        throw error;
    }
}

// 사용자 로그인
async function loginUser(email, password) {
    try {
        validateEmail(email);
        validatePassword(password);

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (!userDoc.exists()) {
            throw new Error("사용자 정보를 찾을 수 없습니다.");
        }

        return {
            uid: userCredential.user.uid,
            ...userDoc.data(),
        };
    } catch (error) {
        throw error;
    }
}

// 현재 사용자 정보 가져오기
async function getCurrentUser() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        resolve({
                            uid: user.uid,
                            ...userDoc.data(),
                        });
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            } else {
                resolve(null);
            }
        }, reject);
    });
}

// User logout
async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
}

// Get current user profile from Firestore
async function getCurrentUserProfile() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            throw new Error("사용자 프로필을 찾을 수 없습니다.");
        }

        return userDoc.data();
    } catch (error) {
        throw error;
    }
}

// Update user profile
async function updateUserProfile(updates) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("로그인이 필요합니다.");
        }

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, updates);

        if (updates.displayName) {
            await updateProfile(user, {
                displayName: updates.displayName,
            });
        }

        return true;
    } catch (error) {
        throw error;
    }
}

// 사용자 ID로 사용자 정보 가져오기
async function getUserById(userId) {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            throw new Error("사용자를 찾을 수 없습니다.");
        }

        return {
            uid: userId,
            ...userDoc.data(),
        };
    } catch (error) {
        throw error;
    }
}

// 점수 업데이트 함수 수정 - 기존 점수에 새 점수 추가
async function updateUserScore(userId, additionalScore) {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("사용자를 찾을 수 없습니다.");
        }

        const currentScore = userDoc.data().score || 0;
        const newScore = currentScore + additionalScore;

        await updateDoc(userRef, {
            score: newScore,
        });

        return newScore;
    } catch (error) {
        throw error;
    }
}

// 랜덤한 응원가 가져오기
async function getRandomSong() {
    try {
        const songsRef = collection(db, "cheerup-songs");
        const snapshot = await getDocs(songsRef);
        
        if (snapshot.empty) {
            throw new Error("No songs available");
        }

        const songs = [];
        snapshot.forEach((doc) => {
            songs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        const randomIndex = Math.floor(Math.random() * songs.length);
        return songs[randomIndex];
    } catch (error) {
        throw error;
    }
}

// 노래의 가격 정보를 가져오는 함수
async function getSongPrice(songId) {
    try {
        const songDoc = await getDoc(doc(db, "cheerup-songs", songId));
        if (!songDoc.exists()) {
            throw new Error("노래를 찾을 수 없습니다.");
        }
        return songDoc.data().price || 1;
    } catch (error) {
        throw error;
    }
}

// 사용자가 노래를 구매했는지 확인하는 함수
async function hasPurchasedSong(userId, songId) {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return false;
        }
        const userSongs = userDoc.data().songs || [];
        return userSongs.includes(songId);
    } catch (error) {
        throw error;
    }
}

// 노래 구매 함수
async function purchaseSong(userId, songId) {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error("사용자를 찾을 수 없습니다.");
        }

        const songPrice = await getSongPrice(songId);
        const userScore = userDoc.data().score || 0;
        const userSongs = userDoc.data().songs || [];

        if (userSongs.includes(songId)) {
            throw new Error("이미 구매한 노래입니다.");
        }

        if (userScore < songPrice) {
            throw new Error("점수가 부족합니다.");
        }

        await updateDoc(userRef, {
            score: userScore - songPrice,
            songs: [...userSongs, songId]
        });

        return {
            newScore: userScore - songPrice,
            purchasedSong: songId
        };
    } catch (error) {
        throw error;
    }
}

// 실시간으로 노래 상태를 가져오는 함수 추가
async function getSongStatus(userId, songId) {
    try {
        const [songDoc, userDoc] = await Promise.all([
            getDoc(doc(db, "cheerup-songs", songId)),
            getDoc(doc(db, "users", userId))
        ]);

        if (!songDoc.exists()) {
            throw new Error("노래를 찾을 수 없습니다.");
        }

        const songData = songDoc.data();
        const isLoggedIn = !!userId;
        let isPurchased = false;
        let userScore = 0;

        if (isLoggedIn && userDoc.exists()) {
            const userData = userDoc.data();
            isPurchased = (userData.songs || []).includes(songId);
            userScore = userData.score || 0;
        }

        return {
            ...songData,
            id: songId,
            isLocked: !isLoggedIn,
            isPurchased,
            purchaseButtonText: isPurchased ? "보유중" : "구매하기",
            price: songData.price || 1,
            canPurchase: isLoggedIn && !isPurchased && userScore >= (songData.price || 1)
        };
    } catch (error) {
        throw error;
    }
}

// Export functions for use in other files
export {
    db,
    auth,
    storage,
    getAllSongs,
    getSongById,
    getSongsByName,
    getSongByName,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    getCurrentUserProfile,
    updateUserProfile,
    getUserById,
    updateUserScore,
    getRandomSong,
    getSongPrice,
    hasPurchasedSong,
    purchaseSong,
    getSongStatus
};
