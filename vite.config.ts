import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Local preview stays at /; GitHub Actions builds the repository Pages path.
  base: process.env.GITHUB_PAGES === 'true' ? '/english-os/' : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('date-fns')) return 'vendor-dates';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-dom') || id.includes('/node_modules/react/')) return 'vendor-react';
          if (id.includes('/node_modules/zod/')) return 'vendor-validation';
          return undefined;
        },
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts', restoreMocks: true },
});
