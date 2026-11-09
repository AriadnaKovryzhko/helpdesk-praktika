process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
process.env.APP_URL = 'http://localhost:5173';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres@localhost:5544/helpdesk_test';
process.env.JWT_ACCESS_SECRET = 'test-secret-with-enough-length-for-validation';
process.env.JWT_ACCESS_TTL_SECONDS = '900';
process.env.REFRESH_TTL_DAYS = '30';
process.env.COOKIE_SECURE = 'false';
process.env.AUTH_THROTTLE_LIMIT = '100000';
