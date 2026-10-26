// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    pool: 'forks',
    // Run test files one at a time to avoid cross-file teardown races on shared DB
    fileParallelism: false,
    env: { NODE_ENV: 'test' },
  },
});
