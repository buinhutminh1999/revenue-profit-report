import React, { useEffect } from 'react';
import NProgress from 'nprogress';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material';
import 'nprogress/nprogress.css';

export default function ProgressBar() {
  const theme = useTheme();
  const location = useLocation();
  const navType = useNavigationType();

  // Cấu hình NProgress một lần duy nhất
  useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 200,
      minimum: 0.1,
    });
  }, []);

  // Cập nhật style của NProgress mỗi khi theme thay đổi (sáng/tối)
  useEffect(() => {
    const styleId = 'nprogress-custom-style';
    // Xóa style cũ nếu có để tránh trùng lặp
    document.getElementById(styleId)?.remove();

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      #nprogress {
        pointer-events: none;
      }
      /* Thanh progress chính với hiệu ứng gradient và glow */
      #nprogress .bar {
        background: linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%);
        box-shadow: 0 0 10px ${alpha(theme.palette.primary.main, 0.7)};
        
        position: fixed;
        z-index: ${theme.zIndex.tooltip + 1}; /* Luôn nổi trên cùng */
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
      }
      /* "Spark" animation lướt theo thanh progress */
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px ${theme.palette.primary.main}, 0 0 5px ${theme.palette.primary.main};
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Dọn dẹp style khi component bị unmount
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, [theme]); // Phụ thuộc vào theme để cập nhật màu sắc

  // Bắt đầu và kết thúc progress dựa trên điều hướng
  useEffect(() => {
    if (navType !== 'POP') {
      NProgress.start();
    }
    // Set timeout nhỏ để đảm bảo thanh progress hiển thị đủ lâu để người dùng nhận thấy
    const timer = setTimeout(() => NProgress.done(), 500); 
    
    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.pathname, navType]);

  return null; // Component này không render JSX nào
}