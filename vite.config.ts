import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
             react: ['react', 'react-dom'],
             firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
             three: ['three', '@react-three/fiber', '@react-three/drei'],
             icons: ['lucide-react'],
             motion: ['motion'],
             recharts: ['recharts']
          }
        }
      }
    },
    server: {
      hmr: {
        overlay: false
      },
    },
  };
});
