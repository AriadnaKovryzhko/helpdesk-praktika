import { expect, test } from '@playwright/test';
import { MANAGER, signIn, USER } from './helpers';

const PAGES = ['/tickets', '/profile', '/notifications', '/dashboard', '/admin/users', '/admin/categories', '/admin/sla', '/admin/audit'];

for (const width of [360, 768, 1920]) {
  test(`страницы не выходят за ширину экрана ${width} px`, async ({ page, browser }) => {
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
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const requester = await context.newPage();
    await signIn(requester, USER);
    await requester.goto('/tickets/new');
    await expect(requester.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await requester.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `/tickets/new при ширине ${width}`).toBeLessThanOrEqual(0);
  });
}
