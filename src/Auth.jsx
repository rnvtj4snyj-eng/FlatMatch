import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Only allow university emails
function isUniEmail(email) {
  return email.trim().toLowerCase().endsWith('@uclive.ac.nz')
}

// FlatMatch colours + fonts (matches the rest of the app)
const C = {
  paper: '#F7F6F2',
  ink: '#1E2B2E',
  inkSoft: '#5A6B6E',
  purple: '#7C5CBF',
  teal: '#1A9090',
  border: '#E2E5E4',
}
const FONT_DISPLAY = "'DM Serif Display', Georgia, serif"
const FONT_BODY = "'Inter', sans-serif"

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('signup') // 'signup' or 'login'
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  // Check if someone is already logged in when the page loads
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSignUp() {
    if (!isUniEmail(email)) {
      setMessage('Please use your university email (@uclive.ac.nz)')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Success! Check your email and click the confirmation link.')
    }
  }

  async function handleLogin() {
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMessage('')
  }

  // ── Logged in: show a small floating badge instead of the modal ──
  if (user) {
    const verified = Boolean(user.email_confirmed_at)
    return (
      <div style={styles.badgeBar}>
        {verified && <span style={styles.verifiedBadge}>✅ Verified UC Student</span>}
        <span style={styles.badgeEmail}>{user.email}</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  // ── User chose to browse without an account ──
  if (dismissed) return null

  // ── Not logged in: show the popup ──
  const submit = mode === 'signup' ? handleSignUp : handleLogin

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Welcome to FlatMatch</h2>
        <p style={styles.subtitle}>
          Sign in with your university email to connect with verified students.
        </p>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={mode === 'signup' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('signup'); setMessage('') }}
          >
            Sign up
          </button>
          <button
            style={mode === 'login' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('login'); setMessage('') }}
          >
            Log in
          </button>
        </div>

        <input
          type="email"
          placeholder="you@uclive.ac.nz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        <button style={styles.primaryBtn} onClick={submit} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <button style={styles.browseBtn} onClick={() => setDismissed(true)}>
          Browse without signing in
        </button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(30, 43, 46, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px 32px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(30,43,46,0.25)',
    fontFamily: FONT_BODY,
    textAlign: 'center',
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    fontWeight: 600,
    color: C.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.6,
    color: C.inkSoft,
    marginBottom: 24,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    background: C.paper,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    color: C.inkSoft,
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    background: C.purple,
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    cursor: 'pointer',
  },
  input: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    width: '100%',
    padding: '13px 16px',
    border: `1.5px solid ${C.border}`,
    borderRadius: 12,
    marginBottom: 12,
    boxSizing: 'border-box',
    color: C.ink,
    background: '#fff',
  },
  primaryBtn: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    padding: '14px 0',
    background: C.purple,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    marginTop: 4,
  },
  browseBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    color: C.inkSoft,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginTop: 16,
    textDecoration: 'underline',
  },
  message: {
    fontSize: 13,
    color: C.ink,
    background: C.paper,
    borderRadius: 8,
    padding: '10px 14px',
    marginTop: 14,
    lineHeight: 1.5,
  },
  // Logged-in badge bar (top of page)
  badgeBar: {
    position: 'fixed',
    top: 72,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fff',
    border: `1.5px solid ${C.border}`,
    borderRadius: 999,
    padding: '6px 8px 6px 14px',
    boxShadow: '0 4px 16px rgba(30,43,46,0.10)',
    zIndex: 500,
    fontFamily: FONT_BODY,
  },
  verifiedBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: C.teal,
  },
  badgeEmail: {
    fontSize: 12,
    color: C.inkSoft,
  },
  logoutBtn: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: C.purple,
    border: 'none',
    borderRadius: 999,
    padding: '6px 14px',
    cursor: 'pointer',
  },
}