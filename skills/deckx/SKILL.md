---
name: deckx
description: Create a deck with deckx. Use when the user mentions "deckx", "deck" or "slides", asks to build a slide deck from MDX, asks to convert a brand palette into a deck stylesheet, or asks how to convert a deckx HTML deck into a PDF. Covers project layout, deckx.toml config, deck.mdx authoring, custom React components, the styles.css token contract, and the Chrome headless PDF command.
---

# deckx

`deckx` builds a single, self-contained HTML slide deck from one MDX file plus a CSS theme and an optional folder of React components. The HTML is print-ready and converts to PDF via Chrome headless.

## Installation

```bash
bun add -d @samuelcolvin/deckx
```

The npm package is `@samuelcolvin/deckx`; the installed CLI binary is `deckx`. `npm i -D` / `pnpm add -D` work the same way. Inside `deck.mdx` you always import from `"deckx"` (a Vite alias, not the npm name) - that doesn't change.

## Project layout

```
my-deck/
├── deckx.toml          # config: title, theme, tabs, footer, paths (all optional)
├── deck.mdx            # the slides
├── styles.css          # CSS variable overrides (optional)
└── components/         # optional custom React/TSX components
    └── Hello.tsx
```

```bash
bunx deckx dev          # dev server with HMR on http://localhost:5173/
bunx deckx html         # build to ./dist/index.html
bunx deckx pdf          # build HTML, then ./dist/deck.pdf via Chrome headless
```

## `deckx.toml`

All fields are optional - a deck with only `deck.mdx` works.

```toml
title = "My Deck - April 2026"        # browser tab title

# light | dark | markdown-light | markdown-dark   (default: light)
# "markdown-*" variants render source-style decorations on top:
# heading "#"/"##" prefixes, "**" strong markers, traffic-light dots,
# mono slide counter, diamond bullets.
theme = "light"

# Small footer rendered bottom-right of every slide.
footer = "Confidential - do not share"

# Path overrides (defaults shown).
mdx = "deck.mdx"
styles = "styles.css"
components = "components"

# Optional tab nav. When present, <Slide tab="..."> highlights the matching tab.
tabs = [
  { id = "intro", label = "Intro" },
  { id = "details", label = "Details" },
]
```

If `tabs` is omitted, the `tab` prop on `<Slide>` is ignored and slides render with a plain title topbar.

## `deck.mdx`

Standard MDX. Import `Slide` from `"deckx"`, plus any custom components from `./components/`.

```mdx
import { Slide } from "deckx";
import Hello from "./components/Hello.tsx";

<Slide theme="title" title="Investor Deck / April 2026">

### Section Label

# My Deck

## A subtitle

</Slide>

<Slide tab="intro">

# Hello world

- Bullet one
- Bullet two

<Hello name="friend" />

</Slide>

<Slide theme="statement">

# One big idea.

</Slide>
```

**Do NOT wrap slides in `<div className="deck">`** - deckx adds it for you.

### `<Slide>` props

- `theme`: `'dark'` (default) | `'light'` | `'statement'` | `'title'` - per-slide variant. `light` forces `--bg-light` regardless of deck theme. `title` bottom-aligns the hero. `statement` centers content.
- `tab`: string matching an `id` from `deckx.toml` tabs - highlights that tab in the topbar.
- `title`: string - topbar text when no `tab` is set. Useful for cover slides. Ignored if `tab` is set.
- `space`: `'tight'` | `'wide'` - vertical spacing density.
- `fontSize`: `'large'` - bigger body text.
- `id`: string - HTML id for deep-linking.

### MDX gotchas

- Use `-` (hyphen-minus), never `—` (em dash).
- Keep blank lines around block elements inside a slide, but **not** between the last block and the closing `</Slide>` - MDX misparses a trailing blank.
- `### Section Label` at the top of a slide renders as a diamond + uppercase mono label.
- Slides must fit **279.4mm × 157.2mm** (16:9). If overflowing, try `space="tight"` first, then drop content.

### Images

Place images in your project (e.g. `assets/`) and import as ES modules:

```mdx
import logo from "./assets/logo.png";
<img src={logo} alt="Logo" />
```

Vite inlines them into the final HTML. The markdown `![alt](path)` syntax does **not** get inlined - always use `<img src={imported} />`.

## Custom components

Any `.tsx` file in `components/` (or wherever `deckx.toml` `components` points) can be imported into `deck.mdx` with a relative path:

```tsx
// components/Hello.tsx
export default function Hello({ name }: { name: string }) {
  return <p>Hello, {name}!</p>;
}
```

```mdx
import Hello from "./components/Hello.tsx";
<Hello name="world" />
```

React 19 is available. Components see the same CSS variables your `styles.css` defines, so to stay on-brand, read from variables (`color: var(--accent)`) rather than hard-coding colors.

## Authoring `styles.css`

The base stylesheet handles all layout, typography, slide dimensions, the topbar, transitions, and the PDF `@page` setup. `styles.css` only needs to override CSS variables on `:root` to set brand tokens.

### Variable contract

Backgrounds:

- `--bg-deck` (default `#0d0d0d`) - background outside the slide, presenter mode only.
- `--bg-slide` (default `#1a1a1a`) - default slide background.
- `--bg-light` (default `#ffffff`) - slide bg for `light` / `markdown-light` decks and `<Slide theme="light">`.
- `--surface` (default `#2a2a2a`) - inline code background, table headers.

Text:

- `--color-text` (default white @ 85%) - body text on dark slides.
- `--color-heading` (default `#ffffff`) - h1, h2, h4, strong on dark slides.
- `--color-muted` (default `#8f888e`) - heading prefixes, slide counter, subdued UI.
- `--color-text-light` (default `#2a2230`) - body text on light slides.
- `--color-heading-light` (default `#1a1018`) - headings on light slides.

Accents:

- `--accent` (default `#4a9eff`) - primary accent: bullets, h3, links, blockquote bar.
- `--accent-secondary` (default `#ff6b6b`) - em, link hover.
- `--accent-tertiary` (default `#b388ff`) - hr gradient stop.
- `--accent-aqua` (default `#4ad7c5`) - inline code text, active tab, topbar tabs.

Fonts:

- `--font-body` (default system sans stack) - body and headings, unless `--font-heading` overrides.
- `--font-heading` (default inherits body) - headings.
- `--font-mono` (default system mono) - inline code, code blocks, tabs, counter, h3.
- `--font-terminal` (default inherits body) - body inside `.slide-body`.

### Mapping a brand palette

1. Pick the **most distinctive** brand color, assign to `--accent`. Pick a warm counterpoint as `--accent-secondary`.
2. Pick a slightly off-white for `--color-heading` (pure white reads sterile under projector light).
3. Pick a tinted dark for `--bg-slide` (pure black is harsh).
4. For light slides, pick a tinted light bg (cream, eggshell, lavender - not pure white) plus a near-black text color → `--bg-light` / `--color-heading-light` / `--color-text-light`.
5. For custom fonts, load at the top of `styles.css` via `@import` or `@font-face`, then point `--font-body` / `--font-mono` at them.

```css
:root {
  --bg-slide: #...;       /* tinted dark */
  --bg-light: #...;       /* tinted light */
  --surface: #...;

  --color-heading: #...;  /* off-white */
  --color-text: rgba(...);
  --color-heading-light: #...;
  --color-text-light: #...;

  --accent: #...;            /* signature brand color */
  --accent-secondary: #...;  /* warm counterpoint */

  --font-body: 'YourFont', system-ui, sans-serif;
  --font-mono: 'YourFontMono', ui-monospace, monospace;
}
```

## Building & PDF

`bunx deckx pdf` is the easy path: it builds the HTML, prints the exact Chrome command it's about to run, then runs it. Output lands at `./dist/deck.pdf`.

If Chrome / Chromium can't be found, copy the printed command and run it yourself with the right binary path. On Linux deckx auto-detects `google-chrome`, `google-chrome-stable`, `chromium`, or `chromium-browser`.

Paper size in the printed command matches the slide dimensions (11in × 6.1875in = 16:9). If you override `--slide-width` / `--slide-height` in `styles.css`, edit the `--paper-*` flags to match before running.

To spot-check the PDF (requires `pdftoppm` from poppler):

```bash
mkdir -p ./tmp && pdftoppm -r 100 ./dist/deck.pdf ./tmp/page -png
```

One PNG per slide lands in `./tmp/`, gitignore that path.
