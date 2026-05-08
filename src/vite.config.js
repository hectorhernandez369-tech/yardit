import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import base44Plugin from '@base44/vite-plugin';

export default defineConfig({
  plugins: [react(), base44Plugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});