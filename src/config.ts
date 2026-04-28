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
  /** Tab list used by <Slide tab="..."> in the topbar. */
  tabs: DeckTab[]
  /** Absolute path to the user's working directory. */
  cwd: string
  /** Absolute path to the user's deck.mdx file. */
  mdxPath: string
  /** Absolute path to the user's styles.css file. */
  stylesPath: string
  /** Absolute path to the user's components/ directory (may not exist). */
  componentsDir: string
}

/** Raw shape of deckx.toml before path resolution. */
interface RawConfig {
  title?: string
  theme?: string
  mdx?: string
  styles?: string
  components?: string
  tabs?: DeckTab[]
}

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
      throw new Error(`deckx: every [[tabs]] entry must have string \`id\` and \`label\`. Got ${JSON.stringify(t)}`)
    }
  }

  let theme: DeckTheme = 'light'
  if (raw.theme !== undefined) {
    if (!(DECK_THEMES as readonly string[]).includes(raw.theme)) {
      throw new Error(`deckx: invalid theme "${raw.theme}". Valid values: ${DECK_THEMES.join(', ')}.`)
    }
    theme = raw.theme as DeckTheme
  }

  return {
    title: typeof raw.title === 'string' ? raw.title : undefined,
    theme,
    tabs,
    cwd: absCwd,
    mdxPath,
    stylesPath,
    componentsDir,
  }
}
