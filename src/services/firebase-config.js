// src/services/firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8TquvR1...",
  authDomain: "revenue-profit-app.firebaseapp.com",
  projectId: "revenue-profit-app",
  storageBucket: "revenue-profit-app.appspot.com",
  messagingSenderId: "468980813622",
  appId: "1:468980813622:web:6fb885532508fe...",
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
