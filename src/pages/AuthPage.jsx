import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then log in.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // App.jsx will detect the session change and redirect
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.home} onClick={() => navigate('/')}>
        ← Home
      </button>
      <div className={styles.card}>
        {/* Bear logo */}
        <div className={styles.logo}>
          <svg viewBox="0 0 100 100" className={styles.bear}>
            <circle cx="22" cy="24" r="18" fill="#7c3aed" />
            <circle cx="78" cy="24" r="18" fill="#7c3aed" />
            <circle cx="22" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
            <circle cx="78" cy="24" r="11" fill="rgba(255,190,190,0.45)" />
            <circle cx="50" cy="58" r="39" fill="#7c3aed" />
            <ellipse cx="50" cy="71" rx="17" ry="12" fill="rgba(255,255,255,0.18)" />
            <circle cx="35" cy="50" r="9" fill="white" />
            <circle cx="37" cy="50" r="5" fill="#1e1b4b" />
            <circle cx="38" cy="48" r="2" fill="white" />
            <circle cx="65" cy="50" r="9" fill="white" />
            <circle cx="63" cy="50" r="5" fill="#1e1b4b" />
            <circle cx="64" cy="48" r="2" fill="white" />
            <ellipse cx="50" cy="63" rx="5.5" ry="4" fill="rgba(0,0,0,0.35)" />
            <path d="M 38 72 Q 50 81 62 72" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="24" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
            <circle cx="76" cy="65" r="9" fill="rgba(255,140,140,0.22)" />
          </svg>
        </div>

        <h1 className={styles.title}>Buddy</h1>
        <p className={styles.subtitle}>Your child's AI buddy</p>

        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'login' ? styles.activeTab : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
          >Log In</button>
          <button
            className={`${styles.modeTab} ${mode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
          >Sign Up</button>
        </div>

        <form className={styles.form} onSubmit={handle}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className={styles.input}
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <p className={styles.hint}>
          {mode === 'login'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            className={styles.switchBtn}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
          >
            {mode === 'login' ? 'Sign up free' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
