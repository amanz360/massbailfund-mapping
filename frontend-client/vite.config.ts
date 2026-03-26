import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    }),
  ],
  server: {
    port: 5174,
    allowedHosts: true,
    ...(mode === 'live' && {
      proxy: {
        '/api': {
          target: 'https://3sbjv34ec0.execute-api.us-east-1.amazonaws.com',
          changeOrigin: true,
        },
      },
    }),
  },
}))
