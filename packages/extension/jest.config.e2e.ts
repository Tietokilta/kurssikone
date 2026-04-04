import type { Config } from 'jest'

/** Puppeteer + live Sisu; run via `npm run test:e2e --prefix packages/extension`. */
const config: Config = {
  preset: 'jest-puppeteer',
  testMatch: ['<rootDir>/src/e2e/**/*.test.ts'],
}

export default config
