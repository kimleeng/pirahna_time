import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumPath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    headless: true,
    viewport: { width: 1440, height: 1100 },
    launchOptions: { ...(chromiumPath ? { executablePath: chromiumPath } : {}), args: ['--disable-dev-shm-usage'] },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 20000,
  },
});
