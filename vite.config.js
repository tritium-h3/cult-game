import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ['torment-nexus.local']
  },
  resolve: {
    alias: {
      'transliteration': path.resolve(__dirname, 'node_modules/transliteration/dist/browser/bundle.esm.min.js')
    }
  }
})
