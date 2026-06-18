import 'dotenv/config';
import { defineConfig } from '@playwright/test';
import { productionBaseURL, stagingBaseURL } from './tests/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    // Ignorar errores de certificado en staging (certificados autofirmados, etc.)
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'production',
      use: { baseURL: productionBaseURL },
    },
    {
      name: 'staging',
      use: { baseURL: stagingBaseURL },
    },
  ],
});
