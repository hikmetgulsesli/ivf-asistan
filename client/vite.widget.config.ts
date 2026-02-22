import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4520',
        changeOrigin: true,
      },
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget-vanilla.ts'),
      name: 'IVFChatWidget',
      fileName: 'ivf-chat-widget',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'ivf-chat-widget.[ext]',
      },
    },
    cssCodeSplit: false,
  },
});