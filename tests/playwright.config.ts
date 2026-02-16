import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'dashboard',
      testDir: './dashboard',
      dependencies: ['setup'],
      use: {
        baseURL: process.env.API_BASE_URL || 'https://api.transfers.ma',
        storageState: path.resolve(__dirname, '.auth/dashboard.json'),
      },
    },
    {
      name: 'api',
      testDir: './api',
      use: {
        baseURL: process.env.API_BASE_URL || 'https://api.transfers.ma',
      },
    },
    {
      name: 'frontend',
      testDir: './frontend',
      use: {
        baseURL: process.env.WP_BASE_URL || 'https://transfers.ma',
      },
    },
    {
      name: 'wp-admin',
      testDir: './wp-admin',
      dependencies: ['setup'],
      use: {
        baseURL: process.env.WP_BASE_URL || 'https://transfers.ma',
        storageState: path.resolve(__dirname, '.auth/wp-admin.json'),
      },
    },
  ],
});
