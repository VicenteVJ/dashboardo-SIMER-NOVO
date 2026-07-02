import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('entrada da Function seleciona Netlify Blobs antes de carregar o Express', () => {
  const storageModule = new URL('../services/storageService.js', import.meta.url).href
  const script = `import('${storageModule}').then(({ storageProvider }) => process.stdout.write(storageProvider))`
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      STORAGE_DIR: '',
      NETLIFY: '',
      NETLIFY_DEV: '',
      AWS_LAMBDA_FUNCTION_NAME: '',
      NETLIFY_FUNCTION: 'true'
    }
  })

  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stdout, 'netlify-blobs')
})
