import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Print the full deckx authoring guide (skills/deckx/SKILL.md) to stdout. */
export function skill(): void {
  // dist/cli.js sits at <pkg>/dist/cli.js; SKILL.md lives at <pkg>/skills/deckx/SKILL.md.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const skillPath = path.resolve(here, '..', 'skills', 'deckx', 'SKILL.md')
  const text = readFileSync(skillPath, 'utf8')
  process.stdout.write(text)
}
