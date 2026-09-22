/**
 * Build the DOM for one slide. The structure and class names are exactly what deckx's
 * React `<Slide>` used to render, so `styles/base.css` applies unchanged:
 *
 *   section.slide[.title-slide|.statement-slide|.light-slide|.space-*|.font-large]
 *     .slide-topbar
 *       a.topbar-dots[data-nav-home]  (three traffic-light dots)
 *       .topbar-tabs | span.topbar-title
 *       span.topbar-nav               (filled by deck.ts with prev/counter/next)
 *     .slide-content > .slide-body    (the rendered markdown)
 *     .slide-footer                   (when the deck config sets `footer`)
 */

import type { RawSlide } from './split.ts'
import type { DeckConfig, DeckTab } from './types.ts'

/** Maps the `theme` attribute to its CSS class. Only `light` is an override; `dark` is the deck default. */
const THEME_CLASS: Record<string, string> = { light: 'light-slide' }
/** Maps the `layout` attribute to its CSS class. `content` is the default and adds nothing. */
const LAYOUT_CLASS: Record<string, string> = { title: 'title-slide', statement: 'statement-slide' }

/** Small helper: create an element with a class and optional text. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

export function buildSlide(raw: RawSlide, bodyHtml: string, config: DeckConfig): HTMLElement {
  const { layout, theme, tab, title, space, fontSize, id } = raw.attrs

  const section = el('section')
  section.className = [
    'slide',
    theme && THEME_CLASS[theme],
    layout && LAYOUT_CLASS[layout],
    space && `space-${space}`,
    fontSize && `font-${fontSize}`,
  ]
    .filter(Boolean)
    .join(' ')
  if (id) section.id = id
  if (title) section.dataset.slideTitle = title
  if (tab) section.dataset.tab = tab

  const topbar = el('div', 'slide-topbar')
  // Traffic-light dots link back to the first slide (handled by deck.ts via delegation).
  const dots = el('a', 'topbar-dots')
  dots.href = '#1'
  dots.dataset.navHome = ''
  for (const colour of ['red', 'yellow', 'green']) {
    dots.append(el('span', `topbar-dot topbar-dot--${colour}`))
  }
  topbar.append(dots)

  // Show the tab bar only when this slide opted in (`tab`) AND the deck has tabs configured.
  if (tab && config.tabs.length > 0) {
    topbar.append(buildTabBar(config.tabs, tab))
  } else if (title) {
    topbar.append(el('span', 'topbar-title', title))
  }
  topbar.append(el('span', 'topbar-nav'))
  section.append(topbar)

  const content = el('div', 'slide-content')
  const body = el('div', 'slide-body')
  // Parse through <template> so any <script> in the markdown or a component is inert.
  const template = document.createElement('template')
  template.innerHTML = bodyHtml
  body.append(template.content)
  content.append(body)
  section.append(content)

  if (config.footer) section.append(el('div', 'slide-footer', config.footer))
  return section
}

/** The topbar tab navigation. Tab links are wired up in deck.ts via event delegation. */
function buildTabBar(tabs: DeckTab[], active: string): HTMLElement {
  const bar = el('div', 'topbar-tabs')
  tabs.forEach((t, i) => {
    const group = el('span', 'topbar-tab-group')
    if (i > 0) group.append(el('span', 'topbar-tab-sep', '→'))
    const link = el('a', `topbar-tab${active === t.id ? ' topbar-tab--active' : ''}`, t.label)
    link.href = '#'
    link.dataset.tabTarget = t.id
    group.append(link)
    bar.append(group)
  })
  return bar
}
