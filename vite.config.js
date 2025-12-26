import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
    // Bundle visualizer - generates stats.html after build
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://office.base.vn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-core': ['@mui/material', '@mui/system'],
          'mui-icons': ['@mui/icons-material'],
          'mui-x': ['@mui/x-data-grid', '@mui/x-date-pickers'],
          'mui-lab': ['@mui/lab'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'date-fns': ['date-fns'],
          // exceljs removed - now lazy-loaded via dynamic import for ~900KB savings
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@mui/material',
      '@mui/material/styles',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
});
