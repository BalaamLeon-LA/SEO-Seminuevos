import 'dotenv/config';
import { defineConfig } from '@playwright/test';
import { productionBaseURL, demoBaseURL } from './tests/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60_000,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    // Ignorar errores de certificado en demo (certificados autofirmados, etc.)
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'production',
      use: { baseURL: productionBaseURL },
    },
    {
      name: 'demo',
      use: { baseURL: demoBaseURL },
    },
  ],
});
