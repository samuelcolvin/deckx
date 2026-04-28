import path from 'node:path'
import { build as viteBuild } from 'vite'
import { loadConfig } from './config.ts'
import { buildViteConfig } from './vite-config.ts'

/** Build the deck to a single self-contained HTML file in <cwd>/dist. */
export async function build(cwd: string): Promise<string> {
  const cfg = loadConfig(cwd)
  await viteBuild(buildViteConfig(cfg, 'build'))
  const out = path.join(cfg.cwd, 'dist', 'index.html')
  // Log a path relative to the user's invocation cwd so it's easy to copy/click.
  console.log(`deckx: wrote ${path.relative(process.cwd(), out) || out}`)
  return out
}
