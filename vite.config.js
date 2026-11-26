import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'Pix Decoder • Pizzaria Pellegrinos',
      short_name: 'Pix Decoder',
      description: 'Decodificador local de QR Codes Pix.',
      theme_color: '#123c32',
      background_color: '#f5f7f5',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] }
  })]
});
