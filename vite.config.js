import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Plugin để tạo version.json
const versionPlugin = () => {
  return {
    name: 'generate-version',
    buildStart() {
      const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'dev';
      const versionData = { version };
      const publicDir = join(process.cwd(), 'public');
      const versionFile = join(publicDir, 'version.json');
      
      try {
        writeFileSync(versionFile, JSON.stringify(versionData, null, 2), 'utf8');
        console.log(`✓ Generated version.json with version: ${version}`);
      } catch (error) {
        console.error('Error generating version.json:', error);
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
    versionPlugin(),
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
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@mui/system'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});

