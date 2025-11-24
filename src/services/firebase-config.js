import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
console.log("🔥 Firebase đã khởi tạo thành công!");

// Khởi tạo và kiểm tra các dịch vụ
const db = getFirestore(app);
db && console.log("✅ Kết nối Firestore thành công!");

const storage = getStorage(app);
storage && console.log("✅ Kết nối Storage thành công!");

const auth = getAuth(app);
auth && console.log("✅ Dịch vụ Auth sẵn sàng!");

const functions = getFunctions(app, 'asia-southeast1');

// ✨ CHỈ CẦN VÔ HIỆU HÓA (COMMENT) ĐOẠN NÀY LÀ ĐƯỢC ✨
/*
if (window.location.hostname === "localhost") {
    console.log("Đã bỏ qua kết nối đến Firebase Emulators...");
    // --- Các dòng connect...Emulator đã được vô hiệu hóa ---
    // import { connectFirestoreEmulator } from "firebase/firestore";
    // import { connectAuthEmulator } from "firebase/auth";
    // import { connectFunctionsEmulator } from "firebase/functions";
    // connectAuthEmulator(auth, "http://localhost:9099");
    // connectFirestoreEmulator(db, "localhost", 8080);
    // connectFunctionsEmulator(functions, "localhost", 5001);
}
*/
const rtdb = getDatabase(app);

// Xuất các dịch vụ
export { db, auth, storage, functions, rtdb };