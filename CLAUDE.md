# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in the deckx repository.

## What this is

`deckx` builds a slide deck from one markdown file, a folder of HTML component files and a CSS file into a single HTML page. The page renders itself in the browser (markdown, slide navigation, code highlighting) and prints to PDF via Chrome headless. It is **the library**, not a deck. Don't add brand-specific content, custom slides, or example brand palettes into the library itself - those belong in user projects or in `examples/`.

DO NOT use the em dash "—" in source files or docs; always use a plain hyphen "-".

## Commands

Two toolchains. Use **pnpm** (never npm/yarn/bun) for the TypeScript browser runtime in `frontend/` and **uv** for the Python builder in `backend/`. `pyproject.toml` at the repo root defines the `deckx` package (`backend/deckx/`), the `deckx` script, and the ruff / basedpyright / pytest config; the dev dependency group holds those tools. The pnpm commands run from `frontend/` (or `pnpm -C frontend ...` from the root); the uv commands run from anywhere in the repo.

```bash
pnpm -C frontend install              # install JS dependencies
pnpm -C frontend build                # bundle src/main.ts -> frontend/dist/deck.js (esbuild, minified)
pnpm -C frontend dev                  # same, in watch mode
pnpm -C frontend typecheck            # tsc --noEmit
pnpm -C frontend lint                 # biome check
pnpm -C frontend format               # biome check --fix

uv sync                               # create .venv with the dev tools (uv run does this on demand too)
uv run deckx html --dir examples/starter   # -> examples/starter/dist/index.html + deck.js
uv run deckx pdf --dir examples/starter    # html, then Chrome headless -> dist/deck.pdf
uv run ruff check                     # lint backend/ and tests/
uv run ruff format                    # format them
uv run basedpyright                   # strict type check of backend/ and tests/
uv run pytest                         # run tests/
```

`deckx` reads `frontend/dist/deck.js`, so run `pnpm -C frontend build` once after cloning or after changing anything in `frontend/src/`.

**After every set of changes, before reporting work as done, run:**

```bash
pnpm -C frontend format
pnpm -C frontend typecheck
uv run ruff format
uv run ruff check
uv run basedpyright
uv run pytest
```

If `format` modifies files, that's fine - those edits are correct. If `typecheck`, `ruff check`, `basedpyright` or the tests report an error, fix it.

## Pre-commit hooks

The repo uses `.pre-commit-config.yaml` (biome format, typecheck, ruff, basedpyright, codespell, basic file hygiene). Use [`prek`](https://github.com/j178/prek) - a fast Rust reimplementation of `pre-commit` - rather than `pre-commit` itself:

```bash
prek install                 # install the git hooks (one-time)
prek run --all-files         # run every hook against the whole repo
prek run typecheck           # run a single hook by id
```

`pdftoppm` (poppler) is available for inspecting generated PDFs - render to `./tmp/` (gitignored), max 1800 × 1800 px. Headless Chrome with `--dump-dom` or `--screenshot` is the way to check the runtime without a browser session.

## Architecture

Two halves joined by a JSON blob.

**Browser runtime (`frontend/src/`, bundled by esbuild to `frontend/dist/deck.js`)**

Paths below are relative to `frontend/`. `package.json`, `tsconfig.json` and `biome.jsonc` live there too.

- **`src/main.ts`** - entry. Reads the blob from `<script type="application/json" id="deck-data">`, injects `base.css`, `hljs.css` and the user's CSS as `<style>` elements, splits and renders the slides, mounts `.deck-presenter > .deck`, then starts navigation. Everything runs synchronously so the DOM is complete before `load` (headless Chrome prints at `load`). Never add async work here.
- **`src/split.ts`** - splits raw markdown into slides on `<slide .../>` lines (fence-aware) and parses the tag's attributes. This is the source of truth for slide syntax; `build.py` mirrors the scan only to fail early.
- **`src/render.ts`** - markdown-it (default preset, `html: true`) with highlight.js `lib/core` plus a curated language list.
- **`src/slide.ts`** - builds the `section.slide` DOM (topbar with dots, tabs or title, nav slot; `.slide-content > .slide-body`; footer). Class names must match `base.css`.
- **`src/components.ts`** - replaces `<component src>` tags from the blob (looping for nesting, unwrapping the `<p>` markdown-it puts around an inline tag) and rewrites `img[src]` to embedded data URIs.
- **`src/deck.ts`** - navigation: `#N` hash routing (1-indexed), keyboard, wheel, prev/next buttons, tab links, traffic-light home link, viewport scaling via `--slide-scale`, `document.title`, and the `NN/NN` counter injected into every slide's `.topbar-nav`.
- **`src/types.ts`** - `DeckData` / `DeckConfig`, the JSON contract with `build.py`.
- **`src/styles/base.css`** - layout, typography, `@page`, transitions, theme variants. Relies on CSS variables that user `styles.css` overrides. `src/hljs.css` maps highlight.js token classes onto those variables.

**Builder (`backend/deckx/build.py` + `backend/deckx/template.html`)**

- `main()` is the `deckx` console script declared in `pyproject.toml`; `uv run deckx ...` is the CLI.
- Loads and validates `deckx.toml` (`tomllib`), reads `deck.md`, collects every `<component src>` file (nesting, cycles, path escapes), inlines every referenced image as a data URI, writes the JSON blob into `template.html` (with `<` escaped as `\u003c`) and copies `frontend/dist/deck.js` next to the output. `pdf` and `html-to-pdf` run Chrome headless with the paper size from `base.css`.
- No third-party runtime Python dependencies. Keep it that way. `deck.js` is not shipped inside the package yet; the builder finds it via the repo layout (`backend/deckx/` -> repo root -> `frontend/dist/`).

**Supporting files**

- `skills/deckx/SKILL.md` - the user-facing authoring guide. Update it whenever slide syntax, config keys or the CSS contract change.
- `examples/starter/` - smoke-test deck exercising every feature (components, nesting, image, tabs, light slide, code).
- `tests/test_build.py` - pytest for `deckx.build`.

## The JSON contract

```json
{
  "config":     { "title": "...", "theme": "light", "footer": "...", "tabs": [{ "id": "intro", "label": "Intro" }] },
  "markdown":   "raw deck.md source",
  "components": { "Hero.html": "<section>...</section>" },
  "styles":     "raw styles.css",
  "images":     { "assets/logo.svg": "data:image/svg+xml;base64,..." }
}
```

Image keys are `posixpath.normpath` of the path as written; `components.ts` normalises `img[src]` the same way before lookup.

## Slide syntax in one paragraph

A line containing only `<slide .../>` starts a slide; the body runs to the next marker or end of file. Attributes mirror the old `<Slide>` props: `layout` (`title` | `statement`), `theme` (`light`), `tab`, `title`, `space` (`tight` | `wide`), `fontSize` (`large`), `id`. Anything before the first marker is a build error. `<component src="Name.html"></component>` needs its closing tag. See `SKILL.md` for the full reference.

## Code style

Add concise but thorough JSDoc-style comments on exported functions, and docstrings on Python functions. Comment any line of code that's complex or esoteric; otherwise let well-named identifiers speak. TypeScript is formatted by biome (single quotes, no semicolons, 119 columns); Python by ruff (single quotes, 120 columns).
