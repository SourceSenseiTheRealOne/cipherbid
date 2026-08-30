import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { verifyCiWorkflow } from '../src/config/ciWorkflowPolicy'

const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'ci.yml')
const errors = existsSync(workflowPath)
  ? verifyCiWorkflow(readFileSync(workflowPath, 'utf8'))
  : ['workflow-file-missing']

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else {
  console.log('ci_workflow_policy=passed')
}
