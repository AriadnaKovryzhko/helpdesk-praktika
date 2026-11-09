process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5544/helpdesk_test';
