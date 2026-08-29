import type { NextConfig } from 'next'

type NextEnvironment = Readonly<Record<string, string | undefined>>

export function createNextConfig(environment: NextEnvironment): NextConfig {
  if (environment.CIPHERBID_PAGES_BUILD !== '1') return {}

  const requestedBasePath = environment.CIPHERBID_PAGES_BASE_PATH?.trim()
  if (requestedBasePath && requestedBasePath !== '/cipherbid') {
    throw new Error('GitHub Pages base path must be /cipherbid')
  }

  return {
    output: 'export',
    basePath: '/cipherbid',
    trailingSlash: true,
  }
}

const nextConfig = createNextConfig(process.env)

export default nextConfig
