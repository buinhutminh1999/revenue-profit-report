// File: src/services/firebase-config.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // BƯỚC 1: Thêm dòng này
import { getFunctions } from "firebase/functions"; // 1. Thêm import này

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

// Khởi tạo và kiểm tra các dịch vụ
const db = getFirestore(app);
db && console.log("✅ Kết nối Firestore thành công!");

const storage = getStorage(app);
storage && console.log("✅ Kết nối Storage thành công!");

const auth = getAuth(app); // BƯỚC 2: Thêm dòng này
auth && console.log("✅ Dịch vụ Auth sẵn sàng!");
const functions = getFunctions(app, 'asia-southeast1'); // 2. Khởi tạo Functions (chỉ định đúng khu vực)

// Xuất các dịch vụ
export { db, auth, storage, functions }; // BƯỚC 3: Thêm 'auth' vào đây