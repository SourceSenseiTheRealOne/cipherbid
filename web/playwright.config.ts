import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 1,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_CIPHERBID_NETWORK: 'sepolia',
      NEXT_PUBLIC_STARKNET_RPC_URL: 'https://api.zan.top/public/starknet-sepolia/rpc/v0_10',
      NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: '0x0705b1080174f2b10c02fd8b2e00b918e4dc91f9021ee6a208f53d5909fcc87d',
      NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: '0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4',
      NEXT_PUBLIC_STRK20_POOL_ADDRESS: '0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91',
      NEXT_PUBLIC_STRK_TOKEN_ADDRESS: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    },
  },
})
