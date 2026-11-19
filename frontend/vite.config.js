// Configura Vite para compilar las páginas actuales y la entrada React nueva.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Quita la CSP del HTML solo en desarrollo, porque Vite inyecta estilos en línea que ella bloquea.
function relaxCspInDev() {
  return {
    name: 'relax-csp-in-dev',
    apply: 'serve',
    transformIndexHtml: html => html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>\s*/i, '')
  };
}

// Conserva el sitio actual como multipágina mientras añade una página React aislada.
export default defineConfig({
  plugins: [react(), relaxCspInDev()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        tracking: resolve(import.meta.dirname, 'seguimiento.html'),
        reactAdmin: resolve(import.meta.dirname, 'admin-react.html')
      }
    }
  }
});
