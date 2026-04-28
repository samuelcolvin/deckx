/** Type declarations so TypeScript treats *.mdx imports as React components. */
declare module '*.mdx' {
  import type { ComponentType } from 'react'

  const Component: ComponentType
  export default Component
}

declare module 'deckx-user-deck' {
  import type { ComponentType } from 'react'

  const Component: ComponentType
  export default Component
}

declare module 'deckx-user-styles'
declare module 'deckx-base-styles'

declare module 'deckx-user-config' {
  import type { DeckTab } from './config.ts'
  export const config: { title?: string; tabs: DeckTab[] }
}
