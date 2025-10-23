// import ReactDOM from 'react-dom'; // Dòng này không cần thiết
import React from 'react'; // Giữ lại React để dùng StrictMode (khuyến nghị)
import { createRoot } from 'react-dom/client';

import './styles/index.css';
import App from './App.jsx'; // <-- THAY ĐỔI CHÍNH LÀ Ở ĐÂY

const root = createRoot(document.getElementById('root'));

// Khuyến nghị: Bọc App trong React.StrictMode để bắt lỗi tốt hơn
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);