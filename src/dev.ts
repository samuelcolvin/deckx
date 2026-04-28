import { createServer } from 'vite'
import { loadConfig } from './config.ts'
import { buildViteConfig } from './vite-config.ts'

/** Start the Vite dev server with HMR for live deck editing. */
export async function dev(cwd: string): Promise<void> {
  const cfg = loadConfig(cwd)
  const server = await createServer(buildViteConfig(cfg, 'dev'))
  await server.listen()
  server.printUrls()
}
