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
        manualChunks(id) {
          // Firebase - largest chunk, load separately
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }
          // Charts - heavy, lazy loaded
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
            return 'charts';
          }
          // React ecosystem together to avoid circular deps
          if (id.includes('react-dom') || id.includes('react-router') ||
              id.includes('scheduler') || id.includes('react-is')) {
            return 'react-vendor';
          }
          // UI libraries
          if (id.includes('framer-motion') || id.includes('cmdk') ||
              id.includes('lucide-react') || id.includes('react-hot-toast') ||
              id.includes('@radix-ui') || id.includes('focus-trap')) {
            return 'ui-vendor';
          }
          // PDF generation - rarely used
          if (id.includes('@react-pdf') || id.includes('pdfkit')) {
            return 'pdf-vendor';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
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
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
