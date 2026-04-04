import type { Config } from 'jest'

/** Unit / Node tests only. Browser E2E lives in `src/e2e/` and uses `jest.config.e2e.ts`. */
const config: Config = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/e2e/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
}

export default config
