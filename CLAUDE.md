# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in the deckx repository.

## What this is

`deckx` is a CLI + library for building React/MDX slide decks into a single self-contained HTML file (PDF-ready via Chrome headless). It is **the library**, not a deck. Don't add brand-specific content, custom slides, or example brand palettes into the library itself - those belong in user projects or in `examples/`.

DO NOT use the em dash "—" in source files or docs; always use a plain hyphen "-".

## Commands

Always use **bun** (never npm/pnpm/yarn) for development of this repo.

```bash
bun install                  # install dependencies
bun run build                # bundle CLI + library to dist/ (tsup)
bun run dev:lib              # tsup watch mode for the library
bun run typecheck            # tsc --noEmit
bun run lint                 # biome check
bun run format               # biome check --fix
```

**After every set of changes, before reporting work as done, run:**

```bash
bun run format               # auto-fix formatting + safe lint issues
bun run typecheck            # verify tsc is clean
```

If `format` modifies files, that's fine - those edits are correct. If `typecheck` reports an error, fix it.

## Pre-commit hooks

The repo uses `.pre-commit-config.yaml` (format, typecheck, codespell, basic file hygiene). Use [`prek`](https://github.com/j178/prek) - a fast Rust reimplementation of `pre-commit` - rather than `pre-commit` itself:

```bash
prek install                 # install the git hooks (one-time)
prek run --all-files         # run every hook against the whole repo
prek run typecheck           # run a single hook by id
```

`prek` is a drop-in replacement; the same `.pre-commit-config.yaml` works unchanged. It's faster and avoids the Python virtualenv setup of upstream `pre-commit`.

To smoke-test against the bundled starter example:

```bash
cd examples/starter
bun install
bunx deckx html              # writes ./dist/index.html
bunx deckx dev               # vite dev server with HMR
```

`pdftoppm` (poppler) is available for inspecting generated PDFs - render to `./tmp/` (gitignored), max 1800 × 1800 px.

## Architecture

- **`src/cli.ts`** - argv parser, dispatches to `html`, `dev`, `pdf`, or `skill` (a subcommand is required)
- **`src/build.ts`, `src/dev.ts`** - thin Vite programmatic wrappers
- **`src/pdf.ts`** - runs `build`, then spawns Chrome headless to print to PDF (prints the command first so users can copy/edit it on failure)
- **`src/skill.ts`** - reads `skills/deckx/SKILL.md` and writes it to stdout
- **`src/config.ts`** - loads + validates `deckx.toml` from a user cwd
- **`src/vite-config.ts`** - constructs the InlineConfig: MDX/React plugins, `vite-plugin-singlefile`, the four user-facing aliases (`deckx`, `deckx-base-styles`, `deckx-user-deck`, `deckx-user-styles`), and a virtual `deckx-user-config` plugin
- **`src/components/Deck.tsx`** - root presenter component (nav, scaling, counters)
- **`src/components/Slide.tsx`** - slide wrapper with topbar
- **`src/components/DeckContext.tsx`** - React context for deck-level config (tabs)
- **`src/styles/base.css`** - layout, typography, `@page`, transitions, theme variants. Relies on CSS variables that user `styles.css` overrides.
- **`src/index.ts`** - library entry: re-exports `Slide`, `Deck`, types
- **`templates/index.html`, `templates/main.tsx`** - Vite root, bootstraps a deck from the four aliased modules
- **`skills/deckx/SKILL.md`** - the user-facing authoring guide
- **`examples/starter/`** - smoke-test deck (depends on deckx via `file:../..`)

## Module aliases (CLI runtime)

When the CLI builds a user's deck, Vite is configured with the following aliases. Understanding these is the key to understanding the runtime:

| Alias                | Resolves to                                        |
|----------------------|----------------------------------------------------|
| `deckx`              | `<package>/dist/index.js`                          |
| `deckx-base-styles`  | `<package>/src/styles/base.css`                    |
| `deckx-user-deck`    | user's `deck.mdx`                                  |
| `deckx-user-styles`  | user's `styles.css`                                |
| `deckx-user-config`  | virtual ES module exposing `{ title, tabs }` (TOML) |

`templates/main.tsx` imports all five and assembles the React tree.

## Build pipeline

`bun run build` runs tsup, which bundles `src/cli.ts` and `src/index.ts` to `dist/`. All runtime peers (vite, react, MDX plugins) stay external. CSS in `src/styles/` is shipped as-is via `package.json` `files`. Templates are shipped as-is.

The package's `bin` is `dist/cli.js`, so `bunx deckx` resolves to that bundled CLI.

## Code style

Add concise but thorough JSDoc-style comments on exported functions and components. Comment any line of code that's complex or esoteric; otherwise let well-named identifiers speak.
