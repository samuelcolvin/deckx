/**
 * Library entry point. Re-exports the React components users may consume from
 * their deck.mdx and any custom components.
 */

export type { DeckProps } from './components/Deck.tsx'
export { default as Deck } from './components/Deck.tsx'
export type { DeckContextValue, DeckTab } from './components/DeckContext.tsx'
export { DeckProvider, useDeckContext } from './components/DeckContext.tsx'
export type { SlideProps } from './components/Slide.tsx'
export { default as Slide } from './components/Slide.tsx'
