import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Keep local API calls on the Vite origin and forward them to Express.
  // This avoids browser CORS issues and makes the API work even when the
  // backend's port differs from the default.
  server: {
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
