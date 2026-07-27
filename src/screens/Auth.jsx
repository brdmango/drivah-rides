import { useState } from 'react'
import { supabase } from '../supabase.js'
import { C } from '../theme.js'
import { isUFEmail } from '../utils.js'
import { Logo, UFBadge, Tag, Input, Btn, Toast, Divider } from '../components/UI.jsx'

/* ─── Role Selector ─── */
export function RoleSelector({ onSelect }) {
  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}08, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.amber}06, transparent 70%)`, pointerEvents: 'none' }} />

      <div className="up" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo size="lg" /></div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>
            The verified campus carpool network.<br />
            <span style={{ color: C.blueL, fontWeight: 600 }}>Split gas. Build community. Skip Uber.</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {[
            { role: 'rider',  icon: '🎓', label: "I Need a Ride", desc: 'Browse trips posted by student drivers',    accent: C.blue  },
            { role: 'driver', icon: '🚗', label: "I'm Driving",   desc: 'Post your trip and split gas costs',        accent: C.amber },
            { role: 'admin',  icon: '🛡️', label: 'Admin',         desc: 'Platform operations',                       accent: '#6B5FFF' },
          ].map(({ role, icon, label, desc, accent }) => (
            <div key={role} onClick={() => onSelect(role)}
              style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accent + '66'; e.currentTarget.style.background = accent + '0A' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;      e.currentTarget.style.background = C.card }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: accent + '18', border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.white, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{desc}</div>
              </div>
              <div style={{ color: C.dim, fontSize: 16 }}>›</div>
            </div>
          ))}
        </div>

        <div style={{ background: `${C.uf}10`, border: `1px solid ${C.uf}25`, borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#6B8FFF', lineHeight: 1.7, textAlign: 'center' }}>
          🐊 Exclusively for <strong style={{ color: C.white }}>University of Florida</strong> students.<br />
          A valid <strong style={{ color: C.white }}>@ufl.edu</strong> email is required to join.
        </div>
      </div>
    </div>
  )
}

/* ─── Login ─── */
export function LoginScreen({ role, onBack, onSuccess, onSignup, onForgot }) {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [shake,   setShake]   = useState(false)
  const [toast,   setToast]   = useState(null)

  const accent  = role === 'driver' ? C.amber : role === 'admin' ? '#6B5FFF' : C.blue
  const notify  = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const validate = () => {
    const e = {}
    if (!email) e.email = 'Email required'
    else if (role !== 'admin' && !isUFEmail(email)) e.email = 'Must be a @ufl.edu email'
    if (!pass) e.pass = 'Password required'
    setErrors(e); return !Object.keys(e).length
  }

  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password: pass })
      if (error) throw error
      // Vehicle details live on driver_profiles, so embed them here — the
      // driver profile tab reads them straight off this object.
      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('*, driver_profiles(*)').eq('id', data.user.id).single()
      if (pErr) throw pErr
      if (role !== 'admin' && profile.role !== role) throw new Error(`Account registered as ${profile.role}`)
      if (role === 'admin' && profile.role !== 'admin') throw new Error('Admin access required')
      notify(`Welcome back, ${profile.full_name.split(' ')[0]}! 🐊`, C.green)
      setTimeout(() => onSuccess(profile), 700)
    } catch (err) {
      setShake(true); setTimeout(() => setShake(false), 400)
      notify(err.message || 'Incorrect email or password')
    }
    setLoading(false)
  }

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.uf}, ${accent})`, flexShrink: 0 }} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 24px' }}>
        <div className="up" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
            <div onClick={onBack} style={{ color: C.sub, cursor: 'pointer', fontSize: 20, marginRight: 14, padding: '4px 8px', borderRadius: 8, background: C.card }}>←</div>
            <Logo size="sm" />
            <div style={{ marginLeft: 'auto' }}><UFBadge /></div>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: C.white, marginBottom: 4, letterSpacing: -0.5 }}>
            {role === 'admin' ? 'Admin Login' : role === 'driver' ? 'Driver Sign In' : 'Rider Sign In'}
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>
            {role === 'admin' ? 'Restricted access' : `@ufl.edu required · ${role === 'driver' ? 'post trips & earn' : 'browse & join carpools'}`}
          </div>
          <div className={shake ? 'shake' : ''}>
            <Input label="UFL EMAIL" type="email" value={email} onChange={setEmail} placeholder={role === 'admin' ? 'admin@drivah.app' : 'yourname@ufl.edu'} error={errors.email} icon="✉" />
            <Input label="PASSWORD"  type="password" value={pass} onChange={setPass} placeholder="••••••••" error={errors.pass} icon="🔒" />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 18, marginTop: -6 }}>
            <span onClick={onForgot} style={{ fontSize: 13, color: accent, cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>
          </div>
          <Btn onClick={handleLogin} loading={loading}>Sign In →</Btn>
          {role !== 'admin' && onSignup && (
            <>
              <Divider label="or" />
              <Btn onClick={onSignup} variant="ghost">{role === 'driver' ? 'Register as a Driver' : 'Create Rider Account'}</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Forgot Password ─── */
export function ForgotScreen({ role, onBack }) {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const notify = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const handle = async () => {
    if (!email || (role !== 'admin' && !isUFEmail(email))) { notify('Enter a valid @ufl.edu email'); return }
    setLoading(true)
    try {
      // The app is served under /app, so the recovery link has to come back
      // there — /reset-password at the root is the marketing site.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err) { notify(err.message) }
    setLoading(false)
  }

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div className="up" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <div onClick={onBack} style={{ color: C.sub, cursor: 'pointer', fontSize: 20, marginRight: 14, padding: '4px 8px', borderRadius: 8, background: C.card }}>←</div>
          <Logo size="sm" />
        </div>
        {!sent ? (
          <>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: C.white, marginBottom: 6 }}>Reset Password</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>Enter your @ufl.edu email and we'll send a reset link.</div>
            <Input label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="yourname@ufl.edu" icon="✉" />
            <Btn onClick={handle} loading={loading}>Send Reset Link</Btn>
          </>
        ) : (
          <div className="in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📧</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: C.green, marginBottom: 10 }}>Check Your Email</div>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 24 }}>Reset link sent to <strong style={{ color: C.white }}>{email}</strong></div>
            <Btn onClick={onBack}>Back to Sign In →</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Set New Password (recovery link landing) ─── */
export function ResetPasswordScreen({ onDone }) {
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [toast,   setToast]   = useState(null)
  const notify = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const submit = async () => {
    const e = {}
    if (!pass || pass.length < 6) e.pass    = 'Min 6 characters'
    if (pass !== confirm)         e.confirm = "Passwords don't match"
    setErrors(e); if (Object.keys(e).length) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pass })
      if (error) throw error
      // Drop the recovery token so a refresh does not reopen this screen.
      window.history.replaceState({}, '', window.location.pathname)
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      notify(err.message || 'Could not update password')
    }
    setLoading(false)
  }

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div className="up" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}><Logo size="lg" /></div>
        {!done ? (
          <>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: C.white, marginBottom: 6 }}>Set a New Password</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 24 }}>Choose a new password for your DRIVAH account.</div>
            <Input label="NEW PASSWORD"     type="password" value={pass}    onChange={setPass}    placeholder="Min 6 characters" error={errors.pass}    icon="🔒" />
            <Input label="CONFIRM PASSWORD" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password"  error={errors.confirm} icon="🔒" />
            <Btn onClick={submit} loading={loading}>Update Password</Btn>
          </>
        ) : (
          <div className="in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: C.green, marginBottom: 10 }}>Password Updated</div>
            <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 24 }}>Sign in with your new password to continue.</div>
            <Btn onClick={onDone}>Go to Sign In →</Btn>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Admin PIN Gate ─── */
export function AdminPinGate({ onBack, onVerified }) {
  const [pin,     setPin]     = useState(['', '', '', ''])
  const [shake,   setShake]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const ADMIN_PIN = '2580'
  const notify = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const setDigit = (i, v) => {
    if (!/^\d?$/.test(v)) return
    const n = [...pin]; n[i] = v; setPin(n)
    if (v && i < 3) document.getElementById(`ap${i + 1}`)?.focus()
  }

  const verify = async () => {
    if (pin.join('').length < 4) { notify('Enter all 4 digits'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    if (pin.join('') === ADMIN_PIN) {
      notify('Access granted 🛡️', C.green)
      setTimeout(onVerified, 600)
    } else {
      setShake(true); setTimeout(() => setShake(false), 400)
      setPin(['', '', '', '']); notify('Incorrect PIN')
    }
    setLoading(false)
  }

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div className="up" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <div onClick={onBack} style={{ color: C.sub, cursor: 'pointer', fontSize: 20, marginRight: 14, padding: '4px 8px', borderRadius: 8, background: C.card }}>←</div>
          <Logo size="sm" />
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: C.white, marginBottom: 4 }}>Security PIN</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 32 }}>Enter your 4-digit admin PIN</div>
        <div className={shake ? 'shake' : ''} style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 28 }}>
          {pin.map((d, i) => (
            <input key={i} id={`ap${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => setDigit(i, e.target.value)}
              onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) { const n = [...pin]; n[i - 1] = ''; setPin(n); document.getElementById(`ap${i - 1}`)?.focus() } }}
              style={{ width: 62, height: 70, textAlign: 'center', fontSize: 30, fontFamily: "'DM Mono', monospace", fontWeight: 500, background: d ? '#1A1F5C' : C.card2, border: `2px solid ${d ? '#6B5FFF' : C.border}`, borderRadius: 14, color: C.white, transition: 'all .2s' }}
            />
          ))}
        </div>
        <Btn onClick={verify} loading={loading} variant="ghost">Unlock Admin →</Btn>
      </div>
    </div>
  )
}
