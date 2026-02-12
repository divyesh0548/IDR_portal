import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    host: '127.0.0.1', // Use IPv4 explicitly to avoid IPv6 permission issues
    strictPort: false, // Allow Vite to try the next available port if 5173 is in use
  },
})
