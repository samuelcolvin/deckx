import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import remarkGfm from 'remark-gfm'
import type { InlineConfig, Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import type { ResolvedDeckxConfig } from './config.ts'

/**
 * Build a Vite InlineConfig that:
 *  - serves the deckx package's templates/index.html as the root entry
 *  - aliases `deckx`, `deckx-base-styles`, `deckx-user-deck`, `deckx-user-styles`
 *    to concrete files
 *  - emits a virtual `deckx-user-config` module exposing { title, theme, tabs }
 *  - processes MDX (with GFM) and JSX/TSX, then inlines everything via
 *    vite-plugin-singlefile.
 */
export function buildViteConfig(cfg: ResolvedDeckxConfig, mode: 'build' | 'dev'): InlineConfig {
  // dist/cli.js sits at <pkg>/dist/cli.js, so packageRoot is two levels up.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const packageRoot = path.resolve(here, '..')
  const templatesDir = path.join(packageRoot, 'templates')
  const distLib = path.join(packageRoot, 'dist', 'index.js')
  const baseStyles = path.join(packageRoot, 'src', 'styles', 'deck-base.css')

  if (!existsSync(distLib)) {
    throw new Error(
      `deckx: library bundle missing at ${distLib}. Did the package build run? (Run \`bun run build\` if developing locally.)`,
    )
  }

  return {
    root: templatesDir,
    plugins: [
      stripHtmlCommentsPlugin,
      virtualConfigPlugin(cfg),
      { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
      react({ include: /\.(jsx|tsx|mdx)$/ }),
      // Inline all assets into a single HTML file in build mode.
      ...(mode === 'build' ? [viteSingleFile()] : []),
    ],
    resolve: {
      alias: {
        deckx: distLib,
        'deckx-base-styles': baseStyles,
        'deckx-user-deck': cfg.mdxPath,
        'deckx-user-styles': cfg.stylesPath,
      },
      dedupe: ['react', 'react-dom'],
    },
    server: { fs: { allow: [packageRoot, cfg.cwd] } },
    build: {
      outDir: path.join(cfg.cwd, 'dist'),
      emptyOutDir: true,
      // singlefile plugin handles inlining; keep settings permissive.
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      reportCompressedSize: false,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  }
}

/**
 * Plugin: emit a synthetic `deckx-user-config` ES module containing the
 * deck title and tab list parsed from deckx.toml.
 */
function virtualConfigPlugin(cfg: ResolvedDeckxConfig): Plugin {
  const moduleId = 'deckx-user-config'
  const resolvedId = `\0${moduleId}`
  const payload = JSON.stringify({ title: cfg.title, theme: cfg.theme, tabs: cfg.tabs })
  return {
    name: 'deckx-virtual-config',
    resolveId(id) {
      return id === moduleId ? resolvedId : null
    },
    load(id) {
      if (id !== resolvedId) return null
      return `export const config = ${payload}\n`
    },
  }
}

/**
 * Plugin: strip HTML comments from .mdx files before the MDX parser sees them.
 * MDX 3 chokes on `<!-- ... -->` so this acts as a safety net.
 */
const stripHtmlCommentsPlugin: Plugin = {
  name: 'deckx-strip-html-comments',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('.mdx')) return
    return code.replace(/<!--[\s\S]*?-->/g, '')
  },
}
