import { test, expect } from '@playwright/test';

test.describe('ChronoMind QA', () => {
  test('Startseite lädt ohne Fehler', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Prüfe dass die Seite laden kann
    await expect(page).toHaveTitle(/ChronoMind/i);

    // Prüfe dass keine JS-Fehler aufgetreten sind
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('Warning')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Login-Seite lädt', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Dashboard/Chat-Seite lädt', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('body')).toBeVisible();
  });
});
