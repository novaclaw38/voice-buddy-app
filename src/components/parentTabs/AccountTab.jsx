import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fetchWhatsAppPrefs, updateWhatsAppPrefs } from '../../services/profileService.js'
import styles from './shared.module.css'

export default function AccountTab({ session }) {
  const [updatePaymentStatus, setUpdatePaymentStatus] = useState('idle') // idle | redirecting | error
  const [updatePaymentError, setUpdatePaymentError] = useState('')

  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [whatsappStatus, setWhatsappStatus] = useState('idle') // idle | saving | saved | error
  const [whatsappError, setWhatsappError] = useState('')

  useEffect(() => {
    fetchWhatsAppPrefs().then((prefs) => {
      if (!prefs) return
      setWhatsappNumber(prefs.number)
      setWhatsappOptIn(prefs.optIn)
    }).catch(() => {})
  }, [])

  const handleSaveWhatsApp = async () => {
    setWhatsappStatus('saving')
    setWhatsappError('')
    try {
      await updateWhatsAppPrefs({ number: whatsappNumber, optIn: whatsappOptIn })
      setWhatsappStatus('saved')
    } catch (err) {
      setWhatsappStatus('error')
      setWhatsappError(err.message || 'Could not save your WhatsApp settings')
    }
  }

  const handleUpdatePayment = async () => {
    setUpdatePaymentStatus('redirecting')
    setUpdatePaymentError('')
    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/payfast-update-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshSession?.access_token}`,
        },
        body: JSON.stringify({
          firstName: freshSession?.user?.user_metadata?.full_name?.split(' ')[0] || 'Parent',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not start payment update')
      window.location.href = body.paymentUrl
    } catch (err) {
      setUpdatePaymentStatus('error')
      setUpdatePaymentError(err.message || 'Something went wrong')
    }
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Account</h2>

      <div className={styles.field}>
        <label className={styles.label}>Email</label>
        <input className={styles.input} value={session?.user?.email || ''} disabled readOnly />
      </div>

      <div className={styles.field} style={{ marginTop: 20 }}>
        <label className={styles.label}>Payment Method</label>
        <p className={styles.hint} style={{ marginBottom: 10 }}>
          Update the card used for your monthly Buddy Pro subscription. You'll be taken to
          PayFast's secure page to enter a new card — nothing changes until you complete it,
          and your next charge still happens on your normal renewal date.
        </p>
        <button
          className={styles.btnTest}
          onClick={handleUpdatePayment}
          disabled={updatePaymentStatus === 'redirecting'}
        >
          {updatePaymentStatus === 'redirecting' ? 'Redirecting to PayFast...' : 'Update Payment Method'}
        </button>
        {updatePaymentStatus === 'error' && (
          <p className={styles.testError} style={{ marginTop: 10 }}>{updatePaymentError}</p>
        )}
      </div>

      <div className={styles.field} style={{ marginTop: 20 }}>
        <label className={styles.label}>WhatsApp Weekly Storybook</label>
        <p className={styles.hint} style={{ marginBottom: 10 }}>
          Get a link to your child's personalized weekly recap every Sunday, sent to the
          WhatsApp number below. You can turn this off any time.
        </p>
        <input
          className={styles.input}
          type="tel"
          placeholder="+27 12 345 6789"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input
            type="checkbox"
            checked={whatsappOptIn}
            onChange={(e) => setWhatsappOptIn(e.target.checked)}
          />
          Send me the weekly WhatsApp storybook
        </label>
        <button
          className={styles.btnTest}
          style={{ marginTop: 10 }}
          onClick={handleSaveWhatsApp}
          disabled={whatsappStatus === 'saving'}
        >
          {whatsappStatus === 'saving' ? 'Saving...' : 'Save WhatsApp Settings'}
        </button>
        {whatsappStatus === 'saved' && (
          <p className={styles.hint} style={{ marginTop: 10 }}>Saved!</p>
        )}
        {whatsappStatus === 'error' && (
          <p className={styles.testError} style={{ marginTop: 10 }}>{whatsappError}</p>
        )}
      </div>
    </div>
  )
}
