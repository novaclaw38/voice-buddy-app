import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockFetchMessages = vi.fn()
const mockSendVoiceMessage = vi.fn()
const mockFetchSentStoryRequests = vi.fn()
const mockSendStoryRequest = vi.fn()

vi.mock('../../services/messageService.js', () => ({
  fetchMessages: (...a) => mockFetchMessages(...a),
  sendVoiceMessage: (...a) => mockSendVoiceMessage(...a),
  fetchMessageById: vi.fn(),
  markPlayed: vi.fn(),
}))

vi.mock('../../services/storyRequestService.js', () => ({
  fetchSentStoryRequests: (...a) => mockFetchSentStoryRequests(...a),
  sendStoryRequest: (...a) => mockSendStoryRequest(...a),
}))

import MessagesTab from './MessagesTab.jsx'

// A bare call-recording fake — same philosophy as cameraSignal.test.js's
// FakePeerConnection: exercise the dispatch logic, not real audio capture.
class FakeMediaRecorder {
  constructor(stream) {
    this.stream = stream
    this.state = 'inactive'
    this.mimeType = 'audio/webm'
    this.ondataavailable = null
    this.onstop = null
  }
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['x'.repeat(600)]) })
    this.onstop?.()
  }
}

describe('MessagesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchMessages.mockResolvedValue([])
    mockFetchSentStoryRequests.mockResolvedValue([])
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
      },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('shows the Pro upgrade prompt for a free-tier parent instead of the record button', async () => {
    const onUpgrade = vi.fn()
    render(<MessagesTab isPro={false} onUpgrade={onUpgrade} />)
    expect(screen.queryByLabelText(/Hold to record/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Upgrade to Pro to send Buddy a voice message'))
    expect(onUpgrade).toHaveBeenCalledWith('messages')
    // Let the mount-effect's fetchMessages/fetchSentStoryRequests settle
    // before the test ends, so their resolution doesn't warn as an
    // unwrapped update after this test has already moved on.
    await screen.findByText('No messages sent yet.')
  })

  it('records and sends a voice message on hold-and-release', async () => {
    mockSendVoiceMessage.mockResolvedValue({})
    render(<MessagesTab isPro={true} onUpgrade={vi.fn()} />)

    const recordBtn = await screen.findByLabelText('Hold to record a voice message')
    fireEvent.pointerDown(recordBtn)
    // startRecording awaits getUserMedia before flipping status.
    expect(await screen.findByText('Recording... release to send')).toBeInTheDocument()

    fireEvent.pointerUp(screen.getByLabelText('Recording, release to send'))
    await waitFor(() => expect(mockSendVoiceMessage).toHaveBeenCalledTimes(1))
  })

  it('sends a story request and clears the textarea', async () => {
    mockSendStoryRequest.mockResolvedValue({})
    render(<MessagesTab isPro={true} onUpgrade={vi.fn()} />)

    const textarea = await screen.findByPlaceholderText(/brave little dragon/)
    fireEvent.change(textarea, { target: { value: 'a curious fox' } })
    fireEvent.click(screen.getByText('Send story idea'))

    await waitFor(() => expect(mockSendStoryRequest).toHaveBeenCalledWith('a curious fox'))
  })
})
