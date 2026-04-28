import { createContext, useContext } from 'react'

/** A single tab entry shown in the slide topbar tab navigation. */
export interface DeckTab {
  id: string
  label: string
}

/** Configuration provided by <Deck> to descendant <Slide> components. */
export interface DeckContextValue {
  /** Optional tabs for the topbar nav bar. Empty/undefined hides the tab bar. */
  tabs: DeckTab[]
}

const DeckContext = createContext<DeckContextValue>({ tabs: [] })

/** Provider for deck-level config (tabs). Wrapped around children by <Deck>. */
export const DeckProvider = DeckContext.Provider

/** Hook used by <Slide> to read deck-level config. */
export function useDeckContext(): DeckContextValue {
  return useContext(DeckContext)
}
