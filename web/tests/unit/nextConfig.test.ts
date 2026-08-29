import { describe, expect, it } from 'vitest'
import { createNextConfig } from '../../next.config'

describe('Next.js deployment configuration', () => {
  it('keeps local development and Playwright server rendering unchanged', () => {
    expect(createNextConfig({})).toEqual({})
    expect(createNextConfig({ CIPHERBID_PAGES_BUILD: '0' })).toEqual({})
  })

  it('enables one deterministic GitHub Pages export shape', () => {
    expect(createNextConfig({ CIPHERBID_PAGES_BUILD: '1' })).toEqual({
      output: 'export',
      basePath: '/cipherbid',
      trailingSlash: true,
    })
  })

  it('rejects attempts to build Pages under a different base path', () => {
    expect(() => createNextConfig({ CIPHERBID_PAGES_BUILD: '1', CIPHERBID_PAGES_BASE_PATH: '/different' })).toThrow(
      'GitHub Pages base path must be /cipherbid',
    )
  })
})
