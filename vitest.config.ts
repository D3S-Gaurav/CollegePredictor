import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    /* Resolves the "@/*" -> "./src/*" alias from tsconfig.json natively,
       so no vite-tsconfig-paths plugin is required. */
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    /* Playwright specs live under __tests__/e2e and are driven by
       `npm run test:e2e`, not by Vitest. */
    exclude: ['__tests__/e2e/**', 'node_modules/**'],
    env: {
      /**
       * `src/lib/prisma.ts` reads DATABASE_URL when the module is first
       * imported, so a syntactically valid value must exist. Nothing here
       * connects: the API tests only assert request-validation failures,
       * which Zod rejects before any query is issued.
       */
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    },
  },
});
