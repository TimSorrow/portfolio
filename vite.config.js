import { defineConfig } from 'vite';

function inlineCss() {
  return {
    name: 'inline-css-plugin',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      let cssContent = '';
      for (const [fileName, file] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith('.css')) {
          cssContent += file.source;
          delete ctx.bundle[fileName];
        }
      }
      if (cssContent) {
        html = html.replace(
          /<\/head>/i,
          `<style>${cssContent}</style></head>`
        );
      }
      return html;
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [inlineCss()],
  build: {
    minify: 'esbuild',
    assetsInlineLimit: 4096,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      external: [
        '/_vercel/insights/script.js',
        '/_vercel/speed-insights/script.js',
      ],
      output: {
        generatedCode: {
          constBindings: true,
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});

