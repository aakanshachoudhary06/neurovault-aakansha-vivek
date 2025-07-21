import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
    exclude: ['lucide-react'],
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5174,
    fs: {
      strict: false
    }
  }
});