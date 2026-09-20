import { defineConfig } from '@playwright/test';

process.env.CMP_PAGES = '1';

export default defineConfig({
  testDir: './tests/pages',
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:5174/cmp-website/', browserName: 'chromium' },
  webServer: {
    command: 'VITE_BASE=/cmp-website/ npx vite preview --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174/cmp-website/',
  },
});
