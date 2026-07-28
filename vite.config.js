import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    // Minify with esbuild (faster than terser, default)
    minify: 'esbuild',
    // Inline tiny assets (<4kb) directly into HTML to avoid extra requests
    assetsInlineLimit: 4096,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Raise warning limit to avoid noise (our single bundle is intentionally ~15kb)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      external: [
        '/_vercel/insights/script.js',
        '/_vercel/speed-insights/script.js',
      ],
      output: {
        // Aggressive mangling of variable names for smaller JS
        generatedCode: {
          constBindings: true,
        },
        // Cache-busting hashes
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
