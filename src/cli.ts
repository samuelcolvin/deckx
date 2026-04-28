#!/usr/bin/env node
/**
 * deckx CLI entry point.
 *
 * Usage:
 *   deckx [dir]            Build deck.mdx in <dir> to <dir>/dist/index.html
 *   deckx build [dir]      Same as above
 *   deckx dev [dir]        Start the Vite dev server with HMR
 *   deckx --help, -h       Show help
 *   deckx --version, -v    Show package version
 *
 * `dir` defaults to the current working directory.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from './build.ts'
import { dev } from './dev.ts'

interface ParsedArgs {
  command: 'build' | 'dev' | 'help' | 'version'
  dir: string
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) return { command: 'help', dir: '.' }
  if (args.includes('--version') || args.includes('-v')) return { command: 'version', dir: '.' }

  let command: ParsedArgs['command'] = 'build'
  let dir = '.'
  let i = 0
  if (args[0] === 'build' || args[0] === 'dev') {
    command = args[0]
    i = 1
  }
  if (args[i] && !args[i].startsWith('-')) dir = args[i]
  return { command, dir }
}

function help(): void {
  console.log(`deckx - build a single-HTML slide deck from deck.mdx

Usage:
  deckx [dir]              Build to <dir>/dist/index.html (default: cwd)
  deckx build [dir]        Same as above
  deckx dev [dir]          Vite dev server with HMR

Options:
  -h, --help               Show this help
  -v, --version            Print package version

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
  if (args.command === 'help') return help()
  if (args.command === 'version') return version()
  if (args.command === 'dev') return dev(args.dir)
  await build(args.dir)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
