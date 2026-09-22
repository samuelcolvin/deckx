# deckx

Markdown slide decks that render in the browser and print to PDF.

Why?

* My taste
* Good support for HTML presentation - keyboard control, slide persistence in URL, jump to slide, title
* Good support for PDF generation - configure `page` css property properly
* No JavaScript toolchain needed to build a deck: the runtime is one prebuilt `deck.js`, the builder is one Python script with no dependencies

## How it works

A deck is a directory:

```
my-deck/
├── deckx.toml          # title, theme, footer, tabs, paths (all optional)
├── deck.md             # the slides
├── styles.css          # theme tokens (optional)
├── components/         # HTML files pulled in with <component src="...">
│   └── Hero.html
└── assets/             # images
```

`deckx` reads those files and writes `dist/index.html`: the markdown source, every referenced component, your CSS and every referenced image (as a data URI) go into the page as one JSON blob, next to `<script src="deck.js">`. When the page loads, `deck.js` splits the markdown into slides, renders it, expands the components, highlights code and wires up navigation. The output opens from `file://` and prints to PDF with Chrome headless.

## Quick start

deckx is not yet packaged, so clone the repo and build the runtime once:

```bash
git clone https://github.com/samuelcolvin/deckx
cd deckx
pnpm -C frontend install && pnpm -C frontend build     # -> frontend/dist/deck.js
```

Then build the starter deck:

```bash
uv run deckx html --dir examples/starter    # -> examples/starter/dist/index.html
uv run deckx pdf --dir examples/starter     # -> examples/starter/dist/deck.pdf
```

`uv run` installs the `deckx` package from `backend/` into `.venv` on first use (Python 3.11+, no runtime dependencies). To build your own deck from outside the checkout, point uv at the project and `--dir` at the deck, or run from inside the deck directory:

```bash
uv run --project path/to/deckx deckx html --dir path/to/my-deck
cd path/to/my-deck && uv run --project path/to/deckx deckx pdf
```

## Authoring

`deck.md`:

```markdown
<slide layout="title"/>

### Section Label

# My Deck

<slide tab="intro"/>

# Hello, world

- Bullets, tables, code blocks and inline HTML all work
- A `<slide .../>` line starts each slide; there is no closing tag

<component src="Hero.html"></component>

<slide layout="statement"/>

# One bold statement.
```

`deckx.toml`:

```toml
title = "My Deck"
theme = "light"           # light | dark | markdown-light | markdown-dark (default: light)

tabs = [
  { id = "intro", label = "Intro" },
]
```

The four built-in themes split on two axes: light vs dark backgrounds, and whether markdown-source decorations (`#` heading prefixes, `**` strong markers, traffic-light dots, mono slide counter, diamond bullets) render on top. Pick `light` or `dark` for a clean baseline; pick a `markdown-*` variant for the opinionated annotated look.

`styles.css` overrides any of the CSS variables in the base stylesheet:

```css
:root {
  --bg-slide: #092224;
  --color-heading: #fbffea;
  --accent: #e520e9;
}
```

The full authoring guide - slide attributes, components, images, code blocks, the CSS variable contract and class hooks - lives at [`skills/deckx/SKILL.md`](skills/deckx/SKILL.md). It can be installed into Claude Code, Codex, Cursor, etc. via [skills.sh](https://skills.sh) (`bunx skills add samuelcolvin/deckx`).

## CLI

- `uv run deckx html [output] [--dir DIR]` - build to `<output>` (default: `DIR/dist/index.html`). `deck.js` is copied next to it.
- `uv run deckx pdf [output] [--dir DIR]` - build HTML, then convert to `<output>` via Chrome (default: `DIR/dist/deck.pdf`).
- `uv run deckx html-to-pdf <input.html> <output.pdf>` - convert an existing HTML file to PDF, no rebuild.
- `uv run deckx --help`

A subcommand is required - running with no arguments prints help and exits with status 1.

## Converting to PDF

```bash
uv run deckx pdf
```

This builds the HTML, prints the exact Chrome command it's about to run, then runs it. If Chrome isn't found, or the conversion fails, copy the printed command, fix the Chrome path or flags, and run it yourself. The default command looks like:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu \
  --no-margins --print-to-pdf-no-header \
  --paper-width=11 --paper-height=6.1875 \
  --print-to-pdf=./dist/deck.pdf "file://$PWD/dist/index.html"
```

(Use `google-chrome` or `chromium` on Linux - deckx looks for them automatically.)

## Developing deckx itself

The browser runtime is in `frontend/` (pnpm), the builder in `backend/deckx/` (uv, configured by the root `pyproject.toml`).

```bash
pnpm -C frontend install
pnpm -C frontend build              # bundle frontend/src -> frontend/dist/deck.js
pnpm -C frontend typecheck
pnpm -C frontend lint
uv run ruff check
uv run basedpyright
uv run pytest
```

`pnpm -C frontend dev` rebuilds `frontend/dist/deck.js` on every change to `frontend/src/`; rerun `deckx` to pick it up. Headless Chrome (`--dump-dom`, `--screenshot`) is handy for checking the runtime without a browser session.
