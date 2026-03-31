import type { Config } from 'jest'

const config: Config = {
  preset: 'jest-puppeteer',
  setupFilesAfterEnv: ['expect-puppeteer'],
}

export default config
