import { describe, expect, it } from 'vitest'
import config from '../../playwright.config'

describe('Playwright server ownership', () => {
  it('starts the current checkout directly and never reuses a stale server', () => {
    const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer

    expect(config.workers).toBe(1)
    expect(config.timeout).toBe(60_000)
    expect(webServer).toMatchObject({
      command: 'node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    })
  })
})
