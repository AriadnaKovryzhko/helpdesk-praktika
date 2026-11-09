CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex
DROP INDEX "tickets_title_idx";

-- DropIndex
DROP INDEX "users_full_name_idx";

-- CreateIndex
CREATE INDEX "tickets_title_trgm_idx" ON "tickets" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "tickets_description_trgm_idx" ON "tickets" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "users_full_name_trgm_idx" ON "users" USING GIN ("full_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "users_email_trgm_idx" ON "users" USING GIN ("email" gin_trgm_ops);

