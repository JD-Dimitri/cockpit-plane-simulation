import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Politique de sécurité du contenu, ajoutée seulement au build (le serveur de
 * développement injecte des styles en ligne pour le rechargement à chaud).
 * Aucun domaine externe : l'application doit fonctionner hors ligne (ENF-002).
 * Tauri applique en plus sa propre CSP (src-tauri/tauri.conf.json).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "worker-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

function cspMeta(): Plugin {
  return {
    name: 'a350-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  plugins: [react(), cspMeta()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  worker: { format: 'es' },
  build: {
    target: 'es2022', // WebView2 (Chromium récent)
    sourcemap: true,
    assetsInlineLimit: 0, // polices et images en fichiers, jamais en data: inattendu
  },
});
