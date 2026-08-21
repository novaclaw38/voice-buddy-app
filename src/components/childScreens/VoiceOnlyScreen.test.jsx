import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../config/featureFlags.js', () => ({ SING_MODE_ENABLED: true }))

import VoiceOnlyScreen from './VoiceOnlyScreen.jsx'

const baseProps = {
  uiStatus: 'idle',
  buddyText: "Hi there! What's up?",
  userText: '',
  buddyName: 'Buddy',
  onVoicePress: vi.fn(),
  onStartSing: vi.fn(),
  onCustomize: vi.fn(),
  onShowPin: vi.fn(),
}

const renderScreen = (props = {}) =>
  render(
    <MemoryRouter>
      <VoiceOnlyScreen {...baseProps} {...props} />
    </MemoryRouter>
  )

describe('VoiceOnlyScreen', () => {
  it('renders Buddy\'s speech, and the child\'s transcript only when present', () => {
    const { rerender } = renderScreen()
    expect(screen.getByText("Hi there! What's up?")).toBeInTheDocument()
    expect(screen.queryByText(/^You:/)).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <VoiceOnlyScreen {...baseProps} userText="tell me a joke" />
      </MemoryRouter>
    )
    expect(screen.getByText('You: tell me a joke')).toBeInTheDocument()
  })

  it('calls onVoicePress when the mic button is pressed', () => {
    const onVoicePress = vi.fn()
    renderScreen({ onVoicePress })
    // VoiceButton fires on pointerdown (tap semantics), not click.
    fireEvent.pointerDown(screen.getByRole('button', { name: /buddy/i }))
    expect(onVoicePress).toHaveBeenCalledTimes(1)
  })

  it('wires the menu\'s Songs/Customise/Settings entries to the right callbacks', () => {
    const onStartSing = vi.fn()
    const onCustomize = vi.fn()
    const onShowPin = vi.fn()
    renderScreen({ onStartSing, onCustomize, onShowPin })

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /songs/i }))
    expect(onStartSing).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /customise buddy/i }))
    expect(onCustomize).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /parent settings/i }))
    expect(onShowPin).toHaveBeenCalledTimes(1)
  })
})

describe('VoiceOnlyScreen with sing mode disabled', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('../../config/featureFlags.js', () => ({ SING_MODE_ENABLED: false }))
  })

  it('hides the Songs menu entry', async () => {
    const { default: VoiceOnlyScreenDisabled } = await import('./VoiceOnlyScreen.jsx')
    render(
      <MemoryRouter>
        <VoiceOnlyScreenDisabled {...baseProps} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.queryByRole('menuitem', { name: /songs/i })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /customise buddy/i })).toBeInTheDocument()
  })
})
