import type React from 'react'
import { type DeckTab, useDeckContext } from './DeckContext'

/**
 * Generic slide wrapper. Renders a <section> with the base `slide` class,
 * a topbar (macOS traffic-lights + optional tabs/title + nav counter),
 * and a content area for children.
 *
 * Tabs come from the surrounding <Deck>'s tabs prop via DeckContext - the
 * library itself is brand-agnostic.
 */
export interface SlideProps {
  children: React.ReactNode
  /** Visual theme - controls background and text styling. */
  theme?: 'dark' | 'light' | 'statement' | 'title'
  /** Optional HTML id for deep-linking to a specific slide. */
  id?: string
  /** Title shown in the topbar (when no `tab` prop is set). */
  title?: string
  /** Active tab id - highlights the matching tab in the topbar nav bar. */
  tab?: string
  /** Spacing density - 'tight' reduces gaps, 'wide' increases padding. */
  space?: 'tight' | 'wide'
  /** Font size variant - 'large' bumps up body text size. */
  fontSize?: 'large'
}

/** Maps the friendly `theme` prop value to its corresponding CSS class name. */
const themeClass: Record<string, string> = { light: 'light-slide', statement: 'statement-slide', title: 'title-slide' }

export default function Slide({ children, theme, id, title, tab, space, fontSize }: SlideProps) {
  const { tabs, footer } = useDeckContext()
  const cls = [theme && themeClass[theme], space && `space-${space}`, fontSize && `font-${fontSize}`]
    .filter(Boolean)
    .join(' ')

  // Show the tab bar only when this slide opted in (`tab` prop) AND the deck has tabs configured.
  const showTabs = !!tab && tabs.length > 0

  return (
    <section
      className={`slide${cls ? ` ${cls}` : ''}`}
      id={id}
      data-slide-title={title || undefined}
      data-tab={tab || undefined}
    >
      <div className="slide-topbar">
        {/* Traffic-light dots link back to the first slide (handled by Deck.tsx). */}
        <a href="#1" className="topbar-dots" data-nav-home>
          <span className="topbar-dot topbar-dot--red" />
          <span className="topbar-dot topbar-dot--yellow" />
          <span className="topbar-dot topbar-dot--green" />
        </a>
        {showTabs ? <TabBar tabs={tabs} active={tab!} /> : title && <span className="topbar-title">{title}</span>}
        <span className="topbar-nav" />
      </div>
      <div className="slide-content">
        <div className="slide-body">{children}</div>
      </div>
      {footer && <div className="slide-footer">{footer}</div>}
    </section>
  )
}

/** Renders the topbar tab navigation. Tab links are wired up in Deck.tsx via event delegation. */
function TabBar({ tabs, active }: { tabs: DeckTab[]; active: string }) {
  return (
    <div className="topbar-tabs">
      {tabs.map((t, i) => (
        <span key={t.id} className="topbar-tab-group">
          {i > 0 && <span className="topbar-tab-sep">{'→'}</span>}
          <a href="#" data-tab-target={t.id} className={`topbar-tab${active === t.id ? ' topbar-tab--active' : ''}`}>
            {t.label}
          </a>
        </span>
      ))}
    </div>
  )
}
