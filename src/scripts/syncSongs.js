import { initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Firebase Admin 초기화
const serviceAccount = {
    type: "service_account",
    project_id: process.env.VITE_FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
};

const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
});

const storage = getStorage(app);
const db = getFirestore(app);

async function createFirestoreEntryForMp3(storageFilePath, firestoreCollectionName) {
    try {
        const bucket = storage.bucket();
        const file = bucket.file(storageFilePath);

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        console.log(`Storage URL 생성 완료: ${storageFilePath}`);

        const filename = storageFilePath.split('/').pop() || 'unknown';
        const name = filename.replace(/\.mp3$/i, '');

        const docData = {
            name: name,
            storagePath: storageFilePath,
            url: url,
            uploadedAt: new Date()
        };

        const collectionRef = db.collection(firestoreCollectionName);
        const newDocRef = await collectionRef.add(docData);

        console.log(`Firestore 문서 생성 완료 - ID: ${newDocRef.id}, 컬렉션: ${firestoreCollectionName}`);
    } catch (error) {
        console.error('Firestore 문서 생성 중 오류:', error);
        throw error;
    }
}

async function syncAllMp3FilesToFirestore(firestoreCollectionName) {
    try {
        const bucket = storage.bucket();
        const [files] = await bucket.getFiles();

        const mp3Files = files.filter(file => file.name.toLowerCase().endsWith('.mp3'));

        console.log(`Storage에서 발견된 MP3 파일 수: ${mp3Files.length}`);

        for (const file of mp3Files) {
            await createFirestoreEntryForMp3(file.name, firestoreCollectionName);
        }

        console.log('모든 MP3 파일 동기화 완료');
    } catch (error) {
        console.error('파일 동기화 중 오류:', error);
        throw error;
    }
}

// 스크립트 실행
syncAllMp3FilesToFirestore('cheerup-songs')
    .then(() => {
        console.log('동기화가 완료되었습니다.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('동기화 중 오류 발생:', error);
        process.exit(1);
    }); 