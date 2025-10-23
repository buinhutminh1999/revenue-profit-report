// Trong file vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),svgr()],
  server: {
    proxy: {
      // Cấu hình này để khớp với file vercel.json của bạn
      '/api': {
        // 1. Thay đổi target thành IP và cổng backend của bạn
        target: 'http://115.78.92.176:3001', 
        
        changeOrigin: true, // Bắt buộc phải có
        secure: false, // Dùng 'false' nếu backend của bạn là http
        
        // 2. Bỏ comment dòng rewrite này
        // Nó sẽ xóa '/api' khỏi đường dẫn
        // Ví dụ: request '/api/users' sẽ được gửi đến 'http://115.78.92.176:3001/users'
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})