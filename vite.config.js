import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/icon.svg',
        'icons/apple-touch-icon.png',
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
        'icons/pwa-maskable-512x512.png',
        'imgs/logo-codes.png',
      ],
      manifest: {
        id: '/',
        name: 'Simulador de Correlativas UNLu',
        short_name: 'Correlativas UNLu',
        description:
          'Planificá tu carrera en la UNLu: seguimiento de materias, correlativas, Mi Cursada y simulador de egreso offline.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#005A36',
        background_color: '#F8FAFC',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: [
          '**/*.map',
          '**/*.gz',
          '**/*.br',
          'imgs/dashboard.png',
          'imgs/Priscila*',
          'imgs/logo_temporal.png',
        ],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__\/auth\//, /^\/__\/firebase\//, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    exclude: ['node_modules/**', 'dist/**', 'src/**/*.emulator.test.{js,jsx}'],
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Firebase es enorme
            if (id.includes('firebase')) return 'vendor-firebase';
            
            // UI Frameworks y Animaciones
            if (id.includes('@heroui') || id.includes('framer-motion') || id.includes('@react-aria')) {
              return 'vendor-ui';
            }
            
            // Librerías de gráficos/flujo
            if (id.includes('@xyflow')) return 'vendor-flow';
            
            // Utilidades pesadas (PDF, imágenes)
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
              return 'vendor-utils';
            }
            
            // Iconos
            if (id.includes('lucide') || id.includes('fontawesome')) {
              return 'vendor-icons';
            }

            // El resto de dependencias pequeñas
            return 'vendor-base';
          }
        }
      }
    }
  }
})