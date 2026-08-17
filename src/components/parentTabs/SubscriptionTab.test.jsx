import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockFrom = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() }

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }),
    },
    from: vi.fn(() => mockFrom),
  },
}))

import SubscriptionTab from './SubscriptionTab.jsx'

describe('SubscriptionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('shows Free plan copy when there is no subscription row', async () => {
    mockFrom.maybeSingle.mockResolvedValue({ data: null })
    render(<SubscriptionTab />)
    // "Plan:" is a <strong> nested in the <p> — assert on the parent so the
    // full sentence is checked, not just the bolded label.
    const label = await screen.findByText('Plan:')
    expect(label.parentElement).toHaveTextContent('Plan: Free')
  })

  it('shows trial days-left copy for an active trial', async () => {
    const trialEnd = new Date(Date.now() + 3 * 86400000).toISOString()
    mockFrom.maybeSingle.mockResolvedValue({ data: { status: 'trial', trial_end: trialEnd, subscription_end: null } })
    render(<SubscriptionTab />)
    expect(await screen.findByText(/Free trial/)).toBeInTheDocument()
    expect(screen.getByText(/3 days left/)).toBeInTheDocument()
  })

  it('walks the cancel confirmation flow for an active subscription', async () => {
    mockFrom.maybeSingle.mockResolvedValue({ data: { status: 'active', subscription_end: null } })
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

    render(<SubscriptionTab />)
    const cancelBtn = await screen.findByText('Cancel Subscription')
    fireEvent.click(cancelBtn)
    expect(screen.getByText('Yes, cancel')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Yes, cancel'))
    // subInfo.status flips to 'cancelled' via the optimistic local update,
    // which closes the surrounding trial/active block (and the "done"
    // message inside it) — the summary line and the standalone cancelled
    // hint are what's left, matching the pre-existing behavior this was
    // migrated from verbatim.
    await waitFor(() => {
      const label = screen.getByText('Plan:')
      expect(label.parentElement).toHaveTextContent('Plan: Cancelled')
    })
    expect(screen.getByText("Your subscription is cancelled. You won't be charged again.")).toBeInTheDocument()
  })
})
