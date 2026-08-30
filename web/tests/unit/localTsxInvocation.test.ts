import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildLocalTsxInvocation } from '@/config/localTsxInvocation'

describe('buildLocalTsxInvocation', () => {
  it('uses the current Node executable and local tsx CLI without requiring a TTY', () => {
    const invocation = buildLocalTsxInvocation({
      nodeExecutable: process.execPath,
      cwd: process.cwd(),
      args: ['--version'],
    })

    expect(invocation.executable).toBe(process.execPath)
    expect(invocation.args[0]).toBe(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs'))
    expect(invocation.args).not.toContain('npx')
    expect(invocation.args).not.toContain('npx.cmd')

    const result = spawnSync(invocation.executable, invocation.args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/tsx v\d+/)
  })
})
