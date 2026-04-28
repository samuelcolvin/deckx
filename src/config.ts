import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import toml from '@iarna/toml'

/** A single tab entry in the slide topbar tab navigation. */
export interface DeckTab {
  id: string
  label: string
}

/**
 * Built-in deck theme. Controls background/text colors and the level of
 * markdown-style decoration (heading prefixes, ** markers, traffic-light
 * dots, mono slide counter).
 *
 *  - `light`           - white bg, dark text, no decoration.
 *  - `dark`            - dark bg, light text, no decoration.
 *  - `markdown-light`  - light bg, dark text, with decoration.
 *  - `markdown-dark`   - dark bg, light text, with decoration.
 */
export type DeckTheme = 'light' | 'dark' | 'markdown-light' | 'markdown-dark'

const DECK_THEMES: readonly DeckTheme[] = ['light', 'dark', 'markdown-light', 'markdown-dark']

/** Resolved deckx config with all paths absolute and defaults applied. */
export interface ResolvedDeckxConfig {
  /** Browser tab title; also used as the document.title fallback. */
  title?: string
  /** Built-in theme name. Defaults to 'light'. */
  theme: DeckTheme
  /** Optional footer text rendered in the bottom-right of every slide. */
  footer?: string
  /** Tab list used by <Slide tab="..."> in the topbar. */
  tabs: DeckTab[]
  /** Shiki theme used for code blocks on light slides. Defaults to 'github-light'. */
  codeLightTheme: string
  /** Shiki theme used for code blocks on dark slides. Defaults to 'github-dark'. */
  codeDarkTheme: string
  /** Absolute path to the user's working directory. */
  cwd: string
  /** Absolute path to the user's deck.mdx file. */
  mdxPath: string
  /** Absolute path to the user's styles.css file. */
  stylesPath: string
  /** Absolute path to the user's components/ directory (may not exist). */
  componentsDir: string
  /** Absolute path to a favicon file (.svg/.png/.ico/.jpg), or undefined. */
  faviconPath?: string
}

/** Raw shape of deckx.toml before path resolution. */
interface RawConfig {
  title?: string
  theme?: string
  footer?: string
  mdx?: string
  styles?: string
  components?: string
  favicon?: string
  tabs?: DeckTab[]
  code_light_theme?: string
  code_dark_theme?: string
}

const FAVICON_EXTS = ['.svg', '.png', '.ico', '.jpg', '.jpeg'] as const

/**
 * Load deckx.toml from `cwd` (if present) and resolve all paths to absolutes.
 * Missing config file is allowed - defaults apply. Missing deck.mdx is fatal.
 */
export function loadConfig(cwd: string): ResolvedDeckxConfig {
  const absCwd = path.resolve(cwd)
  const tomlPath = path.join(absCwd, 'deckx.toml')

  let raw: RawConfig = {}
  if (existsSync(tomlPath)) {
    const text = readFileSync(tomlPath, 'utf8')
    raw = toml.parse(text) as RawConfig
  }

  const mdxPath = path.resolve(absCwd, raw.mdx ?? 'deck.mdx')
  const stylesPath = path.resolve(absCwd, raw.styles ?? 'styles.css')
  const componentsDir = path.resolve(absCwd, raw.components ?? 'components')

  if (!existsSync(mdxPath)) {
    throw new Error(`deckx: deck.mdx not found at ${mdxPath}`)
  }

  // styles.css is optional - if absent the deck still renders with deckx defaults.
  const tabs = Array.isArray(raw.tabs) ? raw.tabs : []
  for (const t of tabs) {
    if (typeof t.id !== 'string' || typeof t.label !== 'string') {
      throw new Error(`deckx: every \`tabs\` entry must have string \`id\` and \`label\`. Got ${JSON.stringify(t)}`)
    }
  }

  let theme: DeckTheme = 'light'
  if (raw.theme !== undefined) {
    if (!(DECK_THEMES as readonly string[]).includes(raw.theme)) {
      throw new Error(`deckx: invalid theme "${raw.theme}". Valid values: ${DECK_THEMES.join(', ')}.`)
    }
    theme = raw.theme as DeckTheme
  }

  let faviconPath: string | undefined
  if (typeof raw.favicon === 'string' && raw.favicon.length > 0) {
    faviconPath = path.resolve(absCwd, raw.favicon)
    if (!existsSync(faviconPath)) {
      throw new Error(`deckx: favicon not found at ${faviconPath}`)
    }
    const ext = path.extname(faviconPath).toLowerCase()
    if (!(FAVICON_EXTS as readonly string[]).includes(ext)) {
      throw new Error(`deckx: unsupported favicon extension "${ext}". Use one of: ${FAVICON_EXTS.join(', ')}.`)
    }
  }

  const codeLightTheme = resolveCodeTheme(raw.code_light_theme, 'code_light_theme', 'github-light')
  const codeDarkTheme = resolveCodeTheme(raw.code_dark_theme, 'code_dark_theme', 'github-dark')

  return {
    title: typeof raw.title === 'string' ? raw.title : undefined,
    theme,
    footer: typeof raw.footer === 'string' ? raw.footer : undefined,
    tabs,
    codeLightTheme,
    codeDarkTheme,
    cwd: absCwd,
    mdxPath,
    stylesPath,
    componentsDir,
    faviconPath,
  }
}

function resolveCodeTheme(value: unknown, key: string, fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`deckx: \`${key}\` must be a non-empty string. See https://shiki.style/themes for valid names.`)
  }
  return value
}
