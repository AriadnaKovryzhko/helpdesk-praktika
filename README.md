# Help Desk

Сервис учёта заявок в техподдержку. Учебная практика, специальность 09.02.07.

Пользователи создают заявки, исполнители решают их в пределах сроков SLA, руководитель распределяет работу и видит показатели. Участники получают уведомления в реальном времени.

## Команда

- Ариадна Коврыжко: backend, база данных, Docker, CI.
- Вика Балеевских: frontend и его тесты.

## Возможности

- Регистрация, вход, JWT access на 15 минут, refresh в httpOnly cookie с ротацией, восстановление пароля.
- Роли USER, AGENT и MANAGER с проверкой на сервере.
- Заявки: поиск, фильтры, сортировка и пагинация на сервере, проверка переходов статусов, история изменений.
- Сроки SLA по приоритету, фоновая задача отмечает просрочки, на клиенте идёт обратный отсчёт.
- Комментарии и вложения jpg, png, pdf, docx до 5 МБ с проверкой типа по содержимому.
- Личный кабинет, панель руководителя, блокировка пользователей, дашборд с графиками.
- Уведомления через WebSocket с авторизацией по токену, журнал аудита.
- Адаптивный интерфейс от 360 до 1920 px.

## Стек

| Часть | Технологии |
| --- | --- |
| Backend | Node.js 24, NestJS 11.2, TypeScript 5.9 (strict), Prisma 6.19, Socket.IO 4.8, argon2 |
| База данных | PostgreSQL 17 |
| Frontend | React 18.3, Vite 6.4, TypeScript 5.9 (strict), React Router 6.30, TanStack Query 5, Tailwind CSS 3.4, Recharts 2.15 |
| Тесты | Jest 29, Supertest, Vitest 3, Testing Library, Playwright 1.65 |
| Инфраструктура | Docker, docker compose, Nginx 1.27, GitHub Actions |

Версии зависимостей зафиксированы в `package.json` и `package-lock.json`.

## Запуск через Docker

```bash
docker compose up --build
```

Приложение откроется на http://localhost:8080, документация API на http://localhost:8080/api/docs.

При старте backend применяет миграции и заполняет базу тестовыми данными. Значения по умолчанию подходят только для локального запуска. Чтобы их изменить, скопируйте `.env.example` в `.env`.

## Тестовые учётные записи

Пароль для всех записей: `Password123!`

| Роль | Email |
| --- | --- |
| Руководитель (MANAGER) | manager@helpdesk.local |
| Исполнитель (AGENT) | agent1@helpdesk.local, agent2@helpdesk.local |
| Пользователь (USER) | user1@helpdesk.local, user2@helpdesk.local, user3@helpdesk.local |

## Локальная разработка

Нужны Node.js 24 и PostgreSQL 17.

```bash
cd backend
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

В другом терминале:

```bash
cd frontend
npm ci
npm run dev
```

Адрес базы данных задаётся переменной `DATABASE_URL` в `backend/.env`.

## Тесты

```bash
cd backend && npm run test:cov
cd backend && npm run test:int
cd frontend && npm test
cd e2e && npx playwright test
```

Интеграционным тестам нужна отдельная база с применёнными миграциями и seed. Сценарии Playwright запускаются на работающем приложении, адрес задаётся переменной `BASE_URL`.

## Документация

- [Спецификация](docs/SPEC.md)
- [Пользовательские истории](docs/user-stories.md)
- [ER-диаграмма](docs/er-diagram.md)
- [Архитектура](docs/architecture.md)
- [OpenAPI](docs/openapi.yaml)
- [Отчёт о тестировании](docs/test-report.md)

## Процесс

Ветка `main` защищена: изменения попадают в неё только через PR с одобрением и успешным CI. CI запускает линтер, тесты, сборку образов, поднимает docker compose, проверяет `/api/health` и главную страницу, затем выполняет сценарии Playwright.
