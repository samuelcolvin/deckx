import path from 'node:path'
import { createServer, type ViteDevServer } from 'vite'
import { loadConfig } from './config.ts'
import { buildViteConfig } from './vite-config.ts'

/**
 * Start the Vite dev server with HMR for live deck editing.
 *
 * Watches `deckx.toml` and fully restarts the server when it changes. A
 * restart is required (rather than a hot config swap) because the resolved
 * config is captured in closures during `buildViteConfig` - aliases, the
 * rehype-shiki theme options and the favicon data URI are all baked in at
 * plugin construction time and Vite has no supported way to mutate them
 * on a live server.
 */
export async function dev(cwd: string): Promise<void> {
  const tomlPath = path.resolve(cwd, 'deckx.toml')
  let server: ViteDevServer | null = null
  let restarting = false

  const start = async () => {
    const cfg = loadConfig(cwd)
    server = await createServer(buildViteConfig(cfg, 'dev'))
    await server.listen()
    server.printUrls()
    // Piggy-back on Vite's chokidar instance: it handles editor atomic-save
    // patterns reliably and is torn down by `server.close()`, so each restart
    // cycle starts with a fresh watcher and no listener leak.
    server.watcher.add(tomlPath)
    server.watcher.on('change', (file) => {
      if (path.resolve(file) === tomlPath) restart()
    })
  }

  const restart = async () => {
    if (restarting) return
    restarting = true
    console.log('\ndeckx: deckx.toml changed, restarting dev server...\n')
    try {
      if (server) await server.close()
      server = null
      await start()
    } catch (e) {
      console.error(`deckx: failed to restart: ${e instanceof Error ? e.message : e}`)
      console.error('deckx: fix the issue and save deckx.toml again to retry.')
    } finally {
      restarting = false
    }
  }

  await start()
}
