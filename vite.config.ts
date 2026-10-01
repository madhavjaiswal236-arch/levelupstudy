import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function virtualFirebasePlugin(): Plugin {
  const virtualModuleId = 'virtual:firebase-config';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'virtual-firebase-config',
    resolveId(id: string) {
      if (id === virtualModuleId || id.includes('firebase-applet-config.json')) {
        return resolvedVirtualModuleId;
      }
      return null;
    },
    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
          try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          } catch (e) {
            config = {};
          }
        }
        return `export default ${JSON.stringify(config)};`;
      }
      return null;
    }
  };
}

function disableViteHmrPlugin(): Plugin {
  return {
    name: 'disable-vite-hmr-transport',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'text/javascript' },
            children: `
              (function() {
                var origError = console.error;
                console.error = function() {
                  for (var i = 0; i < arguments.length; i++) {
                    var s = String(arguments[i] || '');
                    if (s.indexOf('[vite]') !== -1 || s.indexOf('WebSocket') !== -1 || s.indexOf('websocket') !== -1 || s.indexOf('vite-pwa-plugin') !== -1) return;
                  }
                  return origError.apply(console, arguments);
                };
                window.addEventListener('unhandledrejection', function(e) {
                  var msg = (e && e.reason && (e.reason.message || String(e.reason))) || '';
                  if (msg.indexOf('WebSocket') !== -1 || msg.indexOf('websocket') !== -1 || msg.indexOf('[vite]') !== -1) {
                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('error', function(e) {
                  var msg = (e && (e.message || String(e.error))) || '';
                  if (msg.indexOf('WebSocket') !== -1 || msg.indexOf('websocket') !== -1 || msg.indexOf('[vite]') !== -1) {
                    e.preventDefault();
                    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
    transform(code: string, id: string) {
      if (id.includes('vite/dist/client/client.mjs') || id.includes('@vite/client')) {
        return code
          .replace(
            /const transport = normalizeModuleRunnerTransport[\s\S]*?\);\s*let willUnload = false;/,
            `const transport = {
  connect: async () => {},
  disconnect: async () => {},
  send: async () => {}
};
let willUnload = false;`
          )
          .replace(
            /error:\s*\(err\)\s*=>\s*console\.error\("\[vite\]",\s*err\)/,
            'error: () => {}'
          )
          .replace(
            /console\.error\(`\[vite\] failed to connect to websocket[\s\S]*?throw e;\s*}/,
            `/* ignored websocket error */ }`
          )
          .replace(
            /async function waitForSuccessfulPing[\s\S]*?while\s*\(true\)[\s\S]*?}\s*}\s*}/,
            'async function waitForSuccessfulPing() {}'
          );
      }
      return null;
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      virtualFirebasePlugin(),
      disableViteHmrPlugin(),
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt'],
        manifest: {
          id: '/',
          name: 'LevelUp Study - High Performance Productivity & Study Tracker',
          short_name: 'LevelUp',
          description: 'A gamified, high-performance study tracker and adaptive backlog productivity ecosystem.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/favicon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/favicon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
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
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1500,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            'vendor-charts': ['recharts'],
            'vendor-icons': ['lucide-react'],
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'vendor-date': ['date-fns'],
            'vendor-three': ['three'],
          }
        }
      }
    },
    server: {
      hmr: false,
    },
  };
});
