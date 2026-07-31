import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: '../dist-frontend',
    rollupOptions: {
      input: {
        controller: resolve(__dirname, 'src/controller.html'),
        projector: resolve(__dirname, 'src/projector.html'),
        viewer: resolve(__dirname, 'src/viewer.html'),
      },
    },
  },
});
