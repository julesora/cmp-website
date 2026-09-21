import { defineConfig, devices } from '@playwright/test';
import pages from './playwright.pages.config.js';

export default defineConfig({
  ...pages,
  testDir: './tests/mobile',
  use: {
    ...devices['iPhone 13'],
    baseURL: 'http://127.0.0.1:5174/cmp-website/',
  },
});
