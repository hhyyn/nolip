const { initializeApp } = require('firebase/app');
const { 
    getFirestore, 
    collection, 
    getDocs,
    doc,
    updateDoc
} = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 모든 사용자의 점수 초기화
async function resetAllUserScores() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        const updatePromises = usersSnapshot.docs.map(async (userDoc) => {
            await updateDoc(doc(db, "users", userDoc.id), {
                score: 0
            });
            console.log(`사용자 ${userDoc.id} 점수 초기화 완료`);
        });

        await Promise.all(updatePromises);
        console.log('모든 사용자 점수 초기화 완료');
        
        return true;
    } catch (error) {
        console.error('사용자 점수 초기화 중 오류 발생:', error);
        throw error;
    }
}

// 스크립트 실행
resetAllUserScores()
    .then(() => {
        console.log('점수 초기화가 완료되었습니다.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('점수 초기화 중 오류 발생:', error);
        process.exit(1);
    }); 