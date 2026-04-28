# deckx

Yet another markdown + React deck builder.

Why?

* My taste
* Good support for HTML presentation - keyboard control, slide persistence in URL, jump to slide, title
* Good support for PDF generation - configure `page` css property properly

## Quick start

Skills for authoring decks with an AI agent are available in [`skills/deckx/SKILL.md`](./skills/deckx/SKILL.md), and can be installed into Claude Code, Codex, Cursor, etc. via [skills.sh](https://skills.sh).

Then bootstrap a deck:

```bash
mkdir my-deck && cd my-deck
bunx skills add samuelcolvin/deckx
bun init -y
bun add @samuelcolvin/deckx
# author deckx.toml, deck.mdx, styles.css, components/
bunx deckx html         # → dist/index.html
bunx deckx dev          # live dev server at http://localhost:5173/
```

`npx` / `pnpm dlx` work in place of `bunx`. The package is published as [`@samuelcolvin/deckx`](https://www.npmjs.com/package/@samuelcolvin/deckx); the CLI binary is `deckx`, so `bunx deckx ...` works once the package is installed.

## A minimal project

```
my-deck/
├── deckx.toml          # title, tabs, paths (all optional)
├── deck.mdx            # the slides
├── styles.css          # theme tokens
└── components/         # optional custom React components
    └── Hello.tsx
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

`deck.mdx`:

```mdx
import { Slide } from "deckx";
import Hello from "./components/Hello.tsx";

<Slide theme="title">

# Hello, world

</Slide>

<Slide tab="intro">

# Slide two

<Hello />

</Slide>
```

`styles.css` overrides any of the CSS variables in `deckx`'s base stylesheet:

```css
:root {
  --bg-slide: #092224;
  --color-heading: #fbffea;
  --accent: #e520e9;
}
```

## CLI

| Command                   | What it does                                                  |
|---------------------------|---------------------------------------------------------------|
| `bunx deckx html [dir]`   | Build to `<dir>/dist/index.html` (default: cwd)               |
| `bunx deckx dev [dir]`    | Vite dev server with HMR                                      |
| `bunx deckx pdf [dir]`    | Build HTML, then convert to `<dir>/dist/deck.pdf` via Chrome  |
| `bunx deckx skill`        | Print the authoring guide (`SKILL.md`) to stdout              |
| `bunx deckx --help`       | CLI help                                                      |
| `bunx deckx --version`    | Version                                                       |

A subcommand is required - running `bunx deckx` with no arguments prints help and exits with status 1.

## Converting to PDF

```bash
bunx deckx pdf
```

This builds the HTML, prints the exact Chrome command it's about to run, then runs it. The output lands at `./dist/deck.pdf`.

If Chrome isn't found, or the conversion fails, copy the printed command, fix the Chrome path or flags, and run it yourself. The default command looks like:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu \
  --no-margins --print-to-pdf-no-header \
  --paper-width=11 --paper-height=6.1875 \
  --print-to-pdf=./dist/deck.pdf "file://$PWD/dist/index.html"
```

(Use `google-chrome` or `chromium` on Linux - deckx looks for them automatically.)

## Authoring guide

The full authoring guide - including the `<Slide>` prop reference, the CSS variable contract, and tips on translating a brand palette into a `styles.css` - lives at [`skills/deckx/SKILL.md`](skills/deckx/SKILL.md).

## Developing deckx itself

```bash
bun install
bun run build           # bundle CLI + library to dist/
bun run typecheck
bun run lint
```

To smoke-test against the bundled starter example:

```bash
cd examples/starter
bun install
bunx deckx html         # writes dist/index.html
```
