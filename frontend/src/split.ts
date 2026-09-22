/**
 * Split raw markdown into slides.
 *
 * A line consisting only of `<slide .../>` (the trailing slash is optional) starts a new
 * slide; the body runs to the next such line or the end of the file. The split happens on
 * the raw source, before markdown-it sees anything, so none of CommonMark's HTML-block rules
 * (blank lines, indentation, paragraph interruption) apply to the marker, and attribute
 * names keep their case. Markers inside fenced code blocks are ignored.
 *
 * `build.py` runs the same scan to fail the build early with a line number; this module is
 * the runtime source of truth for what a slide is.
 */

export interface RawSlide {
  /** Attributes from the `<slide>` tag, e.g. `{ layout: 'title', tab: 'intro' }`. */
  attrs: Record<string, string>
  /** Markdown body of the slide (everything between this marker and the next). */
  body: string
  /** 1-based line number of the marker in the source, for error messages. */
  line: number
}

export interface SplitResult {
  /** Text before the first marker. Anything non-blank here is an authoring error. */
  preamble: string
  slides: RawSlide[]
}

/** `<slide layout="title"/>` on its own line, optional whitespace, optional trailing slash. */
const SLIDE_RE = /^\s*<slide\b([^>]*?)\s*\/?>\s*$/i
/** `name`, `name=value`, `name="value"` or `name='value'`. */
const ATTR_RE = /([A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
/** Opening or closing code fence: up to three spaces of indent then ``` or ~~~ (three or more). */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/

/** Parse the attribute string from a `<slide>` tag into a plain object. */
export function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of text.matchAll(ATTR_RE)) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return attrs
}

export function splitSlides(markdown: string): SplitResult {
  const preamble: string[] = []
  const slides: RawSlide[] = []
  let current: { attrs: Record<string, string>; lines: string[]; line: number } | null = null
  // The marker of the open fence (e.g. "```"), or null when not inside a fence.
  let fence: string | null = null

  const finish = () => {
    if (current) slides.push({ attrs: current.attrs, body: current.lines.join('\n'), line: current.line })
  }

  markdown.split(/\r?\n/).forEach((text, i) => {
    const fenceMatch = FENCE_RE.exec(text)
    if (fence === null) {
      if (fenceMatch) {
        fence = fenceMatch[1]
      } else {
        const m = SLIDE_RE.exec(text)
        if (m) {
          finish()
          current = { attrs: parseAttrs(m[1]), lines: [], line: i + 1 }
          return
        }
      }
    } else if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
      // A closing fence uses the same character, is at least as long, and has nothing after it.
      if (text.slice(fenceMatch[0].length).trim() === '') fence = null
    }
    ;(current ? current.lines : preamble).push(text)
  })
  finish()

  return { preamble: preamble.join('\n'), slides }
}
