import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: false,
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'cd frontend && npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
