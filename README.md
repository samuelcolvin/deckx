# deckx

Build a slide deck from MDX, React components, and a CSS theme. Outputs a single self-contained HTML file that prints cleanly to PDF.

## Quick start

```bash
mkdir my-deck && cd my-deck
# author deckx.toml, deck.mdx, styles.css, components/
bunx deckx              # → dist/index.html
bunx deckx dev          # live dev server at http://localhost:5173/
```

`npx deckx` works too.

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

[[tabs]]
id = "intro"
label = "Intro"
```

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

| Command                   | What it does                                |
|---------------------------|---------------------------------------------|
| `bunx deckx`              | Build to `./dist/index.html`                |
| `bunx deckx build [dir]`  | Same, with optional dir override            |
| `bunx deckx dev [dir]`    | Vite dev server with HMR                    |
| `bunx deckx --help`       | CLI help                                    |
| `bunx deckx --version`    | Version                                     |

## Converting to PDF

deckx does not ship a PDF command. Use Chrome headless directly:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless=new --disable-gpu \
  --no-margins --print-to-pdf-no-header \
  --paper-width=11 --paper-height=6.1875 \
  --print-to-pdf=deck.pdf "file://$PWD/dist/index.html"
```

(Use `google-chrome` or `chromium` on Linux.)

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
bunx deckx              # writes dist/index.html
```

## License

MIT.
