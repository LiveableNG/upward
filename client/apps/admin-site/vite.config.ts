import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@upward/client-core': path.resolve(__dirname, '../../libs/core/src/index.ts'),
    },
  },
})
