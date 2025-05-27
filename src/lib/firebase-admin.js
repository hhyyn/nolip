import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

// Initialize Firebase Admin with service account
const serviceAccount = {
    type: "service_account",
    project_id: process.env.VITE_FIREBASE_PROJECT_ID,
    private_key_id: process.env.VITE_FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.VITE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.VITE_FIREBASE_CLIENT_EMAIL,
    client_id: process.env.VITE_FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.VITE_FIREBASE_CLIENT_CERT_URL,
};

const app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
});

// Get the Storage and Firestore instances
const storage = getStorage();
const db = getFirestore();

async function createFirestoreEntryForMp3(
    storageFilePath,
    firestoreCollectionName
) {
    try {
        const bucket = storage.bucket();
        const file = bucket.file(storageFilePath);

        const [url] = await file.getSignedUrl({
            action: "read",
            expires: "03-01-2500",
        });

        console.log(
            `Successfully got download URL for ${storageFilePath}: ${url}`
        );

        const filename = storageFilePath.split("/").pop() || "unknown";
        const name = filename.replace(/\.mp3$/i, "");

        const docData = {
            name: name,
            storagePath: storageFilePath,
            url: url,
            uploadedAt: new Date(),
        };

        const collectionRef = db.collection(firestoreCollectionName);
        const newDocRef = await collectionRef.add(docData);

        console.log(
            `Created Firestore document with ID: ${newDocRef.id} in collection: ${firestoreCollectionName}`
        );
    } catch (error) {
        console.error(
            `Error creating Firestore entry for ${storageFilePath}:`,
            error
        );
        throw error;
    }
}

async function syncAllMp3FilesToFirestore(firestoreCollectionName) {
    try {
        const bucket = storage.bucket();
        const [files] = await bucket.getFiles();

        const mp3Files = files.filter((file) =>
            file.name.toLowerCase().endsWith(".mp3")
        );

        console.log(`Found ${mp3Files.length} MP3 files in storage`);

        for (const file of mp3Files) {
            await createFirestoreEntryForMp3(
                file.name,
                firestoreCollectionName
            );
        }

        console.log("Successfully synced all MP3 files to Firestore");
    } catch (error) {
        console.error("Error syncing MP3 files to Firestore:", error);
        throw error;
    }
}

export { syncAllMp3FilesToFirestore };
