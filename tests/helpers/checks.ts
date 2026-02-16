import { Page, expect } from '@playwright/test';

export type ErrorType = 'ok' | 'migration_error' | 'server_error' | 'not_found';

export async function checkForErrors(page: Page): Promise<ErrorType> {
  const html = await page.content();

  if (html.includes('OperationalError') || html.includes('ProgrammingError') || html.includes('no such column')) {
    console.error('⚠️  MIGRATIONS NEEDED — run: python manage.py makemigrations && python manage.py migrate');
    return 'migration_error';
  }
  if (html.includes('Server Error (500)') || html.includes('Internal Server Error')) {
    console.error('⚠️  SERVER ERROR 500 — check Django logs');
    return 'server_error';
  }
  if (html.includes('DoesNotExist') || html.includes('Page not found')) {
    return 'not_found';
  }
  return 'ok';
}

export async function checkPageLoadedOk(page: Page, description: string): Promise<void> {
  const status = await checkForErrors(page);
  if (status === 'ok') {
    console.log(`  ✅ ${description}`);
  } else {
    console.error(`  ❌ ${description}: ${status}`);
  }
  expect(status, `${description} — got ${status}`).toBe('ok');
}
