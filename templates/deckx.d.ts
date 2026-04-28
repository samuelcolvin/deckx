/**
 * Type alias so templates/main.tsx can import from `'deckx'` and have its types
 * resolve back to the source. At runtime, the CLI's vite resolve.alias maps
 * `'deckx'` to <pkg>/dist/index.js.
 */
declare module 'deckx' {
  export type { DeckContextValue, DeckProps, DeckTab, SlideProps } from '../src/index.ts'
  export { Deck, DeckProvider, Slide, useDeckContext } from '../src/index.ts'
}

declare module 'deckx-base-styles'
declare module 'deckx-user-styles'

declare module 'deckx-user-deck' {
  import type { ComponentType } from 'react'

  const Component: ComponentType
  export default Component
}

declare module 'deckx-user-config' {
  import type { DeckTab } from '../src/config.ts'
  export const config: { title?: string; tabs: DeckTab[] }
}
