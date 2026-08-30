import path from 'node:path'

export type LocalTsxInvocation = Readonly<{
  executable: string
  args: readonly string[]
}>

export function buildLocalTsxInvocation(
  input: Readonly<{
    nodeExecutable: string
    cwd: string
    args: readonly string[]
  }>,
): LocalTsxInvocation {
  if (!path.isAbsolute(input.nodeExecutable)) throw new Error('Node executable must be absolute')
  if (!path.isAbsolute(input.cwd)) throw new Error('Working directory must be absolute')

  return Object.freeze({
    executable: input.nodeExecutable,
    args: Object.freeze([path.join(input.cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs'), ...input.args]),
  })
}
