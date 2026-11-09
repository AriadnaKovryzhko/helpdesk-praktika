# ER-диаграмма

```mermaid
erDiagram
    users ||--o{ user_roles : has
    roles ||--o{ user_roles : grants
    users ||--o{ refresh_tokens : owns
    users ||--o{ password_reset_tokens : requests
    users ||--o{ tickets : creates
    users ||--o{ tickets : "is assigned"
    categories ||--o{ tickets : classifies
    sla_policies ||--o{ tickets : "sets deadlines"
    tickets ||--o{ ticket_comments : contains
    users ||--o{ ticket_comments : writes
    tickets ||--o{ ticket_attachments : includes
    users ||--o{ ticket_attachments : uploads
    tickets ||--o{ ticket_status_history : records
    users ||--o{ ticket_status_history : changes
    users ||--o{ notifications : receives
    tickets ||--o{ notifications : "refers to"
    users ||--o{ audit_logs : performs

    users {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        boolean is_blocked
        timestamp created_at
        timestamp updated_at
    }
    roles {
        int id PK
        enum code UK
        string name
    }
    user_roles {
        uuid user_id PK, FK
        int role_id PK, FK
    }
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        uuid family_id
        string token_hash UK
        timestamp expires_at
        timestamp revoked_at
        timestamp created_at
    }
    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        timestamp used_at
        timestamp created_at
    }
    categories {
        int id PK
        string name UK
        string description
        boolean is_active
    }
    sla_policies {
        int id PK
        enum priority UK
        int reaction_minutes
        int resolution_minutes
    }
    tickets {
        uuid id PK
        int number UK
        string title
        text description
        enum status
        enum priority FK
        int category_id FK
        uuid author_id FK
        uuid assignee_id FK
        timestamp reaction_due_at
        timestamp resolution_due_at
        timestamp reacted_at
        timestamp resolved_at
        timestamp closed_at
        timestamp reaction_breached_at
        timestamp resolution_breached_at
        timestamp created_at
        timestamp updated_at
    }
    ticket_comments {
        uuid id PK
        uuid ticket_id FK
        uuid author_id FK
        text body
        timestamp created_at
        timestamp updated_at
    }
    ticket_attachments {
        uuid id PK
        uuid ticket_id FK
        uuid uploader_id FK
        string original_name
        string stored_name UK
        string mime_type
        int size_bytes
        timestamp created_at
    }
    ticket_status_history {
        uuid id PK
        uuid ticket_id FK
        uuid changed_by_id FK
        enum from_status
        enum to_status
        string comment
        timestamp created_at
    }
    notifications {
        uuid id PK
        uuid user_id FK
        uuid ticket_id FK
        enum type
        string title
        string body
        timestamp read_at
        timestamp created_at
    }
    audit_logs {
        uuid id PK
        uuid actor_id FK
        string action
        string entity_type
        string entity_id
        jsonb details
        string ip
        timestamp created_at
    }
```

## Нормализация

- Роли вынесены в справочник `roles`, связь с пользователями M:N хранится в `user_roles`.
- Приоритет в `tickets` является внешним ключом на уникальное поле `sla_policies.priority`, поэтому минуты SLA хранятся только в политике.
- Сроки в заявке являются зафиксированным на момент расчёта фактом: изменение политики не меняет уже созданные заявки.
- Токены хранятся только в виде хэша.
