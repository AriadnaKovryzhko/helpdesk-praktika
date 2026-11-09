#!/bin/sh
set -e
npx prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  node dist/prisma/seed.js
fi
exec node dist/src/main.js
