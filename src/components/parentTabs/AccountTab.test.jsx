import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't', user: { user_metadata: { full_name: 'Sam Parent' } } } } }),
    },
  },
}))

import AccountTab from './AccountTab.jsx'

describe('AccountTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('shows the session email, read-only', () => {
    render(<AccountTab session={{ user: { email: 'parent@example.com' } }} />)
    const input = screen.getByDisplayValue('parent@example.com')
    expect(input).toBeDisabled()
  })

  it('redirects to the returned PayFast URL on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ paymentUrl: 'https://payfast.example/pay' }) })
    delete window.location
    window.location = { href: '' }

    render(<AccountTab session={{ user: { email: 'p@e.com' } }} />)
    fireEvent.click(screen.getByText('Update Payment Method'))

    await waitFor(() => expect(window.location.href).toBe('https://payfast.example/pay'))
  })

  it('shows an error message when the update-payment request fails', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Could not start payment update' }) })

    render(<AccountTab session={{ user: { email: 'p@e.com' } }} />)
    fireEvent.click(screen.getByText('Update Payment Method'))

    expect(await screen.findByText('Could not start payment update')).toBeInTheDocument()
  })
})
