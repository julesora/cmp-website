import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:5183', browserName: 'chromium' },
  webServer: [
    {
      command: 'npm start',
      url: 'http://127.0.0.1:8000/docs',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5183 --strictPort',
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: false,
    },
  ],
});
