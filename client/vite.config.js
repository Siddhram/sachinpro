import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: process.env.PORT || 5173, // Use Render's assigned port
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: true,
      }
    },
    allowedHosts: ['sachinpro.onrender.com'], // Add this line
  }
});
