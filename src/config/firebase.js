// Firebase Admin SDK configuration
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// Export Firestore and Storage instances
const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = {
    admin,
    db,
    bucket,
};

