import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // Use root path for Vercel deployment
  build: {
    rollupOptions: {
      external: [
        '/_vercel/insights/script.js',
        '/_vercel/speed-insights/script.js',
      ],
    },
  },
});
