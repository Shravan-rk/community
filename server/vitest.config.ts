import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-value-that-is-long-enough-0123456789',
      JWT_EXPIRES_IN: '1h',
      BCRYPT_ROUNDS: '4',
      CORS_ORIGIN: 'http://localhost:5173',
      STAFF_INVITE_CODE: 'test-staff-invite-code',
      ADMIN_INVITE_CODE: 'test-admin-invite-code',
      RATE_LIMIT_MAX: '10000',
      AUTH_RATE_LIMIT_MAX: '1000',
    },
  },
});
