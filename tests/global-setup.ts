import { test as setup } from '@playwright/test';
import { dashboardLogin, wpAdminLogin } from './helpers/auth';

setup('authenticate django dashboard', async ({ page }) => {
  await dashboardLogin(page);
  await page.context().storageState({ path: '.auth/dashboard.json' });
});

setup('authenticate wordpress admin', async ({ page }) => {
  await wpAdminLogin(page);
  await page.context().storageState({ path: '.auth/wp-admin.json' });
});
