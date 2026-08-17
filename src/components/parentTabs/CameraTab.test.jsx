import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const mockStart = vi.fn()
const mockHandle = { stop: vi.fn() }

vi.mock('../../services/cameraSignal.js', () => ({
  startAsParent: (...args) => mockStart(...args),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-1' } } }) },
  },
}))

import CameraTab from './CameraTab.jsx'

describe('CameraTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStart.mockReturnValue(mockHandle)
  })

  it('shows the Pro upgrade prompt for a free-tier parent instead of the camera UI', () => {
    const onUpgrade = vi.fn()
    render(<CameraTab isPro={false} onUpgrade={onUpgrade} />)
    expect(screen.queryByText('Start Camera')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Upgrade to Pro for peace-of-mind camera check-ins'))
    expect(onUpgrade).toHaveBeenCalledWith('camera')
  })

  it('asks for confirmation before starting, then calls startAsParent', async () => {
    render(<CameraTab isPro={true} onUpgrade={vi.fn()} />)

    fireEvent.click(screen.getByText('Start Camera'))
    expect(screen.getByText(/without asking/)).toBeInTheDocument()
    expect(mockStart).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Yes, start camera'))
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith('parent-1', expect.objectContaining({
      onStatusChange: expect.any(Function),
      onRemoteStream: expect.any(Function),
      onError: expect.any(Function),
    })))
  })

  it('cancelling the confirmation does not start the camera', () => {
    render(<CameraTab isPro={true} onUpgrade={vi.fn()} />)
    fireEvent.click(screen.getByText('Start Camera'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockStart).not.toHaveBeenCalled()
    expect(screen.getByText('Start Camera')).toBeInTheDocument()
  })

  it('maps a cameraSignal reason code to friendly copy via onError', async () => {
    render(<CameraTab isPro={true} onUpgrade={vi.fn()} />)
    fireEvent.click(screen.getByText('Start Camera'))
    fireEvent.click(screen.getByText('Yes, start camera'))
    await waitFor(() => expect(mockStart).toHaveBeenCalled())

    const { onError, onStatusChange } = mockStart.mock.calls[0][1]
    // The real module fires both callbacks together on connection loss —
    // onStatusChange('error') is what makes CameraTab render the error
    // paragraph at all; onError alone only sets the copy inside it.
    act(() => {
      onStatusChange('error')
      onError('connection-lost')
    })
    expect(await screen.findByText(/Connection lost\. Make sure the app is open/)).toBeInTheDocument()
  })

  it('stops the camera connection on unmount (Q1 fix — no lingering background connection)', async () => {
    const { unmount } = render(<CameraTab isPro={true} onUpgrade={vi.fn()} />)
    fireEvent.click(screen.getByText('Start Camera'))
    fireEvent.click(screen.getByText('Yes, start camera'))
    await waitFor(() => expect(mockStart).toHaveBeenCalled())

    expect(mockHandle.stop).not.toHaveBeenCalled()
    unmount()
    expect(mockHandle.stop).toHaveBeenCalledTimes(1)
  })
})
