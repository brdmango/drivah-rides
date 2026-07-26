import { useState } from 'react'
import { supabase } from '../supabase.js'
import { C } from '../theme.js'
import { calcCostShare, fmt$ } from '../utils.js'
import { Input, Btn, Toast } from './UI.jsx'

export function PostTripModal({ profile, onClose, onPosted }) {
  const [origin,      setOrigin]      = useState('')
  const [destination, setDestination] = useState('')
  const [date,        setDate]        = useState('')
  const [time,        setTime]        = useState('')
  const [seats,       setSeats]       = useState('3')
  const [miles,       setMiles]       = useState('')
  const [note,        setNote]        = useState('')
  const [recurring,   setRecurring]   = useState(false)
  const [detour,      setDetour]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [toast,       setToast]       = useState(null)
  const [errors,      setErrors]      = useState({})

  const notify = (msg, c = C.red) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const costShare = miles && seats ? calcCostShare(parseFloat(miles), parseInt(seats)) : null

  const validate = () => {
    const e = {}
    if (!origin.trim())                          e.origin = 'Required'
    if (!destination.trim())                     e.dest   = 'Required'
    if (!date)                                   e.date   = 'Required'
    if (!time)                                   e.time   = 'Required'
    if (!miles || isNaN(miles) || parseFloat(miles) <= 0) e.miles = 'Enter distance'
    if (!seats || parseInt(seats) < 1 || parseInt(seats) > 6) e.seats = '1–6 seats'
    setErrors(e); return !Object.keys(e).length
  }

  const handlePost = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const departAt = new Date(`${date}T${time}`).toISOString()
      const { error } = await supabase.from('trips').insert({
        driver_id:      profile.id,
        driver_name:    profile.full_name,
        driver_rating:  profile.rating || 5.0,
        driver_rides:   profile.total_rides || 0,
        origin:         origin.trim(),
        destination:    destination.trim(),
        depart_at:      departAt,
        seats_total:    parseInt(seats),
        seats_taken:    0,
        distance_miles: parseFloat(miles),
        cost_per_seat:  parseFloat(costShare),
        is_recurring:   recurring,
        detour_ok:      detour,
        note:           note.trim() || null,
        status:         'active',
      })
      if (error) throw error
      notify('Trip posted! 🚗', C.green)
      setTimeout(() => { onPosted(); onClose() }, 800)
    } catch (err) {
      notify(err.message || 'Failed to post trip')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000A', display: 'flex', alignItems: 'flex-end' }}>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div className="slide" style={{ background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px 20px 36px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: C.white }}>Post a Trip</div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: C.sub, fontSize: 22, padding: '4px 8px', borderRadius: 8, background: C.card }}>×</div>
        </div>

        {/* Route */}
        <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>ROUTE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
            <input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Leaving from… dorm, building, address" style={{ flex: 1, background: 'none', border: 'none', color: C.white, fontSize: 14, fontWeight: 500 }} />
          </div>
          {errors.origin && <div style={{ fontSize: 11, color: C.red, marginBottom: 8 }}>↑ {errors.origin}</div>}
          <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: C.amber, flexShrink: 0 }} />
            <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Going to… address, city, landmark" style={{ flex: 1, background: 'none', border: 'none', color: C.white, fontSize: 14, fontWeight: 500 }} />
          </div>
          {errors.dest && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>↑ {errors.dest}</div>}
        </div>

        {/* Date & Time */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><Input label="DATE" type="date" value={date} onChange={setDate} error={errors.date} /></div>
          <div style={{ flex: 1 }}><Input label="TIME" type="time" value={time} onChange={setTime} error={errors.time} /></div>
        </div>

        {/* Seats & Distance */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><Input label="SEATS AVAILABLE" type="number" value={seats} onChange={setSeats} placeholder="1–6" error={errors.seats} hint="max 6" icon="💺" /></div>
          <div style={{ flex: 1 }}><Input label="DISTANCE (mi)"   type="number" value={miles} onChange={setMiles} placeholder="e.g. 8.5" error={errors.miles} icon="📏" /></div>
        </div>

        {/* Cost preview */}
        {costShare && (
          <div style={{ background: `${C.amber}10`, border: `1px solid ${C.amber}33`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 600 }}>Suggested cost share</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Gas cost ÷ {seats} riders (IRS rate)</div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, color: C.amber, fontWeight: 500 }}>{fmt$(costShare)}</div>
          </div>
        )}

        {/* Note */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>NOTE (optional)</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Details for riders… meet at parking lot, no food please, etc." rows={2}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, background: C.card2, border: `1.5px solid ${C.border}`, color: C.white, fontSize: 13, resize: 'none', fontFamily: "'DM Sans', sans-serif" }} />
        </div>

        {/* Toggles */}
        {[
          { key: recurring, set: setRecurring, icon: '🔁', label: 'Recurring weekly trip',      desc: 'Post once, riders can join every week'        },
          { key: detour,    set: setDetour,    icon: '↪',  label: 'Open to small detours',      desc: 'Willing to slightly adjust route for riders'  },
        ].map(({ key, set, icon, label, desc }) => (
          <div key={label} onClick={() => set(v => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: C.card, borderRadius: 12, marginBottom: 10, cursor: 'pointer', border: `1px solid ${key ? C.blue + '44' : C.border}`, transition: 'border .2s' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{label}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{desc}</div>
              </div>
            </div>
            <div style={{ width: 44, height: 24, borderRadius: 12, background: key ? C.blue : C.muted, position: 'relative', transition: 'background .25s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: key ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .25s' }} />
            </div>
          </div>
        ))}

        <div style={{ marginTop: 6 }}>
          <Btn onClick={handlePost} loading={loading} variant="amber">Post Trip 🚗</Btn>
        </div>
      </div>
    </div>
  )
}
