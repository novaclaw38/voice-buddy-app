import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // CSS modules resolve to inert proxies in tests — we assert on text and
    // roles, never on generated class names.
    css: false,
    include: ['src/**/*.test.{js,jsx}', 'api/**/*.test.js'],
  },
  server: {
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.cache/**',
        '**/ovos-installer/**',
        // Cache directories outside the project are not portable across
        // machines — use env vars or a generic glob instead of hardcoded
        // absolute paths that only resolve on the original developer's machine.
        process.env.HOME ? `${process.env.HOME}/.cache/**` : '**/.cache/**',
      ],
    },
  },
})
