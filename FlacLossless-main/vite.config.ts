import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        strictPort: false, // Fall back to next available port if 5000 is busy
        allowedHosts: true,
        watch: {
          ignored: ['**/backend/cache.json', '**/backend/audio/**']
        },

        // Proxy backend requests to port 5001 using middlew proxy with proper headers
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
            rewrite: (path) => path.replace(/^\/api/, ''),
            ws: true,
            configure: (proxy, options) => {
              proxy.on('proxyRes', (proxyRes, req, res) => {
                proxyRes.headers['Access-Control-Allow-Origin'] = '*';
                proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
                proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept';
              });
            }
          },
          '/download': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
            configure: (proxy, options) => {
              proxy.on('proxyRes', (proxyRes) => {
                proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              });
            }
          },
          '/stream': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
          },
          '/metadata': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
          },
          '/cache': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
          },
          '/health': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
          },
          '/search': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
          },
          '/jobs': {
            target: 'http://127.0.0.1:3001',
            changeOrigin: false,
          }
        }
      },

      plugins: [react()],

      css: {
        postcss: {
          plugins: [tailwindcss],
        },
      },

      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },

      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});