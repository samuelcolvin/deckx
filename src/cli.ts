#!/usr/bin/env node
/**
 * deckx CLI entry point.
 *
 * Usage:
 *   deckx html [output]                Build deck.mdx to <output> (default: ./dist/index.html)
 *   deckx pdf  [output]                Build HTML, then convert to <output> via Chrome (default: ./dist/deck.pdf)
 *   deckx html-to-pdf <input> <output> Convert an existing HTML file to PDF via Chrome
 *   deckx dev  [dir]                   Start the Vite dev server with HMR
 *   deckx skill                        Print the deckx authoring guide (SKILL.md) to stdout
 *   deckx --help, -h                   Show help
 *   deckx --version, -v                Show package version
 *
 * Build dir defaults to the current working directory. Override with --dir <dir>.
 * A subcommand is required.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from './build.ts'
import { dev } from './dev.ts'
import { htmlToPdf, pdf } from './pdf.ts'
import { skill } from './skill.ts'

type Command = 'html' | 'dev' | 'pdf' | 'html-to-pdf' | 'skill' | 'help' | 'version'

interface ParsedArgs {
  command: Command | null
  /** Build directory (deckx.toml + deck.mdx live here). Defaults to '.'. */
  dir: string
  /** Non-flag positionals after the subcommand, in order. Meaning depends on the command. */
  positionals: string[]
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) return { command: 'help', dir: '.', positionals: [] }
  if (args.includes('--version') || args.includes('-v')) return { command: 'version', dir: '.', positionals: [] }

  const subs = ['html', 'dev', 'pdf', 'html-to-pdf', 'skill'] as const
  if (args.length === 0 || !(subs as readonly string[]).includes(args[0])) {
    return { command: null, dir: '.', positionals: [] }
  }
  const command = args[0] as Command

  let dir = '.'
  const positionals: string[] = []
  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dir') {
      const next = args[++i]
      if (!next) throw new Error('deckx: --dir requires a directory argument')
      dir = next
    } else if (arg.startsWith('--dir=')) {
      dir = arg.slice('--dir='.length)
    } else if (arg.startsWith('-')) {
      throw new Error(`deckx: unknown flag "${arg}"`)
    } else {
      positionals.push(arg)
    }
  }

  return { command, dir, positionals }
}

function help(): void {
  console.log(`deckx - build a single-HTML slide deck from deck.mdx

Usage:
  deckx html [output]                Build to <output> (default: ./dist/index.html)
  deckx pdf  [output]                Build HTML, then convert to <output> via Chrome (default: ./dist/deck.pdf)
  deckx html-to-pdf <input> <output> Convert an existing HTML file to PDF via Chrome
  deckx dev  [dir]                   Vite dev server with HMR (positional: build dir, default: .)
  deckx skill                        Print the deckx authoring guide (SKILL.md) to stdout

Options:
  --dir <dir>                        Build dir (where deckx.toml + deck.mdx live). Default: .
  -h, --help                         Show this help
  -v, --version                      Print package version

Examples:
  deckx pdf my-deck.pdf              # build the deck in the current directory to my-deck.pdf
  deckx html out/index.html          # build to a custom HTML path
  deckx pdf --dir ./decks/foo        # build ./decks/foo to its default ./decks/foo/dist/deck.pdf
  deckx html-to-pdf in.html out.pdf  # skip the build, just convert an existing HTML to PDF

Recommended invocation: \`bunx deckx\` (npx deckx also works).
`)
}

function version(): void {
  // package.json sits two levels up from dist/cli.js once bundled.
  const here = path.dirname(fileURLToPath(import.meta.url))
  const pkg = JSON.parse(readFileSync(path.join(here, '..', 'package.json'), 'utf8')) as { version: string }
  console.log(pkg.version)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  if (args.command === null) {
    help()
    process.exit(1)
  }
  if (args.command === 'help') return help()
  if (args.command === 'version') return version()
  if (args.command === 'skill') return skill()
  // For `dev` the positional (if any) is the build dir, since there's no output file.
  if (args.command === 'dev') return dev(args.positionals[0] ?? args.dir)
  if (args.command === 'pdf') return pdf(args.dir, args.positionals[0])
  if (args.command === 'html-to-pdf') {
    if (args.positionals.length !== 2) {
      throw new Error('deckx: html-to-pdf requires <input.html> and <output.pdf> positional arguments')
    }
    return htmlToPdf(args.positionals[0], args.positionals[1])
  }
  await build(args.dir, args.positionals[0])
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
