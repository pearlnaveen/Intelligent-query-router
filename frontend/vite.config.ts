import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: '/ims/',
  server: {
    proxy: {
      '/institute_management_system': {
        target: 'https://erp.nec.edu.in/ims',
        changeOrigin: true,
      },
    },
  },
});
