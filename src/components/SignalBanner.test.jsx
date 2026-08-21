import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SignalBanner from './SignalBanner.jsx'

describe('SignalBanner', () => {
  it('renders nothing when signal is null', () => {
    const { container } = render(<SignalBanner signal={null} onReview={vi.fn()} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the blurb when a signal is present', () => {
    render(<SignalBanner signal={{ blurb: 'Buddy noticed Mia seemed a little sad today.' }} onReview={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/Buddy noticed Mia seemed a little sad today\./)).toBeInTheDocument()
  })

  it('calls onReview when the review button is clicked', () => {
    const onReview = vi.fn()
    render(<SignalBanner signal={{ blurb: 'x' }} onReview={onReview} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByText(/review/i))
    expect(onReview).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<SignalBanner signal={{ blurb: 'x' }} onReview={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByLabelText(/dismiss/i))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
