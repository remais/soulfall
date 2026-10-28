import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works on any static host / sub-path (GitHub Pages, Cloudflare Pages).
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
