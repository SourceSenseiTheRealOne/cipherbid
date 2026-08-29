import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { verifyPagesWorkflow } from '../src/config/pagesWorkflowPolicy'

const workflowPath = path.resolve(process.cwd(), '..', '.github', 'workflows', 'deploy-pages.yml')
const errors = existsSync(workflowPath)
  ? verifyPagesWorkflow(readFileSync(workflowPath, 'utf8'))
  : ['workflow-file-missing']

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else {
  console.log('pages_workflow_policy=passed')
}
