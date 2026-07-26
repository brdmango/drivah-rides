import { useState } from 'react'
import { supabase } from '../supabase.js'
import { C, CSS } from '../theme.js'
import { isUFEmail, isValidUID, hashUFID } from '../utils.js'
import { Logo, Input, Btn, Toast } from '../components/UI.jsx'

/* ─── Rider Signup ─── */
export function RiderSignup({ onBack }) {
  const [step,    setStep]    = useState(1)
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [ufid,    setUfid]    = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const [done,    setDone]    = useState(false)

  const notify = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const v1 = () => {
    const e = {}
    if (!name.trim())          e.name  = 'Full name required'
    if (!isUFEmail(email))     e.email = 'Must be @ufl.edu'
    if (!isValidUID(ufid))     e.ufid  = 'Must be exactly 8 digits'
    setErrors(e); return !Object.keys(e).length
  }

  const handleCreate = async () => {
    const e = {}
    if (!pass || pass.length < 6) e.pass    = 'Min 6 characters'
    if (pass !== confirm)         e.confirm = "Passwords don't match"
    setErrors(e); if (Object.keys(e).length) return
    setLoading(true)
    try {
      const ufidHash = await hashUFID(ufid)
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(), password: pass,
        options: { data: { full_name: name, role: 'rider', ufid_hash: ufidHash } },
      })
      if (error) throw error
      if (data.user) await supabase.from('wallet').insert({ user_id: data.user.id })
      setDone(true)
    } catch (err) { notify(err.message || 'Signup failed') }
    setLoading(false)
  }

  if (done) return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div className="up" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🐊</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: C.green, marginBottom: 10 }}>You're in!</div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 20 }}>
          Check <strong style={{ color: C.white }}>{email}</strong> to verify your account, then come back to sign in.
        </div>
        <Btn onClick={onBack}>Go to Sign In →</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.uf}, ${C.blue})`, flexShrink: 0 }} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="up" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div onClick={() => step === 1 ? onBack() : setStep(1)} style={{ color: C.sub, cursor: 'pointer', fontSize: 20, marginRight: 14, padding: '4px 8px', borderRadius: 8, background: C.card }}>←</div>
            <Logo size="sm" />
          </div>
          {/* Step bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {[1, 2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? C.blue : C.border, transition: 'background .3s' }} />)}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: C.white, marginBottom: 4 }}>{step === 1 ? 'Create Account' : 'Set Password'}</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Step {step} of 2 — {step === 1 ? 'Your UF details' : 'Secure your account'}</div>

          {step === 1 && (
            <div className="in">
              <Input label="FULL NAME"    value={name}  onChange={setName}  placeholder="Your full name"      error={errors.name}  icon="👤" />
              <Input label="UFL EMAIL"    type="email" value={email} onChange={setEmail} placeholder="yourname@ufl.edu" error={errors.email} hint="@ufl.edu only" icon="✉" />
              <Input label="UFID NUMBER"  type="tel"   value={ufid}  onChange={v => setUfid(v.replace(/\D/, '').slice(0, 8))} placeholder="8-digit UFID" error={errors.ufid} hint="8 digits" icon="#" />
              <Btn onClick={() => { if (v1()) { setErrors({}); setStep(2) } }}>Continue →</Btn>
            </div>
          )}
          {step === 2 && (
            <div className="in">
              <Input label="CREATE PASSWORD"  type="password" value={pass}    onChange={setPass}    placeholder="Min 6 characters" error={errors.pass}    icon="🔒" />
              <Input label="CONFIRM PASSWORD" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password"  error={errors.confirm} icon="🔒" />
              <Btn onClick={handleCreate} loading={loading}>Create Account</Btn>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: C.sub }}>Already have an account? </span>
            <span onClick={onBack} style={{ fontSize: 13, color: C.blue, cursor: 'pointer', fontWeight: 700 }}>Sign In</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Driver Signup ─── */
export function DriverSignup({ onBack }) {
  const [step,    setStep]    = useState(1)
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [ufid,    setUfid]    = useState('')
  const [car,     setCar]     = useState('')
  const [year,    setYear]    = useState('')
  const [plate,   setPlate]   = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [agreed,  setAgreed]  = useState(false)
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const [done,    setDone]    = useState(false)

  const notify = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const v1 = () => {
    const e = {}
    if (!name.trim())              e.name    = 'Required'
    if (!isUFEmail(email))         e.email   = 'Must be @ufl.edu'
    if (!isValidUID(ufid))         e.ufid    = 'Must be 8 digits'
    if (!pass || pass.length < 6)  e.pass    = 'Min 6 characters'
    if (pass !== confirm)          e.confirm = "Passwords don't match"
    setErrors(e); return !Object.keys(e).length
  }

  const v2 = () => {
    const e = {}
    if (!car.trim())                              e.car  = 'Required'
    if (!year || year.length !== 4 || parseInt(year) < 2010) e.year = '2010 or newer'
    if (!plate.trim())                            e.plate = 'Required'
    setErrors(e); return !Object.keys(e).length
  }

  const handleSubmit = async () => {
    if (!agreed) { notify('Please agree to the terms'); return }
    setLoading(true)
    try {
      const ufidHash = await hashUFID(ufid)
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(), password: pass,
        options: { data: { full_name: name, role: 'driver', ufid_hash: ufidHash } },
      })
      if (error) throw error
      if (data.user) {
        await supabase.from('driver_profiles').insert({
          id: data.user.id,
          car_make: car.split(' ')[0], car_model: car.split(' ').slice(1).join(' ') || car,
          car_year: parseInt(year), plate_number: plate,
          status: 'approved', rating: 5.0, total_rides: 0,
        })
        await supabase.from('wallet').insert({ user_id: data.user.id })
      }
      setDone(true)
    } catch (err) { notify(err.message || 'Registration failed') }
    setLoading(false)
  }

  if (done) return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{CSS}</style>
      <div className="up" style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 14 }}>🚗</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: C.amber, marginBottom: 10 }}>Ready to Roll!</div>
        <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 20 }}>Check your email to verify, then sign in and post your first trip!</div>
        <Btn onClick={onBack} variant="amber">Go to Sign In →</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.uf}, ${C.amber})`, flexShrink: 0 }} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="up" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div onClick={() => step === 1 ? onBack() : setStep(step - 1)} style={{ color: C.sub, cursor: 'pointer', fontSize: 20, marginRight: 14, padding: '4px 8px', borderRadius: 8, background: C.card }}>←</div>
            <Logo size="sm" />
            <div style={{ marginLeft: 'auto', background: `${C.amber}20`, border: `1px solid ${C.amber}44`, borderRadius: 20, padding: '3px 12px', fontSize: 10, color: C.amber, fontWeight: 700 }}>DRIVER</div>
          </div>
          {/* Step bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[1, 2, 3].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? C.amber : C.border, transition: 'background .3s' }} />)}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: C.white, marginBottom: 4 }}>
            {step === 1 ? 'Driver Registration' : step === 2 ? 'Your Vehicle' : 'Terms & Confirm'}
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Step {step} of 3</div>

          {step === 1 && (
            <div className="in">
              <Input label="FULL NAME"        value={name}    onChange={setName}    placeholder="Your full name"      error={errors.name}    icon="👤" />
              <Input label="UFL EMAIL"        type="email"   value={email}   onChange={setEmail}   placeholder="yourname@ufl.edu"   error={errors.email}   hint="@ufl.edu" icon="✉" />
              <Input label="UFID NUMBER"      type="tel"     value={ufid}    onChange={v => setUfid(v.replace(/\D/, '').slice(0, 8))} placeholder="8-digit UFID" error={errors.ufid} hint="8 digits" icon="#" />
              <Input label="PASSWORD"         type="password" value={pass}   onChange={setPass}    placeholder="Min 6 characters"   error={errors.pass}    icon="🔒" />
              <Input label="CONFIRM PASSWORD" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password"   error={errors.confirm} icon="🔒" />
              <Btn onClick={() => { if (v1()) { setErrors({}); setStep(2) } }} variant="amber">Continue →</Btn>
            </div>
          )}

          {step === 2 && (
            <div className="in">
              <div style={{ padding: '12px 14px', background: `${C.amber}10`, border: `1px solid ${C.amber}25`, borderRadius: 10, marginBottom: 14, fontSize: 12, color: C.amber, lineHeight: 1.6 }}>
                🚗 Vehicle must be <strong>2010 or newer</strong>. Shown to riders when they join your trips.
              </div>
              <Input label="MAKE & MODEL"   value={car}   onChange={setCar}   placeholder="e.g. Toyota Camry" error={errors.car}   icon="🚗" />
              <Input label="YEAR"           type="tel"   value={year}  onChange={v => setYear(v.replace(/\D/, '').slice(0, 4))} placeholder="e.g. 2021" error={errors.year} hint="2010+" icon="📅" />
              <Input label="LICENSE PLATE"  value={plate} onChange={setPlate} placeholder="e.g. ABC-1234"     error={errors.plate} icon="🪪" />
              <Btn onClick={() => { if (v2()) { setErrors({}); setStep(3) } }} variant="amber">Continue →</Btn>
            </div>
          )}

          {step === 3 && (
            <div className="in">
              <div style={{ background: C.card2, borderRadius: 14, padding: 16, marginBottom: 16, fontSize: 13, color: C.sub, lineHeight: 1.8 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: C.white, fontSize: 15, marginBottom: 10 }}>By registering as a driver you agree to:</div>
                {[
                  'Carry valid personal auto insurance at all times',
                  "Only post trips you're genuinely planning to take",
                  'Cost-sharing is for gas expenses only — not commercial driving',
                  'Maintain a safe, clean vehicle for riders',
                  'Treat all riders with respect',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: C.green, flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div onClick={() => setAgreed(a => !a)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18, cursor: 'pointer' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${agreed ? C.green : C.dim}`, background: agreed ? C.green : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                  {agreed && <span style={{ fontSize: 13, color: C.bg, fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ fontSize: 13, color: C.white, lineHeight: 1.5 }}>I agree to the terms above and confirm all information is accurate.</div>
              </div>
              <Btn onClick={handleSubmit} loading={loading} variant="amber">Complete Registration</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
