---
name: deckx
description: Create a deck with deckx. Use when the user mentions "deckx", "deck" or "slides", asks to build a slide deck from markdown, asks to convert a brand palette into a deck stylesheet, or asks how to convert a deckx HTML deck into a PDF. Covers project layout, deckx.toml config, deck.md authoring with <slide/> breaks, HTML components, images, code blocks, the styles.css token contract, and the Chrome headless PDF command.
---

# deckx

`deckx` builds a single HTML slide deck from one markdown file plus a CSS theme, an optional folder of HTML components and any images they reference. The page renders itself in the browser and converts to PDF via Chrome headless. Building a deck needs Python (via `uv`) and nothing else.

## Installation

deckx is not packaged yet. Clone the repo and build the browser runtime once (this is the only step that needs Node):

```bash
git clone https://github.com/samuelcolvin/deckx
cd deckx && pnpm -C frontend install && pnpm -C frontend build     # -> frontend/dist/deck.js
```

The builder is the `deckx` command defined by the checkout's `pyproject.toml`; `uv run --project <checkout> deckx ...` runs it from any directory (uv creates the checkout's `.venv` on first use). Below, `DECKX` stands for the path to that checkout.

## Project layout

```
my-deck/
├── deckx.toml          # config: title, theme, tabs, footer, paths (all optional)
├── deck.md             # the slides
├── styles.css          # CSS variable overrides (optional)
├── components/         # optional HTML snippets pulled in with <component src="...">
│   └── Hero.html
└── assets/             # images referenced from the markdown, components or styles
```

```bash
uv run --project DECKX deckx html         # build to ./dist/index.html (+ deck.js beside it)
uv run --project DECKX deckx pdf          # build HTML, then ./dist/deck.pdf via Chrome headless
```

`html` and `pdf` accept an optional output-path positional - e.g. `uv run --project DECKX deckx pdf my-deck.pdf`. Use `--dir <dir>` to point at a deck directory other than the current one. To convert an existing HTML file to PDF without rebuilding, use `uv run --project DECKX deckx html-to-pdf <input.html> <output.pdf>`.

## `deckx.toml`

All fields are optional - a deck with only `deck.md` works.

```toml
title = "My Deck - April 2026"        # browser tab title

# light | dark | markdown-light | markdown-dark   (default: light)
# "markdown-*" variants render source-style decorations on top:
# heading "#"/"##" prefixes, "**" strong markers, traffic-light dots,
# mono slide counter, diamond bullets.
theme = "light"

# Small footer rendered bottom-right of every slide.
footer = "Confidential - do not share"

# Path to a favicon for the browser tab. .svg / .png / .ico / .jpg.
# Inlined as a data URI so the deck stays self-contained.
favicon = "assets/favicon.svg"

# Path overrides (defaults shown).
markdown = "deck.md"
styles = "styles.css"
components = "components"

# Optional tab nav. When present, <slide tab="..."/> highlights the matching tab.
tabs = [
  { id = "intro", label = "Intro" },
  { id = "details", label = "Details" },
]
```

If `tabs` is omitted, the `tab` attribute on `<slide/>` is ignored and slides render with a plain title topbar.

## `deck.md`

Plain markdown (CommonMark plus GFM tables and strikethrough). A line containing only `<slide .../>` starts a new slide; the slide's body runs to the next such line or the end of the file. There is no closing tag.

```markdown
<slide layout="title" title="Investor Deck / April 2026"/>

### Section Label

# My Deck

## A subtitle

<slide tab="intro"/>

# Hello world

- Bullet one
- Bullet two

<component src="Hero.html"></component>

<slide layout="statement"/>

# One big idea.
```

Rules:

- The `<slide .../>` line must be on its own. Whitespace around it is fine; the trailing `/` is optional.
- Anything before the first `<slide/>` line is a build error. Put nothing there.
- Markers inside fenced code blocks are ignored, so you can show the syntax in a code sample.
- Slides must fit **279.4mm × 157.2mm** (16:9). If overflowing, try `space="tight"` first, then drop content.
- Use `-` (hyphen-minus), never `—` (em dash).

### `<slide/>` attributes

All attributes are optional. A bare `<slide/>` renders a regular content slide using the deck theme.

#### `layout` - structural layout (default `content`)

Picks how the slide arranges its body. Adds a `.<value>-slide` class to the `.slide` element so you can target each variant from `styles.css`.

- `content` (default) - regular slide. Headings, paragraphs, bullets, code, and tables flow top-down inside `.slide-body`. Use for the bulk of your deck.
- `title` - cover / section slide. Bottom-aligns the hero; h1 is 4rem with tight letter-spacing; h2 renders in `--accent`. Pair with a leading `### Section Label` for a mono uppercase eyebrow.
- `statement` - centered one-liner. The body is centered both vertically and horizontally; h1 is 3.4rem; paragraphs cap at 80% width. Use for transitions between sections or "one bold idea" beats.

#### `theme` - color variant (defaults to the deck theme)

Per-slide palette override.

- Omit (or pass `dark`) - the slide inherits the deck-level `theme` from `deckx.toml`.
- `light` - forces a single slide onto the light palette (`--bg-light`, `--color-text-light`, `--color-heading-light`) regardless of the deck theme. Useful when one slide needs to break out - e.g. a screenshot of a light-themed UI on an otherwise dark deck. Adds `.light-slide` to the slide.

There is no inverse override: on a light deck, `theme="dark"` has no effect. If you need a single dark slide on a light deck, target it from CSS with a custom `id`.

#### Other attributes

- `tab` - string matching an `id` from the `tabs` array in `deckx.toml`. Replaces the plain topbar title with the tab bar, with this slide's tab highlighted. Clicking any tab in any slide jumps to the first slide whose `tab` matches. If `tabs` is not configured, the attribute is silently ignored.
- `title` - plain text rendered in the topbar when `tab` is not set. Also drives `document.title`, so the browser tab updates as the active slide changes. Ignored when `tab` is set.
- `space` - `tight` reduces bullet/paragraph spacing (use when a slide is close to overflowing); `wide` increases padding and line-height (use for slides with very little text where you want generous breathing room).
- `fontSize` - `large` bumps body text from 1.15rem to 1.35rem, and h1/h2 proportionally. Useful for slides that need to read from the back of a room.
- `id` - sets the HTML `id` on the underlying `<section>`. Useful for targeting one slide from `styles.css` (`.slide#hero { ... }`).

### Inline HTML and components

Short HTML can sit directly in the markdown - a `<mark>`, a small `<div class="note">`, an `<img>`. Anything longer belongs in a file under `components/` and is pulled in with a component tag:

```markdown
<component src="Hero.html"></component>
```

- The closing `</component>` is required. The self-closing form is not real HTML (the parser would swallow everything after it) and the build rejects it.
- Put the tag on its own line with blank lines around it.
- `src` is relative to the `components` directory and may not escape it.
- Components are plain HTML files. They may contain other `<component>` tags (nesting is resolved at load time; cycles fail the build) and may reference images the same way the markdown does.
- Components take no parameters. Two cards with different text are two files.
- Scripts inside components do not run. Components see the same CSS variables your `styles.css` defines, so read from variables (`color: var(--accent)`) rather than hard-coding colors.

### Images

Reference images by path relative to the deck directory, from markdown, from a component, or from `url(...)` in `styles.css`:

```markdown
![Architecture](assets/architecture.png)

<img src="assets/logo.svg" alt="Logo" style="width: 96px">
```

The build reads each referenced `.png` / `.jpg` / `.gif` / `.svg` / `.webp` and embeds it as a data URI, so the output is self-contained and works from `file://`. A missing file fails the build. Absolute URLs (`https://...`) are left alone and will need network access to display.

### Code blocks

Fenced code blocks are syntax-highlighted in the browser by [highlight.js](https://highlightjs.org). Tag the fence with a language so tokens get coloured:

````markdown
```ts
export function greet(name: string): string {
  return `hello, ${name}`;
}
```
````

Bundled grammars: `typescript` (`ts`, `tsx`), `javascript` (`js`, `jsx`), `python` (`py`), `bash` (`sh`, `zsh`), `json`, `toml` / `ini`, `css`, `xml` / `html` / `svg`, `sql`, `rust` (`rs`), `go`, `yaml` (`yml`), `markdown` (`md`), `diff`. Other languages render as plain, unhighlighted code.

Token colours derive from the deck's accent variables (`--accent`, `--accent-secondary`, `--accent-tertiary`, `--accent-aqua`, `--color-muted`) and are deepened automatically on light slides, so a brand palette in `styles.css` restyles code too. To tune them directly, override `--code-keyword`, `--code-string`, `--code-number`, `--code-title`, `--code-attr`, `--code-comment` or `--code-meta` on `.slide`.

## Authoring `styles.css`

The base stylesheet handles all layout, typography, slide dimensions, the topbar, transitions, and the PDF `@page` setup. `styles.css` only needs to override CSS variables on `:root` to set brand tokens.

### Variable contract

Backgrounds:

- `--bg-deck` (default `#0d0d0d`) - background outside the slide, presenter mode only.
- `--bg-slide` (default `#1a1a1a`) - default slide background.
- `--bg-light` (default `#ffffff`) - slide bg for `light` / `markdown-light` decks and `<slide theme="light"/>`.
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

### CSS class hooks

For finer control beyond the variable contract, target these classes from `styles.css`. Most decks won't need them - prefer overriding variables first.

Slide structure:

- `.deck-presenter` - outermost wrapper. Owns the viewport background and the fit-to-window scaling transform.
- `.deck` - inner slide stream (direct child of `.deck-presenter`).
- `.slide` - a single slide (`<section>`). Sized 16:9, holds topbar + content + optional footer.
- `.slide-topbar` - 48px window-chrome bar at the top of every slide.
- `.slide-content` - padded body wrapper below the topbar (this is what `--slide-padding` applies to).
- `.slide-body` - inner markdown content container, descendant of `.slide-content`.
- `.slide-footer` - bottom-right footer text, rendered when `footer` is set in `deckx.toml`.

Slide modifiers (added to `.slide` based on attributes):

- `.title-slide` - `layout="title"`, bottom-aligned hero.
- `.statement-slide` - `layout="statement"`, centered hero.
- `.light-slide` - `theme="light"`, forces the light palette.
- `.space-tight` / `.space-wide` - vertical spacing density.
- `.font-large` - bumps body text size.

Topbar - left (traffic lights + title/tabs):

- `.topbar-dots` - the traffic-light anchor (clicking jumps to slide 1). Only visible under `markdown-*` themes.
- `.topbar-dot` plus `.topbar-dot--red` / `.topbar-dot--yellow` / `.topbar-dot--green` - individual dots.
- `.topbar-title` - plain title text, shown when `<slide title="..."/>` is set without a `tab`.

Topbar - tabs (rendered when `<slide tab="..."/>` is set and `tabs` are configured in `deckx.toml`):

- `.topbar-tabs` - the tab bar container.
- `.topbar-tab-group` - per-tab wrapper containing the link plus its leading separator.
- `.topbar-tab-sep` - the `→` glyph between tabs.
- `.topbar-tab` - the tab link.
- `.topbar-tab--active` - applied to the currently-selected tab.

Topbar - right (prev/next + counter):

- `.topbar-nav` - container holding the prev/next buttons and slide counter.
- `.topbar-nav-btn` plus `.topbar-nav-prev` / `.topbar-nav-next` - the nav buttons (auto-hidden in print).
- `.topbar-nav-counter` - the `01/12` slide counter.

Deck-level theme classes (applied to both `<html>` and `.deck-presenter` based on `theme` in `deckx.toml`):

- `.theme-light` / `.theme-dark` / `.theme-markdown-light` / `.theme-markdown-dark`

Markdown inside `.slide-body` renders as plain HTML (`h1`-`h4`, `p`, `ul`, `ol`, `pre`, `code`, `table`, `blockquote`, `a`, `img`, `hr`) - target those tags directly with `.slide <tag>` selectors rather than expecting deckx to add wrapper classes.

### Mapping a brand palette

1. Pick the **most distinctive** brand color, assign to `--accent`. Pick a warm counterpoint as `--accent-secondary`.
2. Pick a slightly off-white for `--color-heading` (pure white reads sterile under projector light).
3. Pick a tinted dark for `--bg-slide` (pure black is harsh).
4. For light slides, pick a tinted light bg (cream, eggshell, lavender - not pure white) plus a near-black text color → `--bg-light` / `--color-heading-light` / `--color-text-light`.
5. For custom fonts, self-host woff2 files in `assets/` and declare them with `@font-face` in `styles.css`, then point `--font-body` / `--font-mono` at the family. Font files are not inlined by the build, so keep them next to the output or use `url(data:...)` yourself if the deck must be a single file. Use [Google Webfonts Helper](https://gwfh.mranftl.com/fonts) to download woff2 files.

```css
@font-face {
  font-family: 'YourFont';
  src: url('./assets/YourFont-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}

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

`uv run --project DECKX deckx pdf` is the easy path: it builds the HTML, prints the exact Chrome command it's about to run, then runs it. Output lands at `./dist/deck.pdf`.

If Chrome / Chromium can't be found, copy the printed command and run it yourself with the right binary path. On Linux deckx auto-detects `google-chrome`, `google-chrome-stable`, `chromium`, or `chromium-browser`.

Paper size in the printed command matches the slide dimensions (11in × 6.1875in = 16:9). If you override `--slide-width` / `--slide-height` in `styles.css`, edit the `--paper-*` flags to match before running.

To spot-check the PDF (requires `pdftoppm` from poppler):

```bash
mkdir -p ./tmp && pdftoppm -r 100 ./dist/deck.pdf ./tmp/page -png
```

One PNG per slide lands in `./tmp/`, gitignore that path.
