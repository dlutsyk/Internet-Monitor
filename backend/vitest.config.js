import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'prisma/',
        'src/server.js',
        '**/*.test.js',
        '**/*.spec.js',
      ],
    },
    include: ['**/*.test.js', '**/*.spec.js'],
    testTimeout: 10000,
  },
});
