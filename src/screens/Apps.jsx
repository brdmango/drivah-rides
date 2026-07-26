import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase.js'
import { C, CSS } from '../theme.js'
import { fmt$, fmtDate, fmtTime } from '../utils.js'
import { Logo, UFBadge, Tag, Btn, Toast, TabBar, TripCard } from '../components/UI.jsx'
import { PostTripModal } from '../components/PostTripModal.jsx'

/* ════════════════════════════════════════
   RIDER APP
════════════════════════════════════════ */
export function RiderApp({ profile, onLogout }) {
  const [tab,     setTab]     = useState('browse')
  const [trips,   setTrips]   = useState([])
  const [myRides, setMyRides] = useState([])
  const [wallet,  setWallet]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState(null)
  const [search,  setSearch]  = useState('')

  const notify = (msg, c = C.blue) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: tripsData }, { data: bookingsData }, { data: walletData }] = await Promise.all([
      supabase.from('trips').select('*').eq('status', 'active').gte('depart_at', new Date().toISOString()).order('depart_at').limit(30),
      supabase.from('bookings').select('*, trips(*)').eq('rider_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('wallet').select('*').eq('user_id', profile.id).single(),
    ])
    if (tripsData)   setTrips(tripsData)
    if (bookingsData) setMyRides(bookingsData)
    if (walletData)  setWallet(walletData)
    setLoading(false)
  }, [profile.id])

  useEffect(() => { loadData() }, [loadData])

  // Realtime notifications
  useEffect(() => {
    const channel = supabase.channel(`notifs:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        payload => notify(payload.new.title))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile.id])

  const joinTrip = async (trip) => {
    try {
      const { error } = await supabase.from('bookings').insert({ trip_id: trip.id, rider_id: profile.id, amount_paid: trip.cost_per_seat, status: 'confirmed' })
      if (error) throw error
      await supabase.from('trips').update({ seats_taken: (trip.seats_taken || 0) + 1 }).eq('id', trip.id)
      notify(`Joined! Meet ${trip.driver_name.split(' ')[0]} at ${fmtTime(trip.depart_at)} 🎉`, C.green)
      loadData()
    } catch (err) { notify(err.message || "Couldn't join trip", C.red) }
  }

  const joinedIds = new Set(myRides.map(b => b.trip_id))
  const filtered  = trips.filter(t => !search || t.origin.toLowerCase().includes(search.toLowerCase()) || t.destination.toLowerCase().includes(search.toLowerCase()))
  const tabs = [{ id: 'browse', icon: '🔍', lbl: 'Browse' }, { id: 'rides', icon: '🗓', lbl: 'My Rides' }, { id: 'wallet', icon: '💳', lbl: 'Wallet' }, { id: 'profile', icon: '👤', lbl: 'Profile' }]

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.white, display: 'flex', flexDirection: 'column' }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.uf}, ${C.blue}, ${C.blueL})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <UFBadge />
          <button onClick={onLogout} style={{ background: `${C.red}12`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: '5px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>

        {/* BROWSE */}
        {tab === 'browse' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
              Hey {profile.full_name.split(' ')[0]} 🐊
            </div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Find a carpool heading your way</div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.dim }}>🔍</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by location…" style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: 12, background: C.card, border: `1.5px solid ${C.border}`, color: C.white, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
              {search && <div onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.dim, cursor: 'pointer' }}>×</div>}
            </div>

            {loading
              ? <div style={{ textAlign: 'center', padding: 40, color: C.sub }}><span className="spin" style={{ fontSize: 24 }}>⟳</span></div>
              : filtered.length === 0
                ? <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🗺</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: C.white }}>No trips found</div>
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>{search ? 'Try a different search' : 'Check back soon — drivers post daily'}</div>
                  </div>
                : filtered.map(t => <TripCard key={t.id} trip={t} onJoin={joinTrip} joined={joinedIds.has(t.id)} />)
            }
          </div>
        )}

        {/* MY RIDES */}
        {tab === 'rides' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4 }}>My Rides</div>
            <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Trips you've joined</div>
            {myRides.length === 0
              ? <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18 }}>No rides yet</div>
                  <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>Browse and join a carpool!</div>
                </div>
              : myRides.map(b => b.trips && <TripCard key={b.id} trip={b.trips} joined={true} />)
            }
          </div>
        )}

        {/* WALLET */}
        {tab === 'wallet' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 16 }}>Wallet</div>
            <div style={{ background: `linear-gradient(135deg, ${C.uf}CC, ${C.blue}88)`, borderRadius: 20, padding: '24px 20px', marginBottom: 14, textAlign: 'center', border: `1px solid ${C.blue}33`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `${C.blueL}12` }} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>DRIVAH CREDITS</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 44, fontWeight: 500, color: C.white }}>{fmt$(wallet?.balance)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['Total Saved', fmt$(wallet?.total_saved), C.green], ['Rides', myRides.length, C.blue]].map(([l, v, c]) => (
                <div key={l} style={{ flex: 1, background: C.card, borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", color: c, fontWeight: 500, fontSize: 22 }}>{v}</div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 4, fontWeight: 600 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '12px 14px', background: `${C.green}0A`, border: `1px solid ${C.green}22`, borderRadius: 12, fontSize: 12, color: C.green, lineHeight: 1.6 }}>
              💡 Carpooling with DRIVAH costs up to <strong>70% less</strong> than Uber or Lyft for the same trip.
            </div>
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="up">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}44, ${C.blueL}22)`, border: `2px solid ${C.blue}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 800, color: C.blueL, fontSize: 28, margin: '0 auto 12px' }}>{profile.full_name[0]}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>{profile.full_name}</div>
              <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>{profile.email}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                <UFBadge /><Tag label="RIDER" color={C.blue} />
              </div>
            </div>
            <Btn onClick={onLogout} variant="red">Sign Out</Btn>
          </div>
        )}
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} accentColor={C.blue} />
    </div>
  )
}

/* ════════════════════════════════════════
   DRIVER APP
════════════════════════════════════════ */
export function DriverApp({ profile, onLogout }) {
  const [tab,      setTab]      = useState('trips')
  const [myTrips,  setMyTrips]  = useState([])
  const [showPost, setShowPost] = useState(false)
  const [earnings, setEarnings] = useState({ today: '0.00', week: '0.00', month: '0.00', total: '0.00' })
  const [toast,    setToast]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  const notify = (msg, c = C.amber) => { setToast({ msg, c }); setTimeout(() => setToast(null), 3000) }

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: tripsData } = await supabase.from('trips').select('*, bookings(count)').eq('driver_id', profile.id).order('depart_at', { ascending: false }).limit(20)
    if (tripsData) setMyTrips(tripsData)

    const { data: bookData } = await supabase.from('bookings').select('amount_paid, created_at').eq('driver_id', profile.id).eq('status', 'confirmed')
    if (bookData) {
      const now = new Date()
      const sum = arr => arr.reduce((s, b) => s + (b.amount_paid || 0), 0).toFixed(2)
      setEarnings({
        today: sum(bookData.filter(b => new Date(b.created_at).toDateString() === now.toDateString())),
        week:  sum(bookData.filter(b => new Date(b.created_at) > new Date(now - 7  * 86400000))),
        month: sum(bookData.filter(b => new Date(b.created_at) > new Date(now - 30 * 86400000))),
        total: sum(bookData),
      })
    }
    setLoading(false)
  }, [profile.id])

  useEffect(() => { loadData() }, [loadData])

  const cancelTrip = async (tripId) => {
    await supabase.from('trips').update({ status: 'cancelled' }).eq('id', tripId)
    notify('Trip cancelled', C.red)
    loadData()
  }

  const tabs = [{ id: 'trips', icon: '🗺', lbl: 'My Trips' }, { id: 'earnings', icon: '💰', lbl: 'Earnings' }, { id: 'profile', icon: '👤', lbl: 'Profile' }]

  return (
    <div style={{ height: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.white, display: 'flex', flexDirection: 'column' }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      {showPost && <PostTripModal profile={profile} onClose={() => setShowPost(false)} onPosted={loadData} />}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.uf}, ${C.amber})`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag label="DRIVER" color={C.amber} />
          <button onClick={onLogout} style={{ background: `${C.red}12`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: '5px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>

        {/* MY TRIPS */}
        {tab === 'trips' && (
          <div className="up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22 }}>My Trips</div>
                <div style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>{myTrips.filter(t => t.status === 'active').length} active</div>
              </div>
              <Btn onClick={() => setShowPost(true)} variant="amber" full={false} small>+ Post Trip</Btn>
            </div>

            {loading
              ? <div style={{ textAlign: 'center', padding: 40 }}><span className="spin" style={{ fontSize: 24, color: C.amber }}>⟳</span></div>
              : myTrips.length === 0
                ? <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18 }}>No trips posted yet</div>
                    <div style={{ fontSize: 13, color: C.sub, marginTop: 6, marginBottom: 20 }}>Post your first trip and start splitting gas!</div>
                    <Btn onClick={() => setShowPost(true)} variant="amber">Post Your First Trip</Btn>
                  </div>
                : myTrips.map(t => (
                    <div key={t.id}>
                      <TripCard trip={{ ...t, seats_taken: t.bookings?.[0]?.count || 0 }} isDriver={true} />
                      {t.status === 'active' && new Date(t.depart_at) > new Date() && (
                        <div style={{ marginTop: -6, marginBottom: 10 }}>
                          <Btn onClick={() => cancelTrip(t.id)} variant="red" small>Cancel Trip</Btn>
                        </div>
                      )}
                    </div>
                  ))
            }
          </div>
        )}

        {/* EARNINGS */}
        {tab === 'earnings' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 16 }}>Earnings</div>
            <div style={{ background: 'linear-gradient(135deg, #1A1200, #2A1E00)', borderRadius: 20, padding: '24px 20px', marginBottom: 14, textAlign: 'center', border: `1px solid ${C.amber}22` }}>
              <div style={{ fontSize: 11, color: `${C.amber}88`, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>TOTAL EARNED</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 44, fontWeight: 500, color: C.amber }}>{fmt$(earnings.total)}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>Gas cost contributions from riders</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[['Today', earnings.today], ['Week', earnings.week], ['Month', earnings.month]].map(([l, v]) => (
                <div key={l} style={{ background: C.card, borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", color: C.amber, fontWeight: 500, fontSize: 16 }}>{fmt$(v)}</div>
                  <div style={{ color: C.sub, fontSize: 10, marginTop: 3, fontWeight: 600 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '12px 14px', background: `${C.amber}08`, border: `1px solid ${C.amber}20`, borderRadius: 12, fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
              💡 <strong style={{ color: C.white }}>How it works:</strong> Riders contribute their share of gas costs. You cover the rest. Everyone saves compared to Uber.
            </div>
          </div>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="up">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${C.amber}44, ${C.amberL}22)`, border: `2px solid ${C.amber}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 800, color: C.amber, fontSize: 28, margin: '0 auto 12px' }}>{profile.full_name[0]}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>{profile.full_name}</div>
              <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>{profile.email}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                <UFBadge /><Tag label="DRIVER" color={C.amber} /><Tag label={`⭐ ${profile.rating || '5.0'}`} color={C.yellow} />
              </div>
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10 }}>VEHICLE</div>
              {[
                ['🚗', 'Car',   `${profile.car_year || ''} ${profile.car_make || ''} ${profile.car_model || ''}`.trim() || 'Not set'],
                ['🪪', 'Plate', profile.plate_number || 'Not set'],
              ].map(([icon, l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.dim, fontWeight: 700 }}>{l.toUpperCase()}</div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn onClick={onLogout} variant="red">Sign Out</Btn>
          </div>
        )}
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} accentColor={C.amber} />
    </div>
  )
}

/* ════════════════════════════════════════
   ADMIN PLATFORM
════════════════════════════════════════ */
export function AdminPlatform({ onLogout }) {
  const [tab,         setTab]         = useState('overview')
  const [stats,       setStats]       = useState({ riders: 0, drivers: 0, trips: 0, bookings: 0 })
  const [recentTrips, setRecentTrips] = useState([])
  const [toast,       setToast]       = useState(null)

  useEffect(() => {
    const load = async () => {
      const [r, d, t, b, rt] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'rider'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'driver'),
        supabase.from('trips').select('id',    { count: 'exact' }),
        supabase.from('bookings').select('id', { count: 'exact' }),
        supabase.from('trips').select('*, bookings(count)').order('created_at', { ascending: false }).limit(10),
      ])
      setStats({ riders: r.count || 0, drivers: d.count || 0, trips: t.count || 0, bookings: b.count || 0 })
      if (rt.data) setRecentTrips(rt.data)
    }
    load()
  }, [])

  const tabs = [{ id: 'overview', icon: '📊', lbl: 'Overview' }, { id: 'trips', icon: '🚗', lbl: 'Trips' }, { id: 'settings', icon: '⚙️', lbl: 'Settings' }]

  return (
    <div style={{ height: '100vh', background: '#060810', fontFamily: "'DM Sans', sans-serif", color: C.white, display: 'flex', flexDirection: 'column' }}>
      <style>{CSS}</style>
      {toast && <Toast msg={toast.msg} color={toast.c} />}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #2A1F8C, #6B5FFF, #9B8FFF)', flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '10px 16px', background: '#08091A', borderBottom: '1px solid #1A1F40', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #2A1F8C, #6B5FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛡️</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #9B8FFF, #6B5FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DRIVAH ADMIN</div>
            <div style={{ fontSize: 9, color: '#3A3A7A', letterSpacing: 2, fontWeight: 700 }}>CARPOOL PLATFORM OPS</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} className="pulse" />
          <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>LIVE</span>
          <button onClick={onLogout} style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: '4px 10px', color: C.red, fontSize: 11, fontWeight: 700 }}>Logout</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 80px' }}>

        {tab === 'overview' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, background: 'linear-gradient(135deg, #9B8FFF, #6B5FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 14 }}>Platform Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Riders', stats.riders, '👥', C.blue], ['Drivers', stats.drivers, '🚗', C.amber], ['Total Trips', stats.trips, '🗺', '#9B8FFF'], ['Bookings', stats.bookings, '✅', C.green]].map(([l, v, icon, c]) => (
                <div key={l} style={{ background: '#0A0D1E', borderRadius: 14, padding: 14, border: '1px solid #1A1F40' }}>
                  <div style={{ fontSize: 9, color: '#4A4A8A', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{l.toUpperCase()}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", color: c, fontSize: 28, fontWeight: 500 }}>{v}</div>
                    <span style={{ fontSize: 22 }}>{icon}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'trips' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 14, background: 'linear-gradient(135deg, #9B8FFF, #6B5FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Recent Trips</div>
            {recentTrips.map(t => <TripCard key={t.id} trip={t} isDriver={true} small={true} />)}
          </div>
        )}

        {tab === 'settings' && (
          <div className="up">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 14, background: 'linear-gradient(135deg, #9B8FFF, #6B5FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Settings</div>
            <div style={{ background: '#0A0D1E', borderRadius: 14, border: '1px solid #1A1F40', overflow: 'hidden' }}>
              {['University verification rules', 'Cost share formula settings', 'Notification preferences', 'Data export tools'].map((s, i, arr) => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid #1A1F40' : 'none', cursor: 'pointer' }}>
                  <span style={{ color: C.white, fontSize: 14 }}>{s}</span>
                  <span style={{ color: '#4A4A8A' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#08091A', borderTop: '1px solid #1A1F40', display: 'flex', padding: '9px 0 16px', zIndex: 50 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ fontSize: 20, filter: tab === t.id ? 'none' : 'grayscale(.8) opacity(.4)' }}>{t.icon}</div>
            <div style={{ fontSize: 9, color: tab === t.id ? '#9B8FFF' : '#2A2A5A', fontWeight: tab === t.id ? 700 : 400 }}>{t.lbl}</div>
            {tab === t.id && <div style={{ width: 20, height: 3, borderRadius: 2, background: '#6B5FFF', marginTop: 1 }} />}
          </button>
        ))}
      </div>
    </div>
  )
}
