/**
 * Presenter behaviour, a vanilla port of the React `Deck` component deckx used to ship:
 *
 *  - the current slide lives in the URL hash (`#3` is the third slide, 1-indexed)
 *  - keyboard (arrows, space, page up/down), wheel and the topbar buttons navigate
 *  - the slide stream is scaled to fit the viewport via `--slide-scale`
 *  - `document.title` follows the active slide
 *  - traffic-light dots jump to slide 1, topbar tabs jump to the first slide of that tab
 *
 * Everything here runs synchronously at load, before first paint, so headless Chrome's
 * print-to-PDF sees the counters and every slide.
 */

import type { DeckConfig } from './types.ts'

/** Transition style between slides: 'fade' for crossfade, 'slide' for directional slide. */
const TRANSITION: 'fade' | 'slide' = 'fade'

const STATE_CLASSES = ['slide--active', 'slide--enter-fwd', 'slide--enter-back', 'slide--exit-fwd', 'slide--exit-back']

/** Read the slide index from the hash, clamped to the deck; null when the hash is not a number. */
function indexFromHash(total: number): number | null {
  const n = Number.parseInt(window.location.hash.replace('#', ''), 10)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(n - 1, total - 1)
}

export function initDeck(presenter: HTMLElement, config: DeckConfig): void {
  const slides = Array.from(presenter.querySelectorAll<HTMLElement>('.slide'))
  const total = slides.length
  if (total === 0) return

  let current = indexFromHash(total) ?? 0
  // Navigation direction and the previously active slide, used for directional transitions.
  let dir: -1 | 1 = 1
  let prev: number | null = null
  if (!window.location.hash) window.history.replaceState(null, '', `#${current + 1}`)

  // Inject the buttons + counter into every slide once: print CSS hides the buttons but
  // keeps the counter, and every slide is visible in print.
  const totalStr = String(total).padStart(2, '0')
  slides.forEach((slide, i) => {
    slide.dataset.slideIndex = String(i)
    const nav = slide.querySelector('.topbar-nav')
    if (!nav) return
    const num = String(i + 1).padStart(2, '0')
    nav.innerHTML =
      `<button class="topbar-nav-btn topbar-nav-prev" ${i === 0 ? 'disabled' : ''} aria-label="Previous slide">←</button>` +
      `<span class="topbar-nav-counter">${num}/${totalStr}</span>` +
      `<button class="topbar-nav-btn topbar-nav-next" ${i === total - 1 ? 'disabled' : ''} aria-label="Next slide">→</button>`
  })

  /** Mark the active slide, apply transition classes and update the document title. */
  const apply = () => {
    slides.forEach((slide, i) => {
      slide.classList.remove(...STATE_CLASSES)
      if (i === current) {
        slide.classList.add('slide--active')
        // Title from the slide's attribute, else its first h1, else the deck title.
        const title = slide.dataset.slideTitle || slide.querySelector('h1')?.textContent?.trim() || config.title
        if (title) document.title = title
        if (prev !== null && TRANSITION === 'slide') {
          slide.classList.add(dir === 1 ? 'slide--enter-fwd' : 'slide--enter-back')
        }
      } else if (i === prev && TRANSITION === 'slide') {
        slide.classList.add(dir === 1 ? 'slide--exit-fwd' : 'slide--exit-back')
      }
    })
    // Clear prev so it does not re-trigger an animation on the next apply.
    prev = null
  }

  /** Jump to a slide index, recording direction for transitions and syncing the hash. */
  const setCurrent = (next: number, direction: -1 | 1) => {
    dir = direction
    if (next !== current) prev = current
    current = next
    window.history.replaceState(null, '', `#${next + 1}`)
    apply()
  }

  const go = (direction: -1 | 1) => {
    setCurrent(Math.max(0, Math.min(total - 1, current + direction)), direction)
  }

  /** Scale factor to fit one slide in the viewport with a little padding. */
  const updateScale = () => {
    const slide = slides[0]
    const padding = 48
    const vw = window.innerWidth - padding
    const vh = window.innerHeight - padding
    const scale = Math.min(vw / slide.offsetWidth, vh / slide.offsetHeight)
    presenter.style.setProperty('--slide-scale', String(scale))
  }

  // Keyboard navigation.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault()
      go(-1)
    }
  })

  // Wheel navigation with a cooldown to tame trackpad inertia.
  let cooldown = false
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      if (cooldown) return
      if (Math.abs(e.deltaY) < 30) return
      go(e.deltaY > 0 ? 1 : -1)
      cooldown = true
      setTimeout(() => {
        cooldown = false
      }, 400)
    },
    { passive: false },
  )

  // Browser back/forward or a hand-edited hash.
  window.addEventListener('hashchange', () => {
    const n = indexFromHash(total)
    if (n !== null) {
      current = n
      apply()
    }
  })

  // Click delegation: nav buttons, traffic-light home link, tab links.
  presenter.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest<HTMLButtonElement>('.topbar-nav-btn')
    if (btn && !btn.disabled) {
      if (btn.classList.contains('topbar-nav-prev')) go(-1)
      if (btn.classList.contains('topbar-nav-next')) go(1)
      return
    }
    if (target.closest('[data-nav-home]')) {
      e.preventDefault()
      setCurrent(0, -1)
      return
    }
    const tabLink = target.closest<HTMLElement>('[data-tab-target]')
    if (tabLink) {
      e.preventDefault()
      const first = presenter.querySelector<HTMLElement>(`.slide[data-tab="${tabLink.dataset.tabTarget}"]`)
      if (first) {
        const idx = Number.parseInt(first.dataset.slideIndex ?? '0', 10)
        setCurrent(idx, idx > current ? 1 : -1)
      }
    }
  })

  window.addEventListener('resize', updateScale)
  apply()
  updateScale()
}
