/**
 * Vite entry point for a deckx build. The CLI wires the four virtual modules
 * below to the package's dist files and the user's cwd via resolve.alias.
 */

import { Deck } from 'deckx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'deckx-base-styles'
import 'deckx-user-styles'
import { config } from 'deckx-user-config'
import DeckContent from 'deckx-user-deck'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Deck title={config.title} theme={config.theme} tabs={config.tabs}>
      <DeckContent />
    </Deck>
  </StrictMode>,
)
