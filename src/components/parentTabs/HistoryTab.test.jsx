import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockFetchHistory = vi.fn()
const mockDeleteHistory = vi.fn()

vi.mock('../../services/historyService.js', () => ({
  fetchHistory: (...args) => mockFetchHistory(...args),
  deleteHistory: (...args) => mockDeleteHistory(...args),
}))

import HistoryTab from './HistoryTab.jsx'

describe('HistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteHistory.mockResolvedValue()
  })

  it('shows an empty state when there is no history', async () => {
    mockFetchHistory.mockResolvedValue([])
    render(<HistoryTab onSelectPrint={vi.fn()} />)
    expect(await screen.findByText('No conversations yet. Go talk to Buddy!')).toBeInTheDocument()
  })

  it('renders history entries and calls onSelectPrint', async () => {
    mockFetchHistory.mockResolvedValue([
      { ts: Date.now(), mode: 'chat', user_text: 'Tell me a joke', buddy_text: 'Why did the chicken...' },
    ])
    const onSelectPrint = vi.fn()
    render(<HistoryTab onSelectPrint={onSelectPrint} />)

    expect(await screen.findByText(/Tell me a joke/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Print this'))
    expect(onSelectPrint).toHaveBeenCalledWith(expect.objectContaining({ userText: 'Tell me a joke' }))
  })

  it('uses an inline confirm instead of window.confirm before clearing', async () => {
    mockFetchHistory.mockResolvedValue([
      { ts: Date.now(), mode: 'chat', user_text: 'hi', buddy_text: 'hello' },
    ])
    render(<HistoryTab onSelectPrint={vi.fn()} />)

    fireEvent.click(await screen.findByText('Clear All'))
    expect(screen.getByText('Clear all chat history? This cannot be undone.')).toBeInTheDocument()
    expect(mockDeleteHistory).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Yes, clear it'))
    await waitFor(() => expect(mockDeleteHistory).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('No conversations yet. Go talk to Buddy!')).toBeInTheDocument()
  })
})
