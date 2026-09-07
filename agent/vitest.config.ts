import { defineConfig } from 'vitest/config';

// Without this file, Vite's config search walks up to the repo root's
// vite.config.js — a React/Vite project config whose test `include`
// pattern only matches .js/.jsx anyway, so agent/'s own .test.ts files were
// never actually discoverable by `pnpm test` here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
