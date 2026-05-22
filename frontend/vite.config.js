import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
    ],

    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'vendor';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/@hello-pangea')) {
              return 'ui';
            }
            if (id.includes('node_modules/@tanstack/react-query')) {
              return 'data';
            }
            if (id.includes('node_modules/axios')) {
              return 'axios';
            }
          },
        },
      },
      chunkSizeWarningLimit: 500,
      sourcemap: false,
    },

    server: {
      port: 5173,
      proxy: env.VITE_API_URL
        ? undefined
        : {
            '^/(auth|tasks|users|comments|approvals|dashboard|documents|audit-logs|notifications|ai|leaves|organizations|subscription|credits|usage|payments|webhooks|billing|super-admin|monitoring|ws|docs|openapi.json|redoc)': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              ws: true,
            },
          },
    },
  }
})
