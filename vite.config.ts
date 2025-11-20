import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Use 127.0.0.1 to ensure IPv4 and avoid node localhost resolution issues
    host: '127.0.0.1', 
    proxy: {
      // Proxy API requests to the Python backend running on port 8010
      '/status': 'http://127.0.0.1:8010',
      '/control': 'http://127.0.0.1:8010',
      '/logs': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
        secure: false,
      },
      '/ledger': 'http://127.0.0.1:8010',
      '/config': 'http://127.0.0.1:8010',
    }
  },
  define: {
    'process.env': {}
  }
});