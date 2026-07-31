import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import styles from './AuthPage.module.css'
import { IconArrowLeft, IconEye, IconEyeOff } from '../components/icons.jsx'

// Reached via the link in a password-reset email. Supabase's client detects
// the recovery token in the URL fragment and establishes a temporary
// session automatically — this page only needs to collect the new password.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // The event can fire before this listener attaches; a session already
    // present (recovery token already processed) means we're still good.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess('Password updated! Redirecting to log in…')
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        <IconArrowLeft size={16} /> Home
      </button>
      <div className={styles.card}>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.subtitle}>Choose a new password for your account</p>

        {!ready ? (
          <p className={styles.hint}>Verifying your reset link…</p>
        ) : (
          <form className={styles.form} onSubmit={handle}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-password">New password</label>
              <div className={styles.passwordWrap}>
                <input
                  id="new-password"
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={19} /> : <IconEye size={19} />}
                </button>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.successMsg}>{success}</p>}

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Please wait...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
