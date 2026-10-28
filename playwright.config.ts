import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/smoke',
  timeout: 60_000,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
  projects: [
    { name: 'dev', use: { baseURL: 'http://localhost:5199' } },
    { name: 'prod', use: { baseURL: 'http://localhost:5198' } },
  ],
  webServer: [
    { command: 'npx vite --port 5199 --strictPort', port: 5199, reuseExistingServer: true },
    {
      command: 'npx vite build && npx vite preview --port 5198 --strictPort',
      port: 5198,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
