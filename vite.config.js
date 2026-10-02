import { defineConfig } from 'vite';

function inlineCss() {
  // Collected once and reused: with several HTML entries the CSS asset is
  // already removed from the bundle by the time the second page is processed.
  let cssContent = '';
  return {
    name: 'inline-css-plugin',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      for (const [fileName, file] of Object.entries(ctx.bundle)) {
        if (fileName.endsWith('.css')) {
          cssContent += file.source;
          delete ctx.bundle[fileName];
        }
      }
      if (cssContent) {
        html = html.replace(/<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>\s*/g, '');
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
      input: {
        main: 'index.html',
        agents: 'agents.html',
      },
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

