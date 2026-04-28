import type React from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DeckProvider, type DeckTab } from './DeckContext'

/** Transition style between slides: 'fade' for crossfade, 'slide' for directional slide. */
const TRANSITION: 'fade' | 'slide' = 'fade'

export interface DeckProps {
  /** Compiled MDX content - rendered as the slide stream. */
  children: React.ReactNode
  /** Browser tab title (also used as fallback when a slide has no title or h1). */
  title?: string
  /** Optional tabs for the topbar nav bar in <Slide tab="...">. */
  tabs?: DeckTab[]
}

/**
 * Root deck component. Imports compiled MDX via children, handles single-slide
 * presentation with viewport scaling, keyboard/click/wheel navigation, slide
 * counter rendering, and tab-link routing.
 */
export default function Deck({ children, title, tabs = [] }: DeckProps) {
  const deckRef = useRef<HTMLDivElement>(null)
  const [slideCount, setSlideCount] = useState(0)
  // Read initial slide index from URL hash (#3 -> slide 2, 0-indexed).
  const [current, setCurrent] = useState(() => {
    if (typeof window === 'undefined') return 0
    const hash = window.location.hash.replace('#', '')
    const n = Number.parseInt(hash, 10)
    return Number.isFinite(n) && n >= 1 ? n - 1 : 0
  })
  const [scale, setScale] = useState(1)
  // Track navigation direction for transition animations.
  const dirRef = useRef<-1 | 1>(1)
  const prevRef = useRef<number | null>(null)

  /**
   * Count slides after MDX content mounts or HMR-updates.
   * MutationObserver keeps the count in sync if children change.
   */
  useLayoutEffect(() => {
    if (!deckRef.current) return
    const recount = () => {
      if (!deckRef.current) return
      const count = deckRef.current.querySelectorAll('.slide').length
      setSlideCount(count)
      setCurrent((prev) => {
        const clamped = Math.min(prev, count - 1)
        if (!window.location.hash) {
          window.history.replaceState(null, '', `#${clamped + 1}`)
        }
        return clamped
      })
    }
    recount()
    const observer = new MutationObserver(recount)
    observer.observe(deckRef.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  /** Calculate scale factor to fit the current slide in the viewport. */
  const updateScale = useCallback(() => {
    if (!deckRef.current) return
    const slide = deckRef.current.querySelector('.slide') as HTMLElement | null
    if (!slide) return
    const padding = 48
    const vw = window.innerWidth - padding
    const vh = window.innerHeight - padding
    const sw = slide.offsetWidth
    const sh = slide.offsetHeight
    setScale(Math.min(vw / sw, vh / sh))
  }, [])

  useEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [updateScale])

  /** Navigate between slides and update URL hash. */
  const go = useCallback(
    (dir: -1 | 1) => {
      dirRef.current = dir
      setCurrent((prev) => {
        const next = Math.max(0, Math.min(slideCount - 1, prev + dir))
        if (next !== prev) prevRef.current = prev
        window.history.replaceState(null, '', `#${next + 1}`)
        return next
      })
    },
    [slideCount],
  )

  /** Sync slide when URL hash changes (e.g. browser back/forward). */
  useEffect(() => {
    const onHash = () => {
      const n = Number.parseInt(window.location.hash.replace('#', ''), 10)
      if (Number.isFinite(n) && n >= 1) {
        setCurrent(Math.min(n - 1, slideCount - 1))
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [slideCount])

  /** Keyboard navigation: arrows, space, page up/down. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  /** Scroll/wheel navigation with debounce to tame trackpad inertia. */
  useEffect(() => {
    let cooldown = false
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (cooldown) return
      const threshold = 30
      if (Math.abs(e.deltaY) < threshold) return
      go(e.deltaY > 0 ? 1 : -1)
      cooldown = true
      setTimeout(() => {
        cooldown = false
      }, 400)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [go])

  /**
   * Mark the active slide and inject the prev/next/counter markup into every slide's
   * topbar nav slot. Runs synchronously before paint so headless Chrome captures the
   * counters during print-to-PDF.
   */
  useLayoutEffect(() => {
    if (!deckRef.current) return
    const slides = deckRef.current.querySelectorAll('.slide')
    const total = slides.length
    const totalStr = String(total).padStart(2, '0')
    const dir = dirRef.current
    const prev = prevRef.current
    slides.forEach((s, i) => {
      const el = s as HTMLElement
      el.dataset.slideIndex = String(i)
      // Reset transition classes before applying the current state.
      s.classList.remove(
        'slide--active',
        'slide--enter-fwd',
        'slide--enter-back',
        'slide--exit-fwd',
        'slide--exit-back',
      )
      if (i === current) {
        s.classList.add('slide--active')
        // Update browser tab title from data attribute, fallback to first h1, then deck title.
        const titleAttr = el.dataset.slideTitle
        const h1Text = s.querySelector('h1')?.textContent?.trim()
        const newTitle = titleAttr || h1Text || title
        if (newTitle) document.title = newTitle
        if (prev !== null && TRANSITION === 'slide') {
          s.classList.add(dir === 1 ? 'slide--enter-fwd' : 'slide--enter-back')
        }
      } else if (i === prev && TRANSITION === 'slide') {
        s.classList.add(dir === 1 ? 'slide--exit-fwd' : 'slide--exit-back')
      }

      // Inject buttons + counter on every slide (print CSS hides the buttons but keeps the counter).
      const nav = el.querySelector('.topbar-nav')
      if (!nav) return
      const num = String(i + 1).padStart(2, '0')
      nav.innerHTML =
        `<button class="topbar-nav-btn topbar-nav-prev" ${i === 0 ? 'disabled' : ''} aria-label="Previous slide">←</button>` +
        `<span class="topbar-nav-counter">${num}/${totalStr}</span>` +
        `<button class="topbar-nav-btn topbar-nav-next" ${i === total - 1 ? 'disabled' : ''} aria-label="Next slide">→</button>`
    })
    // Clear prevRef so it doesn't stale-trigger an animation on the next render.
    prevRef.current = null
  }, [current, title])

  /** Click delegation: nav buttons, traffic-light home link, and tab links. */
  useEffect(() => {
    const root = deckRef.current
    if (!root) return
    const onClick = (e: MouseEvent) => {
      // Prev/Next buttons.
      const btn = (e.target as HTMLElement).closest('.topbar-nav-btn') as HTMLButtonElement | null
      if (btn && !btn.disabled) {
        if (btn.classList.contains('topbar-nav-prev')) go(-1)
        if (btn.classList.contains('topbar-nav-next')) go(1)
        return
      }

      // Traffic-light dots: jump to slide 1.
      const homeLink = (e.target as HTMLElement).closest('[data-nav-home]') as HTMLAnchorElement | null
      if (homeLink) {
        e.preventDefault()
        dirRef.current = -1
        prevRef.current = current
        setCurrent(0)
        window.history.replaceState(null, '', '#1')
        return
      }

      // Tab links: jump to the first slide whose data-tab matches.
      const tabLink = (e.target as HTMLElement).closest('[data-tab-target]') as HTMLAnchorElement | null
      if (tabLink) {
        e.preventDefault()
        const targetTab = tabLink.dataset.tabTarget
        const firstSlide = root.querySelector(`.slide[data-tab="${targetTab}"]`) as HTMLElement | null
        if (firstSlide) {
          const idx = Number.parseInt(firstSlide.dataset.slideIndex!, 10)
          dirRef.current = idx > current ? 1 : -1
          prevRef.current = current
          setCurrent(idx)
          window.history.replaceState(null, '', `#${idx + 1}`)
        }
      }
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [go, current])

  return (
    <DeckProvider value={{ tabs }}>
      <div ref={deckRef} className="deck-presenter" style={{ '--slide-scale': scale } as React.CSSProperties}>
        <div className="deck">{children}</div>
      </div>
    </DeckProvider>
  )
}
