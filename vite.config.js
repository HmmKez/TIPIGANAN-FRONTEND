import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // The pdf.js worker ships as .mjs. Many web servers (Ubuntu's nginx
        // among them) don't know that extension and send it as
        // application/octet-stream, which browsers refuse to run as a module,
        // so readers got "Failed to load PDF file." Every server knows .js.
        assetFileNames: (asset) => {
          const name = asset.names?.[0] ?? asset.name ?? ''
          return name.endsWith('.mjs')
            ? 'assets/[name]-[hash].js'
            : 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
