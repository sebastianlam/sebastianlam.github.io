import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function staticCvPlugin() {
  const renderPath = path.resolve(process.cwd(), 'src/renderHtml.js');
  return {
    name: 'static-cv-html',
    async transformIndexHtml(html) {
      // Bust ESM cache in dev mode so edits to cvData.js / renderHtml.js reflect immediately
      const modUrl = `${pathToFileURL(renderPath).href}?t=${Date.now()}`;
      const { renderAppHtml } = await import(modUrl);
      return html.replace('<!--APP_HTML-->', renderAppHtml());
    },
    configureServer(server) {
      server.watcher.on('change', (file) => {
        if (file.endsWith('cvData.js') || file.endsWith('renderHtml.js')) {
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    staticCvPlugin(),
  ],
});
