/**
 * Post-processing of a rendered slide body:
 *
 *  - `<component src="Name.html"></component>` is replaced by the contents of that file
 *    (from the `components` map build.py embedded). Components may contain components,
 *    so the substitution loops; a depth cap guards against cycles the build missed.
 *  - `<img src="relative/path">` whose path is in the `images` map is rewritten to the
 *    embedded data URI so the page works from `file://` with no fetches.
 */

const MAX_COMPONENT_DEPTH = 32

/**
 * CommonMark treats `<component ...></component>` on a line of its own as inline HTML,
 * so markdown-it wraps it in a paragraph. Unwrap that paragraph, otherwise block-level
 * component content ends up nested inside a `<p>`.
 */
function unwrapParagraph(tag: Element): void {
  const parent = tag.parentElement
  if (parent?.tagName !== 'P') return
  if (parent.children.length !== 1 || (parent.textContent ?? '').trim() !== '') return
  parent.replaceWith(tag)
}

export function expandComponents(root: ParentNode, components: Record<string, string>): void {
  for (let depth = 0; depth < MAX_COMPONENT_DEPTH; depth++) {
    const tags = root.querySelectorAll('component[src]')
    if (tags.length === 0) return
    for (const tag of tags) {
      unwrapParagraph(tag)
      const src = tag.getAttribute('src') ?? ''
      const html = components[src]
      if (html === undefined) {
        console.warn(`deckx: missing component ${src}`)
        tag.replaceWith(`[missing component: ${src}]`)
        continue
      }
      const template = document.createElement('template')
      template.innerHTML = html
      tag.replaceWith(template.content)
    }
  }
  console.warn(`deckx: component nesting deeper than ${MAX_COMPONENT_DEPTH}, giving up`)
}

/**
 * Normalise a relative path the same way `posixpath.normpath` does in build.py, so
 * `./assets/x.png`, `assets//x.png` and `assets/../assets/x.png` all hit the same key.
 */
export function normalizePath(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..' && out.length > 0 && out[out.length - 1] !== '..') out.pop()
    else out.push(part)
  }
  return out.join('/') || '.'
}

/** True for `http://`, `data:`, `/absolute` and similar: paths build.py never inlines. */
function isExternal(src: string): boolean {
  return src.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(src)
}

export function inlineImages(root: ParentNode, images: Record<string, string>): void {
  for (const img of root.querySelectorAll<HTMLImageElement>('img[src]')) {
    const src = img.getAttribute('src') ?? ''
    if (isExternal(src)) continue
    const data = images[normalizePath(src)]
    if (data !== undefined) img.setAttribute('src', data)
  }
}
