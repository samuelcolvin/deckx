import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { build } from './build.ts'

/** Slide page size in inches. Matches the @page rule in src/styles/base.css. */
const PAPER_WIDTH_IN = 11
const PAPER_HEIGHT_IN = 6.1875

/** Locate a Chrome (or Chromium) executable on the user's system. */
function findChrome(): string | null {
  // macOS standard install path.
  const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  if (process.platform === 'darwin' && existsSync(macPath)) return macPath

  // Linux / fallback: look for likely names on PATH.
  const candidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']
  const pathDirs = (process.env.PATH ?? '').split(path.delimiter)
  for (const name of candidates) {
    for (const dir of pathDirs) {
      const full = path.join(dir, name)
      if (existsSync(full)) return full
    }
  }
  return null
}

/**
 * Build the deck to HTML, then convert to PDF via Chrome headless.
 *
 * @param cwd        Source directory (where deckx.toml + deck.mdx live).
 * @param outputPath Optional output PDF path (resolved against process.cwd()).
 *                   Defaults to `<cwd>/dist/deck.pdf`.
 */
export async function pdf(cwd: string, outputPath?: string): Promise<void> {
  const htmlPath = await build(cwd)
  const pdfPath = outputPath ? path.resolve(process.cwd(), outputPath) : path.join(path.dirname(htmlPath), 'deck.pdf')
  await htmlToPdf(htmlPath, pdfPath)
}

/**
 * Convert an existing HTML file to PDF via Chrome headless using deckx's
 * standard slide page size. The exact Chrome command is printed before
 * invocation so the user can copy/edit it if Chrome can't be found, the path
 * differs, or the conversion fails.
 *
 * Both paths are resolved against process.cwd() if relative.
 */
export async function htmlToPdf(htmlInput: string, pdfOutput: string): Promise<void> {
  const htmlPath = path.resolve(process.cwd(), htmlInput)
  const pdfPath = path.resolve(process.cwd(), pdfOutput)
  if (!existsSync(htmlPath)) {
    throw new Error(`deckx: HTML input not found at ${htmlPath}`)
  }

  const chrome = findChrome()
  const chromeBin = chrome ?? 'google-chrome'
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-margins',
    '--print-to-pdf-no-header',
    `--paper-width=${PAPER_WIDTH_IN}`,
    `--paper-height=${PAPER_HEIGHT_IN}`,
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ]

  // Print the exact command first so it can be copied/tweaked if Chrome fails.
  const printable = [shellQuote(chromeBin), ...args.map(shellQuote)].join(' ')
  console.log(`\ndeckx: running Chrome to convert HTML to PDF:\n  ${printable}\n`)

  if (!chrome) {
    console.error(
      'deckx: Chrome / Chromium not found on PATH or in /Applications. Install one or run the command above with the correct path.',
    )
    process.exit(1)
  }

  await runChrome(chrome, args)
  console.log(`deckx: wrote ${path.relative(process.cwd(), pdfPath) || pdfPath}`)
}

/** Spawn Chrome and resolve / reject based on its exit code. */
function runChrome(chrome: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Chrome exited with code ${code}`))
    })
  })
}

/** Shell-quote a single argument for human-readable output (POSIX-style). */
function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_\-./:=@%+,]+$/.test(s)) return s
  return `'${s.replace(/'/g, `'\\''`)}'`
}
