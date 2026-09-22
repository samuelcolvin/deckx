/**
 * Markdown rendering: markdown-it (default preset, so GFM tables and strikethrough work)
 * with highlight.js wired into the `highlight` hook for fenced code blocks.
 *
 * Only a curated set of grammars is registered, from `highlight.js/lib/core`, to keep the
 * bundle small. Each grammar brings its own aliases (`ts`, `py`, `sh`, `html`, `toml`, ...).
 * Unknown languages fall back to escaped plain text.
 */

import type { LanguageFn } from 'highlight.js'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import MarkdownIt from 'markdown-it'

const LANGUAGES: Record<string, LanguageFn> = {
  bash,
  css,
  diff,
  go,
  ini, // also registers the `toml` alias
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml, // also registers `html` and `svg`
  yaml,
}

for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language)
}

const md = new MarkdownIt({
  html: true,
  // Returning '' tells markdown-it to escape the code itself; either way it wraps the
  // result in <pre><code class="language-x">, which base.css styles via `pre:not(.shiki)`.
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    }
    return ''
  },
})

/** Render one slide body (markdown) to an HTML string. */
export function renderMarkdown(source: string): string {
  return md.render(source)
}
