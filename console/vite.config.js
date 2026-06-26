import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'
import fs from 'fs'

const certPath = path.resolve(__dirname, 'certs/cert.pem')
const keyPath = path.resolve(__dirname, 'certs/key.pem')
const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath)

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    ...(hasSSL ? {
      https: {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      }
    } : {}),
  },
})
