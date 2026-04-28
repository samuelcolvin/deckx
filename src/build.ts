import { renameSync } from 'node:fs'
import path from 'node:path'
import { build as viteBuild } from 'vite'
import { loadConfig } from './config.ts'
import { buildViteConfig } from './vite-config.ts'

/**
 * Build the deck to a single self-contained HTML file.
 *
 * @param cwd        Source directory (where deckx.toml + deck.mdx live).
 * @param outputPath Optional output HTML path (resolved against process.cwd()).
 *                   Defaults to `<cwd>/dist/index.html`.
 */
export async function build(cwd: string, outputPath?: string): Promise<string> {
  const cfg = loadConfig(cwd)
  const finalPath = outputPath ? path.resolve(process.cwd(), outputPath) : path.join(cfg.cwd, 'dist', 'index.html')

  const viteConfig = buildViteConfig(cfg, 'build')
  // Vite always names the entry HTML "index.html"; we redirect outDir to the
  // user's chosen directory and rename the result if their basename differs.
  if (outputPath) {
    viteConfig.build = {
      ...viteConfig.build,
      outDir: path.dirname(finalPath),
      // Don't wipe a directory that may contain unrelated files.
      emptyOutDir: false,
    }
  }
  await viteBuild(viteConfig)

  if (outputPath) {
    const intermediate = path.join(path.dirname(finalPath), 'index.html')
    if (intermediate !== finalPath) renameSync(intermediate, finalPath)
  }

  // Log a path relative to the user's invocation cwd so it's easy to copy/click.
  console.log(`deckx: wrote ${path.relative(process.cwd(), finalPath) || finalPath}`)
  return finalPath
}
