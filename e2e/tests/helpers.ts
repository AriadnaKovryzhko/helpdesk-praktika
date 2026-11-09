import { expect, type Browser, type Page } from '@playwright/test';

export const PASSWORD = 'Password123!';
export const USER = 'user1@helpdesk.local';
export const AGENT = 'agent1@helpdesk.local';
export const MANAGER = 'manager@helpdesk.local';

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/tickets/);
}

export async function openSession(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  return page;
}

export async function createTicket(page: Page, title: string): Promise<string> {
  await page.goto('/tickets/new');
  await page.getByLabel('Тема').fill(title);
  await page.getByLabel('Описание').fill('Сценарий проверяет полный путь заявки.');
  await page.getByLabel('Категория').selectOption({ index: 1 });
  await page.getByLabel('Приоритет').selectOption('HIGH');
  await page.getByRole('button', { name: 'Создать заявку' }).click();
  await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{36}$/);
  const heading = await page.getByRole('heading', { level: 1 }).innerText();
  return heading.match(/№(\d+)/)![1];
}
