import { expect, test } from '@playwright/test';
import { AGENT, createTicket, MANAGER, openSession, USER } from './helpers';

test('заявка проходит путь от создания до закрытия с уведомлением исполнителю', async ({
  browser,
}) => {
  const agent = await openSession(browser, AGENT);
  const user = await openSession(browser, USER);

  const title = `Проверка сценария ${Date.now()}`;
  const number = await createTicket(user, title);

  await expect(agent.getByText(`Новая заявка №${number}`).first()).toBeVisible();
  await expect(agent.getByTestId('unread-count')).toBeVisible();

  await agent.getByRole('link', { name: /Уведомления/ }).click();
  await agent.getByRole('button', { name: new RegExp(`Новая заявка №${number}`) }).first().click();
  await expect(agent.getByRole('heading', { level: 1 })).toContainText(title);

  await agent.getByRole('button', { name: 'Взять в работу' }).click();
  await expect(agent.getByText('Назначена', { exact: true }).first()).toBeVisible();

  await agent.getByRole('button', { name: 'В работу', exact: true }).click();
  await expect(agent.getByText('В работе', { exact: true }).first()).toBeVisible();

  await agent.getByRole('button', { name: 'Отметить решённой' }).click();
  await expect(agent.getByText('Решена', { exact: true }).first()).toBeVisible();

  await expect(user.getByText('Решена', { exact: true }).first()).toBeVisible();
  await user.getByRole('button', { name: 'Закрыть' }).click();
  await expect(user.getByText('Закрыта', { exact: true }).first()).toBeVisible();

  const manager = await openSession(browser, MANAGER);
  await manager.goto('/dashboard');
  await expect(manager.getByRole('heading', { name: 'Заявки по статусам' })).toBeVisible();
  await manager.goto('/admin/audit');
  await manager.getByLabel('Действие').selectOption('TICKET_STATUS_CHANGED');
  await expect(manager.getByRole('listitem').getByText('Смена статуса').first()).toBeVisible();
});

test('пользователю закрыты чужие заявки и панель руководителя', async ({ browser }) => {
  const owner = await openSession(browser, USER);
  await createTicket(owner, `Личная заявка ${Date.now()}`);
  const ticketUrl = owner.url();

  const stranger = await openSession(browser, 'user2@helpdesk.local');
  await stranger.goto(ticketUrl);
  await expect(stranger.getByText('Заявка не найдена')).toBeVisible();

  await stranger.goto('/dashboard');
  await expect(stranger.getByText('Недостаточно прав')).toBeVisible();
  await expect(stranger.getByRole('link', { name: 'Журнал аудита' })).toHaveCount(0);
});
