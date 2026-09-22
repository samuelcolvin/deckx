/**
 * Browser entry point. Bundled by esbuild into `dist/deck.js`, which build.py places next
 * to the generated `index.html` and the page loads with a classic `<script src="deck.js">`.
 *
 * Everything below runs synchronously while the script executes at the end of <body>:
 * no DOMContentLoaded handler, no requestAnimationFrame, no dynamic imports. That keeps the
 * DOM complete before `load`, which is when headless Chrome prints to PDF.
 */

import { expandComponents, inlineImages } from './components.ts'
import { initDeck } from './deck.ts'
import hljsCss from './hljs.css'
import { renderMarkdown } from './render.ts'
import { buildSlide } from './slide.ts'
import { splitSlides } from './split.ts'
import baseCss from './styles/base.css'
import type { DeckConfig, DeckData } from './types.ts'

function readData(): DeckData {
  const node = document.getElementById('deck-data')
  if (!node) throw new Error('deckx: <script type="application/json" id="deck-data"> not found')
  return JSON.parse(node.textContent ?? '') as DeckData
}

function addStyle(css: string): void {
  if (!css) return
  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)
}

/** Replace the page with a readable error. build.py catches these first; this is the backstop. */
function showError(root: HTMLElement, message: string): void {
  const pre = document.createElement('pre')
  pre.style.cssText = 'margin:2rem;padding:1rem;font:14px/1.5 monospace;color:#ff6b6b;white-space:pre-wrap'
  pre.textContent = `deckx: ${message}`
  root.replaceChildren(pre)
}

function main(): void {
  const data = readData()
  const config: DeckConfig = { ...data.config, theme: data.config.theme ?? 'light', tabs: data.config.tabs ?? [] }
  const root = document.getElementById('root') ?? document.body

  // Base styles first, then code colours, then the user's styles.css so it wins.
  addStyle(baseCss)
  addStyle(hljsCss)
  addStyle(data.styles)
  // The theme class goes on <html> too so `@media print` body rules can scope by theme.
  document.documentElement.classList.add(`theme-${config.theme}`)

  const { preamble, slides } = splitSlides(data.markdown)
  if (slides.length === 0) {
    showError(root, 'no slides found: start each slide with a <slide .../> line')
    return
  }
  if (preamble.trim() !== '') {
    showError(root, `content before the first <slide .../> line:\n\n${preamble.trim()}`)
    return
  }

  const presenter = document.createElement('div')
  presenter.className = `deck-presenter theme-${config.theme}`
  const deck = document.createElement('div')
  deck.className = 'deck'
  for (const raw of slides) {
    const section = buildSlide(raw, renderMarkdown(raw.body), config)
    expandComponents(section, data.components)
    inlineImages(section, data.images)
    deck.append(section)
  }
  presenter.append(deck)
  root.replaceChildren(presenter)

  initDeck(presenter, config)
}

main()
