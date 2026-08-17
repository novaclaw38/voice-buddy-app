import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NormalScreen from './NormalScreen.jsx'

const baseSpeech = {
  speak: vi.fn(),
  supported: { stt: true, tts: true },
  audioRef: { current: null },
  boundaryWordRef: { current: -1 },
}

const baseProps = {
  settings: { avatarColor: '#7c3aed', costume: null },
  buddyName: 'Buddy',
  chatMode: 'chat',
  partOfDay: 'afternoon',
  speech: baseSpeech,
  uiStatus: 'idle',
  buddyText: "Hi! Let's play.",
  userText: '',
  cameraOn: false,
  parentMessage: null,
  onShowMessage: vi.fn(),
  showActivity: false,
  dailyActivity: { emoji: '🎨', description: 'Draw your favorite animal', title: 'Drawing time' },
  onDismissActivity: vi.fn(),
  storyPhase: null,
  onPlayStory: vi.fn(),
  onDeclineStory: vi.fn(),
  onExitMode: vi.fn(),
  onStartSing: vi.fn(),
  onStartStory: vi.fn(),
  onVoicePress: vi.fn(),
  onShowPicker: vi.fn(),
  onShowPin: vi.fn(),
}

const renderScreen = (props = {}) =>
  render(
    <MemoryRouter>
      <NormalScreen {...baseProps} {...props} />
    </MemoryRouter>
  )

describe('NormalScreen', () => {
  it('renders the speech bubble text', () => {
    renderScreen()
    expect(screen.getByText("Hi! Let's play.")).toBeInTheDocument()
  })

  it('wires the dock buttons to their callbacks', () => {
    const onStartSing = vi.fn()
    const onStartStory = vi.fn()
    const onShowPicker = vi.fn()
    const onShowPin = vi.fn()
    renderScreen({ onStartSing, onStartStory, onShowPicker, onShowPin })

    fireEvent.click(screen.getByText('Songs'))
    expect(onStartSing).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Story'))
    expect(onStartStory).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('My Buddy'))
    expect(onShowPicker).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Parents'))
    expect(onShowPin).toHaveBeenCalledTimes(1)
  })

  it('only shows the mode-exit label when not in chat mode', () => {
    const { rerender } = renderScreen({ chatMode: 'chat' })
    expect(screen.queryByLabelText(/Leave .* mode/i)).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <NormalScreen {...baseProps} chatMode="story" />
      </MemoryRouter>
    )
    const exitBtn = screen.getByLabelText('Leave story mode')
    fireEvent.click(exitBtn)
    expect(baseProps.onExitMode).toHaveBeenCalled()
  })

  it('shows the envelope button only when a parent message is pending, and triggers onShowMessage', () => {
    const onShowMessage = vi.fn()
    const { rerender } = renderScreen({ parentMessage: null, onShowMessage })
    expect(screen.queryByLabelText(/Message from your parent/i)).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <NormalScreen {...baseProps} parentMessage={{ id: 'm1' }} onShowMessage={onShowMessage} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByLabelText(/Message from your parent/i))
    expect(onShowMessage).toHaveBeenCalledTimes(1)
  })

  it('shows the camera indicator only when cameraOn is true', () => {
    const { rerender } = renderScreen({ cameraOn: false })
    expect(screen.queryByLabelText('Camera on')).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <NormalScreen {...baseProps} cameraOn={true} />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('Camera on')).toBeInTheDocument()
  })

  it('renders the story overlay when storyPhase is "ask" and wires its buttons', () => {
    const onPlayStory = vi.fn()
    const onDeclineStory = vi.fn()
    renderScreen({ storyPhase: 'ask', onPlayStory, onDeclineStory })

    expect(screen.getByText(/Someone left you a story idea/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Yes, tell me!/i))
    expect(onPlayStory).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Not now'))
    expect(onDeclineStory).toHaveBeenCalledTimes(1)
  })

  it('does not render the story overlay when storyPhase is null', () => {
    renderScreen({ storyPhase: null })
    expect(screen.queryByText(/Someone left you a story idea/i)).not.toBeInTheDocument()
  })
})
