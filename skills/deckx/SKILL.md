---
name: deckx
description: Author or build a deckx slide deck. Use when the user mentions "deckx", asks to build a slide deck from MDX, asks to convert a brand palette into a deck stylesheet, or asks how to convert a deckx HTML deck into a PDF. Covers project layout, deckx.toml config, deck.mdx authoring, custom React components, the styles.css token contract, and the Chrome headless PDF command.
---

# deckx

`deckx` builds a single, self-contained HTML slide deck from an MDX file plus a CSS theme and an optional folder of React components. The HTML is print-ready and converts cleanly to PDF via Chrome headless.

## Project layout

A deckx project is just a directory:

```
my-deck/
├── deckx.toml          # config: title, tabs, paths (all optional)
├── deck.mdx            # the slides, written in MDX
├── styles.css          # theme tokens (CSS variables)
└── components/         # optional: custom React/TSX components
    └── Hello.tsx
```

Build with:

```bash
bunx deckx              # → dist/index.html
bunx deckx dev          # live dev server at http://localhost:5173/
```

`npx deckx` works too if bun is unavailable.

## `deckx.toml`

```toml
title = "My Deck - April 2026"   # browser tab title (optional)

# All paths default to the values shown; only set if you want different ones.
mdx = "deck.mdx"
styles = "styles.css"
components = "components"

# Tabs are optional. When present, <Slide tab="..."> renders a tab nav bar.
[[tabs]]
id = "intro"
label = "Intro"

[[tabs]]
id = "details"
label = "Details"
```

If you omit `[[tabs]]` entirely, slides render with a plain title topbar and the `tab` prop on `<Slide>` is ignored.

## `deck.mdx`

A standard MDX file. Import `Slide` from `deckx`, plus any custom components from `./components/`.

```mdx
import { Slide } from "deckx";
import Hello from "./components/Hello.tsx";

<Slide theme="title">

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

<Slide theme="light">

# A light slide

Body text goes here.

</Slide>

<Slide theme="statement">

# One big idea.

</Slide>
```

**Do NOT wrap slides in a `<div className="deck">` element** - deckx adds it for you. (The user-facing API differs from how the deckx repo's own internals work.)

### `<Slide>` props

| Prop       | Values                                  | Effect                                               |
|------------|-----------------------------------------|------------------------------------------------------|
| `theme`    | `'dark'` (default), `'light'`, `'statement'`, `'title'` | Visual variant. `light` uses `--bg-light`. `title` bottom-aligns the hero. `statement` centers content. |
| `tab`      | matching `id` from `deckx.toml` tabs    | Highlights that tab in the topbar nav bar.           |
| `title`    | string                                  | Plain title in the topbar (when no `tab` is set).    |
| `space`    | `'tight'` or `'wide'`                   | Vertical spacing density.                            |
| `fontSize` | `'large'`                               | Bumps up body text size.                             |
| `id`       | string                                  | HTML id for deep-linking.                            |

### MDX gotchas

- Use `-` (hyphen-minus), never the typographic em dash `—`. Easier to type, identical-enough on screen, avoids encoding surprises.
- Keep blank lines around block elements inside a slide, but **not** between the last block and the closing `</Slide>` (MDX will misparse a trailing blank).
- `### Section Label` at the top of a slide renders as the diamond + uppercase mono label by default.
- Use markdown bullets, numbered lists, tables, and code blocks freely - the styling is handled.

### Images

Place images in your project (e.g. `assets/`) and import as ES modules:

```mdx
import logo from "./assets/logo.png";

<img src={logo} alt="Logo" />
```

Vite inlines them into the final HTML. Don't use `![alt](path)` markdown syntax - those don't get inlined.

## Custom components

Any `.tsx` file in `components/` (or wherever your `deckx.toml` `components` setting points) can be imported directly into `deck.mdx` with a relative path:

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

React 19 is available. Components see the same CSS variables your `styles.css` defines.

## Authoring `styles.css`

`deckx` ships a base stylesheet (`deckx/styles`) that handles all layout, typography rules, slide dimensions, the topbar, transitions, and the PDF `@page` setup. Your `styles.css` only needs to override CSS variables on `:root` to set the brand tokens.

### Variable contract

| Variable                  | Default         | Purpose                                                      |
|---------------------------|-----------------|--------------------------------------------------------------|
| `--bg-deck`               | `#0d0d0d`       | Background outside the slide (presenter mode only)           |
| `--bg-slide`              | `#1a1a1a`       | Default slide background                                     |
| `--bg-light`              | `#f4f4f4`       | Background for `theme="light"` slides                        |
| `--surface`               | `#2a2a2a`       | Inline code background, table headers, etc.                  |
| `--color-text`            | white @ 85%     | Default body text                                            |
| `--color-heading`         | `#ffffff`       | h1, h2, h4, strong on dark slides                            |
| `--color-muted`           | `#8f888e`       | Heading prefixes, counter, subdued UI                        |
| `--color-text-light`      | `#2a2230`       | Body text on light slides                                    |
| `--color-heading-light`   | `#1a1018`       | Headings on light slides                                     |
| `--accent`                | `#4a9eff`       | Primary accent: bullets, h3, links, blockquote bar           |
| `--accent-secondary`      | `#ff6b6b`       | em, link hover                                               |
| `--accent-tertiary`       | `#b388ff`       | hr gradient stop                                             |
| `--accent-aqua`           | `#4ad7c5`       | Inline code text, active tab, topbar tabs                    |
| `--font-body`             | system stack    | Body and headings (unless `--font-heading` overrides)        |
| `--font-heading`          | inherits body   | Headings                                                     |
| `--font-mono`             | system mono     | Inline code, code blocks, tabs, counter, h3                  |
| `--font-terminal`         | inherits body   | Body inside `.slide-body` (heading prefixes use this too)    |

### Worked example: deriving styles.css from a brand palette

Given a brand palette like Pydantic's (Lithium magenta `#E520E9`, Calcium orange `#FF6550`, Petroleum dark teal `#092224`, Sugar off-white `#FBFFEA`, etc.), map the tokens like so:

```css
/* styles.css */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;700&display=swap');

:root {
  --bg-deck: #061314;
  --bg-slide: #092224;       /* Petroleum */
  --bg-light: #f0e0fd;       /* Lavender for light slides */
  --surface: #49353f;

  --color-heading: #fbffea;  /* Sugar */
  --color-text: rgba(251, 255, 234, 0.85);
  --color-muted: #8f888e;

  --color-heading-light: #1d0214;
  --color-text-light: #36182d;

  --accent: #e520e9;         /* Lithium - primary brand magenta */
  --accent-secondary: #ff6550;  /* Calcium - warm counterpoint */
  --accent-tertiary: #9b77ff;
  --accent-aqua: #77ffd8;

  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-heading: var(--font-body);
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --font-terminal: var(--font-body);
}
```

Anchor the palette on **one most-distinctive accent color** (Lithium for Pydantic), use it for `--accent`, then pick the warm counterpoint as `--accent-secondary`. Pick a slightly off-white for `--color-heading` (pure white reads sterile). Pick a slightly off-black/tinted-dark for `--bg-slide` (pure black is harsh under projector light).

For a light-slide variant, pick a light tinted background (lavender, cream, eggshell - not pure white) and a near-black text color, then map both to `--bg-light` / `--color-heading-light` / `--color-text-light`.

If the brand has unique fonts, load them at the top of `styles.css` via `@import` or `@font-face`, then point `--font-body` / `--font-mono` at them.

## Building

```bash
bunx deckx              # build to ./dist/index.html
bunx deckx dev          # dev server with HMR on http://localhost:5173/
```

The output is one HTML file with all assets, fonts (where inlinable), CSS, and JS bundled inline. Open it directly in a browser - no server needed.

## Converting to PDF

deckx does not ship a PDF subcommand. Run Chrome headless yourself:

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu \
  --no-margins --print-to-pdf-no-header \
  --paper-width=11 --paper-height=6.1875 \
  --print-to-pdf=deck.pdf "file://$PWD/dist/index.html"
```

**Linux:**
```bash
google-chrome --headless=new --disable-gpu \
  --no-margins --print-to-pdf-no-header \
  --paper-width=11 --paper-height=6.1875 \
  --print-to-pdf=deck.pdf "file://$PWD/dist/index.html"
```

(Substitute `chromium` for `google-chrome` if that's what you have.)

The paper size matches the slide dimensions in `deck-base.css` (11in × 6.1875in = 16:9). If you change `--slide-width` or `--slide-height` in your `styles.css`, update the `--paper-*` flags to match.

## Inspecting the PDF output

If `pdftoppm` (poppler) is installed, render pages to PNGs to spot-check:

```bash
mkdir -p ./tmp
pdftoppm -r 100 deck.pdf ./tmp/page -png
```

That writes one PNG per slide so you can verify layout before sharing the PDF.

## Common edits

- **Change accent color**: edit `--accent` in `styles.css`, rebuild.
- **Add a tab**: add a `[[tabs]]` block to `deckx.toml`, add `tab="<id>"` on the slide(s).
- **Add a chart or diagram**: drop a new `.tsx` file in `components/`, import it from `deck.mdx`.
- **Tighten a slide that's overflowing**: try `space="tight"` first, then drop content - the slide must fit at 279.4mm × 157.2mm.
- **Title slide**: `<Slide theme="title">`.
- **Big quote / hero statement**: `<Slide theme="statement">`.
