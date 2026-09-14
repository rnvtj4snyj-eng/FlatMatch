import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useAuthUser } from './useAuthUser'

function isUniEmail(email) {
  return email.trim().toLowerCase().endsWith('@uclive.ac.nz')
}

const C = {
  paper: '#F7F6F2', ink: '#1E2B2E', inkSoft: '#5A6B6E',
  purple: '#7C5CBF', teal: '#1A9090', border: '#E2E5E4',
}
const FONT_DISPLAY = "'DM Serif Display', Georgia, serif"
const FONT_BODY = "'Inter', sans-serif"

function initialsFrom(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }
  return (email?.[0] || '?').toUpperCase()
}

export default function AccountMenu({ user: propUser, showModal, setShowModal }) {
  const { user: hookUser } = useAuthUser()
  const user = propUser ?? hookUser
  const [profile, setProfile] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const menuRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!user) { setProfile(null); return }
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
  }, [user])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignUp() {
    if (!isUniEmail(email)) { setMessage('Please use your university email (@uclive.ac.nz)'); return }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user && name.trim()) {
      await supabase.from('profiles').upsert({ id: data.user.id, full_name: name.trim() })
    }
    setBusy(false)
    setMessage(error ? error.message : 'Success! Check your email to confirm your account.')
  }

  async function handleLogin() {
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setMessage(error.message)
    else { setMessage(''); setShowModal(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new Image()
      img.onload = async () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const min = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        await supabase.from('profiles').upsert({ id: user.id, avatar_url: dataUrl })
        setProfile((p) => ({ ...(p || {}), avatar_url: dataUrl }))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Logged in: avatar circle + dropdown ──
  if (user) {
    const verified = Boolean(user.email_confirmed_at)
    const avatar = profile?.avatar_url
    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button onClick={() => setMenuOpen((o) => !o)} style={styles.avatarBtn} aria-label="Account menu">
          {avatar
            ? <img src={avatar} alt="You" style={styles.avatarImg} />
            : <span style={styles.avatarInitials}>{initialsFrom(profile?.full_name, user.email)}</span>}
        </button>
        {menuOpen && (
          <div style={styles.dropdown}>
            <div style={styles.dropHeader}>
              <div style={styles.dropAvatar}>
                {avatar
                  ? <img src={avatar} alt="You" style={styles.avatarImg} />
                  : <span style={styles.avatarInitials}>{initialsFrom(profile?.full_name, user.email)}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                {profile?.full_name && <div style={styles.dropName}>{profile.full_name}</div>}
                <div style={styles.dropEmail}>{user.email}</div>
              </div>
            </div>
            {verified && <div style={styles.verified}>✅ Verified student</div>}
            <button style={styles.dropItem} onClick={() => fileRef.current?.click()}>
              {avatar ? 'Change photo' : 'Add photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            <button style={{ ...styles.dropItem, color: '#C0455A' }} onClick={handleLogout}>Sign out</button>
          </div>
        )}
      </div>
    )
  }

  // ── Logged out: Sign in button + modal ──
  const submit = mode === 'signup' ? handleSignUp : handleLogin
  return (
    <>
      <button style={styles.signInBtn} onClick={() => { setShowModal(true); setMessage('') }}>Sign in</button>
      {showModal && (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={styles.modal}>
            <h2 style={styles.title}>Welcome to FlatMatch</h2>
            <p style={styles.subtitle}>Sign in with your university email to connect with verified students.</p>
            <div style={styles.tabs}>
              <button style={mode === 'signup' ? styles.tabActive : styles.tab} onClick={() => { setMode('signup'); setMessage('') }}>Sign up</button>
              <button style={mode === 'login' ? styles.tabActive : styles.tab} onClick={() => { setMode('login'); setMessage('') }}>Log in</button>
            </div>
            {mode === 'signup' && (
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
            )}
            <input type="email" placeholder="you@uclive.ac.nz" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <button style={styles.primaryBtn} onClick={submit} disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
            {message && <p style={styles.message}>{message}</p>}
            <button style={styles.browseBtn} onClick={() => setShowModal(false)}>Maybe later</button>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  signInBtn: {
    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: '#fff',
    background: C.purple, border: 'none', cursor: 'pointer',
    padding: '8px 18px', borderRadius: 8,
  },
  avatarBtn: {
    width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: C.purple, color: '#fff', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 0, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarInitials: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: '#fff' },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 260,
    background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14,
    boxShadow: '0 8px 24px rgba(30,43,46,0.15)', padding: 10, zIndex: 300,
  },
  dropHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px 12px' },
  dropAvatar: {
    width: 42, height: 42, borderRadius: '50%', background: C.purple, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  dropName: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dropEmail: { fontFamily: FONT_BODY, fontSize: 12, color: C.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  verified: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.teal, padding: '6px 8px 10px' },
  dropItem: {
    display: 'block', width: '100%', textAlign: 'left', fontFamily: FONT_BODY,
    fontSize: 13, fontWeight: 600, color: C.ink, background: 'transparent',
    border: 'none', borderRadius: 8, padding: '10px 8px', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(30,43,46,0.45)', backdropFilter: 'blur(3px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 400,
    boxShadow: '0 20px 60px rgba(30,43,46,0.25)', fontFamily: FONT_BODY, textAlign: 'center',
  },
  title: { fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 1.6, color: C.inkSoft, marginBottom: 24 },
  tabs: { display: 'flex', gap: 8, background: C.paper, borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: C.inkSoft, background: 'transparent', border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer' },
  tabActive: { flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: '#fff', background: C.purple, border: 'none', borderRadius: 8, padding: '10px 0', cursor: 'pointer' },
  input: { fontFamily: FONT_BODY, fontSize: 15, width: '100%', padding: '13px 16px', border: `1.5px solid ${C.border}`, borderRadius: 12, marginBottom: 12, boxSizing: 'border-box', color: C.ink, background: '#fff' },
  primaryBtn: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, width: '100%', padding: '14px 0', background: C.purple, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', marginTop: 4 },
  browseBtn: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.inkSoft, background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 16, textDecoration: 'underline' },
  message: { fontSize: 13, color: C.ink, background: C.paper, borderRadius: 8, padding: '10px 14px', marginTop: 14, lineHeight: 1.5 },
}