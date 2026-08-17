import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockSpeak = vi.fn((text, onDone) => onDone?.())
vi.mock('../../hooks/useSpeech.js', () => ({
  useSpeech: () => ({ speak: mockSpeak }),
}))

const mockTestConnection = vi.fn()
vi.mock('../../services/chatService.js', () => ({
  testConnection: (...a) => mockTestConnection(...a),
}))

vi.mock('../../services/childrenService.js', () => ({
  updateChild: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../utils/storage.js', () => ({
  hashPin: vi.fn().mockImplementation(async (pin) => `hash(${pin})`),
  getActiveChildId: () => null,
}))

// AvatarPicker's own internals (subscription gating, costume catalog) are
// not SettingsTab's concern — stubbed to its onSave/onClose seam, same
// pattern as ParentPin in GoalReachedScreen.test.jsx (Candidate B).
vi.mock('../AvatarPicker.jsx', () => ({
  default: ({ onSave, onClose }) => (
    <div data-testid="avatar-picker">
      <button onClick={() => onSave({ type: 'cat', name: 'Whiskers', color: '#db2777', costume: null })}>
        Simulate save
      </button>
      <button onClick={onClose}>Simulate close</button>
    </div>
  ),
}))

import SettingsTab from './SettingsTab.jsx'

const baseSettings = {
  childName: 'Sam',
  childAge: 6,
  avatarType: 'bear',
  avatarColor: '#7c3aed',
  costume: null,
  parentPinHash: 'existing-hash',
  speechRate: 0.9,
  autoListen: false,
  voiceOnly: false,
  dailyLimitMinutes: null,
  voiceName: 'default',
}

const baseProps = {
  settings: baseSettings,
  onUpdateSetting: vi.fn(),
  isPro: true,
  onUpgrade: vi.fn(),
  session: { user: { id: 'u1' } },
}

describe('SettingsTab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls onUpdateSetting when the child name changes', () => {
    const onUpdateSetting = vi.fn()
    render(<SettingsTab {...baseProps} onUpdateSetting={onUpdateSetting} />)
    fireEvent.change(screen.getByLabelText("Child's Name"), { target: { value: 'Byron' } })
    expect(onUpdateSetting).toHaveBeenCalledWith('childName', 'Byron')
  })

  it('shows the daily-limit picker for Pro, and an upgrade nudge for free', () => {
    const onUpgrade = vi.fn()
    const { rerender } = render(<SettingsTab {...baseProps} isPro={true} />)
    expect(screen.getByText('Off').closest('select')).toBeInTheDocument()

    rerender(<SettingsTab {...baseProps} isPro={false} onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByText('Upgrade to Pro to set a daily limit'))
    expect(onUpgrade).toHaveBeenCalledWith('timeLimit')
  })

  it('requires the PIN to be entered twice, matching, before saving', async () => {
    const onUpdateSetting = vi.fn()
    render(<SettingsTab {...baseProps} onUpdateSetting={onUpdateSetting} />)
    const pinInput = screen.getByLabelText('Parent PIN')

    fireEvent.change(pinInput, { target: { value: '1234' } })
    expect(screen.getByText('Type it once more to confirm')).toBeInTheDocument()
    expect(onUpdateSetting).not.toHaveBeenCalled()

    fireEvent.change(pinInput, { target: { value: '1234' } })
    await waitFor(() => expect(onUpdateSetting).toHaveBeenCalledWith('parentPinHash', 'hash(1234)'))
    expect(await screen.findByText(/New PIN saved/)).toBeInTheDocument()
  })

  it('shows a mismatch error when the confirmation PIN differs', () => {
    render(<SettingsTab {...baseProps} />)
    const pinInput = screen.getByLabelText('Parent PIN')
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.change(pinInput, { target: { value: '9999' } })
    expect(screen.getByText("Those PINs didn't match — try again.")).toBeInTheDocument()
  })

  it('previews the selected voice by speaking a sample line', () => {
    render(<SettingsTab {...baseProps} />)
    fireEvent.click(screen.getByText('Preview'))
    expect(mockSpeak).toHaveBeenCalledWith(expect.stringContaining("I'm Buddy"), expect.any(Function))
  })

  it('runs the connection test and shows the result', async () => {
    mockTestConnection.mockResolvedValue()
    render(<SettingsTab {...baseProps} />)
    fireEvent.click(screen.getByText('Buddy not responding? Test connection'))
    expect(await screen.findByText(/Connected!/)).toBeInTheDocument()
  })

  it('shows a connection-test failure message', async () => {
    mockTestConnection.mockRejectedValue(new Error('Network unreachable'))
    render(<SettingsTab {...baseProps} />)
    fireEvent.click(screen.getByText('Buddy not responding? Test connection'))
    expect(await screen.findByText('Network unreachable')).toBeInTheDocument()
  })

  it('opens AvatarPicker on Customize and forwards a save to onUpdateSetting', () => {
    const onUpdateSetting = vi.fn()
    render(<SettingsTab {...baseProps} onUpdateSetting={onUpdateSetting} />)

    expect(screen.queryByTestId('avatar-picker')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Customize'))
    expect(screen.getByTestId('avatar-picker')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Simulate save'))
    expect(onUpdateSetting).toHaveBeenCalledWith('avatarType', 'cat')
    expect(onUpdateSetting).toHaveBeenCalledWith('buddyName', 'Whiskers')
    expect(screen.queryByTestId('avatar-picker')).not.toBeInTheDocument()
  })
})
