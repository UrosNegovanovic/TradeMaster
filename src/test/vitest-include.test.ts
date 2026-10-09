import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * vitest.config.ts lists unit tests explicitly; a file missing from that list never runs in CI.
 * This guard fails when a new *.test.ts under src/ is not listed (DB and integration tests run elsewhere).
 */
function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return testFiles(full)
    return entry.name.endsWith('.test.ts') ? [full] : []
  })
}

describe('vitest include list', () => {
  it('runs every unit test file under src/', () => {
    const root = process.cwd()
    const config = readFileSync(path.join(root, 'vitest.config.ts'), 'utf8')
    const missing = testFiles(path.join(root, 'src'))
      .map((file) => path.relative(root, file).split(path.sep).join('/'))
      .filter((file) => !/\.(db|integration)\.test\.ts$/.test(file))
      .filter((file) => !config.includes(`'${file}'`))
    expect(missing, 'add these to the include list in vitest.config.ts').toEqual([])
  })
})
