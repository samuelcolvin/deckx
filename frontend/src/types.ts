/**
 * Shapes shared between `build.py` (which writes the JSON blob into the page)
 * and the browser runtime (which reads it). Keep in sync with `render_page` in build.py.
 */

/** A single tab entry shown in the slide topbar tab navigation. */
export interface DeckTab {
  id: string
  label: string
}

/**
 * Built-in deck theme. `light` / `dark` pick the palette; the `markdown-*`
 * variants add source-style decorations (heading `#` prefixes, `**` markers,
 * traffic-light dots, mono slide counter, diamond bullets).
 */
export type DeckTheme = 'light' | 'dark' | 'markdown-light' | 'markdown-dark'

/** Deck-level config, parsed from `deckx.toml` by build.py. */
export interface DeckConfig {
  /** Browser tab title; also the fallback when a slide has no title or h1. */
  title?: string
  theme: DeckTheme
  /** Optional footer text rendered bottom-right of every slide. */
  footer?: string
  /** Tabs for the topbar nav bar; `<slide tab="...">` highlights the matching one. */
  tabs: DeckTab[]
}

/** The JSON blob embedded in `<script type="application/json" id="deck-data">`. */
export interface DeckData {
  config: DeckConfig
  /** Raw `deck.md` source; slides are split and rendered in the browser. */
  markdown: string
  /** `<component src="X">` -> file contents, keyed by the `src` attribute. */
  components: Record<string, string>
  /** The user's `styles.css` (or an empty string). */
  styles: string
  /** Normalised relative image path -> `data:` URI. */
  images: Record<string, string>
}
