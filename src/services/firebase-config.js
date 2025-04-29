// src/services/firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyABAtDgu1RWl8yhHECA2WDqOYTO_6NNQ6I",
    authDomain: "revenue-profit-app.firebaseapp.com",
    projectId: "revenue-profit-app",
    storageBucket: "revenue-profit-app.firebasestorage.app",
    messagingSenderId: "468098013262",
    appId: "1:468098013262:web:6fb885532508fce54d0b1f",
    measurementId: "G-3WJ29GSV28"
  };

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
console.log("🔥 Firebase đã khởi tạo thành công!");

// Kiểm tra kết nối Firestore
const db = getFirestore(app);
db && console.log("✅ Kết nối Firestore thành công!");

// Kiểm tra kết nối Storage
const storage = getStorage(app);
storage && console.log("✅ Kết nối Storage thành công!");

// Xuất các dịch vụ
export { db, storage };
