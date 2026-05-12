import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built index.html works under Electron's file:// loader.
  base: './',
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true
  }
});
