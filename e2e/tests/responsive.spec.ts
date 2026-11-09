import { expect, test } from '@playwright/test';
import { MANAGER, signIn } from './helpers';

const PAGES = ['/tickets', '/tickets/new', '/profile', '/notifications', '/dashboard', '/admin/users', '/admin/categories', '/admin/sla', '/admin/audit'];

for (const width of [360, 768, 1920]) {
  test(`страницы не выходят за ширину экрана ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await signIn(page, MANAGER);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} при ширине ${width}`).toBeLessThanOrEqual(0);
    }
  });
}
