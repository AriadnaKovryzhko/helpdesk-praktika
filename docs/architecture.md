# Архитектура

## Компоненты

```mermaid
flowchart LR
    Browser["Браузер: React SPA"]
    subgraph Docker["docker compose"]
        Nginx["frontend: Nginx"]
        Backend["backend: NestJS"]
        DB[("db: PostgreSQL")]
        Files[("том с вложениями")]
    end
    Browser -- "HTTPS: статические файлы" --> Nginx
    Browser -- "/api" --> Nginx
    Browser -- "/socket.io: WebSocket" --> Nginx
    Nginx -- "HTTP" --> Backend
    Nginx -- "Upgrade" --> Backend
    Backend -- "Prisma" --> DB
    Backend -- "файлы" --> Files
```

## Слои backend

```mermaid
flowchart TB
    Guards["Guards: JWT, роли, лимит запросов"]
    Controllers["Контроллеры: маршруты и DTO"]
    Services["Сервисы: бизнес-логика и проверка доступа"]
    Repositories["Репозитории: запросы Prisma"]
    Prisma["PrismaClient"]
    Guards --> Controllers --> Services --> Repositories --> Prisma
```

Контроллеры только принимают запрос и вызывают сервис. Сервисы содержат правила: права доступа, переходы статусов, расчёт SLA. Репозитории содержат запросы к базе данных.

Сквозные механизмы: `ResponseInterceptor` формирует ответ `{ data, meta }`, `AllExceptionsFilter` формирует ошибку `{ error }`, глобальный `ValidationPipe` проверяет DTO и возвращает сообщения на русском языке.

## Аутентификация

```mermaid
sequenceDiagram
    participant C as Браузер
    participant A as API
    participant D as БД
    C->>A: POST /api/auth/login
    A->>D: проверка пароля (argon2), запись хэша refresh-токена
    A-->>C: access-токен (15 минут) и refresh в httpOnly cookie
    C->>A: запросы с заголовком Authorization
    A->>D: проверка, что пользователь не заблокирован
    A-->>C: данные
    C->>A: POST /api/auth/refresh (cookie)
    A->>D: отзыв старого токена, запись нового
    A-->>C: новый access-токен и новый refresh
    Note over A,D: Повторное использование отозванного токена отзывает всю цепочку
```

Access-токен хранится только в памяти браузера, поэтому недоступен после перезагрузки страницы и не лежит в localStorage. Cookie с refresh-токеном недоступна из JavaScript, имеет SameSite=Lax и ограничена путём `/api/auth`.

## Уведомления

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant A as API
    participant G as WebSocket-шлюз
    participant E as Исполнитель
    E->>G: подключение с access-токеном
    G->>G: проверка токена, вход в комнату user:id
    U->>A: POST /api/tickets
    A->>A: запись заявки и уведомлений
    A->>G: отправка в комнаты получателей
    G-->>E: событие notification
```

## SLA

Фоновая задача с расписанием раз в минуту находит заявки с истёкшими сроками, записывает время просрочки и создаёт уведомления исполнителю и руководителям. Запись времени просрочки гарантирует, что уведомление создаётся один раз.

## Статусы заявки

```mermaid
stateDiagram-v2
    [*] --> NEW
    NEW --> ASSIGNED
    ASSIGNED --> IN_PROGRESS
    IN_PROGRESS --> WAITING_USER
    WAITING_USER --> IN_PROGRESS
    IN_PROGRESS --> RESOLVED
    RESOLVED --> IN_PROGRESS: переоткрытие
    RESOLVED --> CLOSED
    CLOSED --> [*]
```
