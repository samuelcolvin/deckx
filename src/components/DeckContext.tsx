import { createContext, useContext } from 'react'

/** A single tab entry shown in the slide topbar tab navigation. */
export interface DeckTab {
  id: string
  label: string
}

/** Built-in deck theme. See `DeckTheme` in src/config.ts for semantics. */
export type DeckTheme = 'light' | 'dark' | 'markdown-light' | 'markdown-dark'

/** Configuration provided by <Deck> to descendant <Slide> components. */
export interface DeckContextValue {
  /** Optional tabs for the topbar nav bar. Empty/undefined hides the tab bar. */
  tabs: DeckTab[]
  /** Active deck theme. Slides may use this to render theme-conditional markup. */
  theme: DeckTheme
  /** Optional footer text shown on every slide. */
  footer?: string
}

const DeckContext = createContext<DeckContextValue>({ tabs: [], theme: 'light' })

/** Provider for deck-level config. Wrapped around children by <Deck>. */
export const DeckProvider = DeckContext.Provider

/** Hook used by <Slide> to read deck-level config. */
export function useDeckContext(): DeckContextValue {
  return useContext(DeckContext)
}
