import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// NormalScreen imports TacticalOrb, which uses @react-three/fiber (Canvas/useFrame)
// and @react-three/drei (OrbitControls). In jsdom there is no WebGL context, so
// R3F's createReconciler crashes on import. The tests only assert on the 2D DOM
// output (speech bubble, dock buttons, camera indicator, story overlay) — the 3D
// orb itself is not part of these test cases, so mock it as an inert placeholder.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: () => {},
}))
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Sphere: () => null,
  Torus: () => null,
}))
// TacticalOrb's useEffect calls canvas.getContext('webgl2'), which jsdom
// doesn't implement. Stub TacticalOrb to a data-attribute placeholder.
vi.mock('../TacticalOrb.jsx', () => ({
  default: () => <div data-testid="tactical-orb" />,
}))
// NormalScreen calls sfx.click() / sfx.nav() on button presses; the SoundFX
// class uses the Web Audio API (AudioContext), which jsdom doesn't implement.
vi.mock('../sound-fx.js', () => ({
  sfx: { click: vi.fn(), nav: vi.fn(), alert: vi.fn(), hiss: vi.fn(), success: vi.fn() },
}))

import NormalScreen from './NormalScreen.jsx'

const baseSpeech = {
  speak: vi.fn(),
  supported: { stt: true, tts: true },
  audioRef: { current: null },
  boundaryWordRef: { current: -1 },
  wordIndex: -1,
}

const baseProps = {
  settings: { rank: 1, totalXp: 0 },
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
    const onStartStory = vi.fn()
    const onShowPicker = vi.fn()
    const onShowPin = vi.fn()
    renderScreen({ onStartStory, onShowPicker, onShowPin })

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

  it('never renders a Songs dock button (sing mode removed)', () => {
    renderScreen()
    expect(screen.queryByText('Songs')).not.toBeInTheDocument()
  })
})
