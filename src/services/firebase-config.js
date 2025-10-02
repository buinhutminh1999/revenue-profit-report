import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getDatabase } from 'firebase/database'; // Thêm dòng này

const firebaseConfig = {
    apiKey: "AIzaSyABAtDgu1RWl8yhHECA2WDqOYTO_6NNQ6I",
    authDomain: "revenue-profit-app.firebaseapp.com",
    projectId: "revenue-profit-app",
    storageBucket: "revenue-profit-app.firebasestorage.app",
    messagingSenderId: "468098013262",
    appId: "1:468098013262:web:6fb885532508fce54d0b1f",
    measurementId: "G-3WJ29GSV28",
    databaseURL: "https://revenue-profit-app-default-rtdb.asia-southeast1.firebasedatabase.app"
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
const rtdb = getDatabase(app); // Thêm dòng này

// Xuất các dịch vụ
export { db, auth, storage, functions, rtdb  };