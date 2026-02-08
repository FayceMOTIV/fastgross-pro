import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core MUST stay together to avoid createContext errors
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'scheduler', 'react-is'],
          // Firebase - largest chunk
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions',
          ],
          // Charts
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          // Date utilities
          'date-vendor': ['date-fns'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-is', 'recharts'],
  },
})
