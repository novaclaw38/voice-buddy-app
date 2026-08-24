import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't', user: { user_metadata: { full_name: 'Sam Parent' } } } } }),
    },
  },
}))

vi.mock('../../services/profileService.js', () => ({
  fetchWhatsAppPrefs: vi.fn(),
  updateWhatsAppPrefs: vi.fn(),
}))

import AccountTab from './AccountTab.jsx'
import { fetchWhatsAppPrefs, updateWhatsAppPrefs } from '../../services/profileService.js'

describe('AccountTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    fetchWhatsAppPrefs.mockResolvedValue({ number: '', optIn: false })
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

  it('loads existing WhatsApp prefs on mount', async () => {
    fetchWhatsAppPrefs.mockResolvedValue({ number: '+27123456789', optIn: true })
    render(<AccountTab session={{ user: { email: 'p@e.com' } }} />)
    expect(await screen.findByDisplayValue('+27123456789')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('saves WhatsApp prefs and shows a confirmation', async () => {
    updateWhatsAppPrefs.mockResolvedValue()
    render(<AccountTab session={{ user: { email: 'p@e.com' } }} />)
    await waitFor(() => expect(fetchWhatsAppPrefs).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText('+27 12 345 6789'), { target: { value: '+27987654321' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText('Save WhatsApp Settings'))

    expect(await screen.findByText('Saved!')).toBeInTheDocument()
    expect(updateWhatsAppPrefs).toHaveBeenCalledWith({ number: '+27987654321', optIn: true })
  })

  it('shows an error when saving WhatsApp prefs fails', async () => {
    updateWhatsAppPrefs.mockRejectedValue(new Error('Could not save your WhatsApp settings'))
    render(<AccountTab session={{ user: { email: 'p@e.com' } }} />)
    await waitFor(() => expect(fetchWhatsAppPrefs).toHaveBeenCalled())

    fireEvent.click(screen.getByText('Save WhatsApp Settings'))

    expect(await screen.findByText('Could not save your WhatsApp settings')).toBeInTheDocument()
  })
})
