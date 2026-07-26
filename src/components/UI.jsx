import { C } from '../theme.js'

export const DemoBanner = () => (
  <div style={{
    position: 'fixed', bottom: 74, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9998, maxWidth: 'calc(100% - 24px)', whiteSpace: 'nowrap',
    background: '#1C1400EE', border: `1px solid ${C.amber}55`, borderRadius: 20,
    padding: '6px 14px', textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif", fontSize: 11,
    color: C.amberL, fontWeight: 600, pointerEvents: 'none',
    overflow: 'hidden', textOverflow: 'ellipsis',
  }}>
    ⚡ Demo mode — sample data · sign in with any @ufl.edu email
  </div>
)

export const Logo = ({ size = 'md' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 12 : 8 }}>
    <div style={{
      width:  size === 'lg' ? 48 : size === 'sm' ? 28 : 36,
      height: size === 'lg' ? 48 : size === 'sm' ? 28 : 36,
      borderRadius: size === 'lg' ? 14 : 10,
      background: `linear-gradient(135deg, ${C.blue}, ${C.blueL})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size === 'lg' ? 22 : size === 'sm' ? 13 : 17,
      flexShrink: 0,
    }}>🚗</div>
    <div>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 800,
        fontSize: size === 'lg' ? 28 : size === 'sm' ? 16 : 20,
        letterSpacing: -0.5,
        background: `linear-gradient(135deg, ${C.white}, ${C.blueL})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        lineHeight: 1,
      }}>DRIVAH</div>
      {size !== 'sm' && (
        <div style={{ fontSize: 9, color: C.sub, fontWeight: 600, letterSpacing: 2, marginTop: 1 }}>
          CARPOOL NETWORK
        </div>
      )}
    </div>
  </div>
)

export const UFBadge = () => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${C.uf}20`, border: `1px solid ${C.uf}44`, borderRadius: 20, padding: '3px 10px' }}>
    <span style={{ fontSize: 9 }}>🐊</span>
    <span style={{ fontSize: 9, color: '#6B8FFF', fontWeight: 700, letterSpacing: 1.5 }}>UF VERIFIED</span>
  </div>
)

export const Tag = ({ label, color }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 20, padding: '2px 9px', fontSize: 10, color, fontWeight: 700, letterSpacing: 0.5 }}>
    {label}
  </div>
)

export const Input = ({ label, type = 'text', value, onChange, placeholder, error, hint, disabled, icon }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, letterSpacing: 1.2 }}>{label}</div>
      {hint && <div style={{ fontSize: 10, color: C.dim, fontFamily: "'DM Mono', monospace" }}>{hint}</div>}
    </div>
    <div style={{ position: 'relative' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>
          {icon}
        </div>
      )}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: '100%', padding: '13px 16px',
          paddingLeft: icon ? 38 : 16,
          borderRadius: 12, background: C.card2,
          border: `1.5px solid ${error ? C.red : C.border}`,
          color: C.white, fontSize: 14, fontWeight: 500,
          transition: 'border .2s', opacity: disabled ? .5 : 1,
        }}
        onFocus={e => !disabled && (e.target.style.borderColor = C.blue)}
        onBlur={e  => e.target.style.borderColor = error ? C.red : C.border}
      />
    </div>
    {error && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 500 }}>↑ {error}</div>}
  </div>
)

export const Btn = ({ children, onClick, variant = 'primary', disabled, loading, small, full = true }) => {
  const styles = {
    primary: { background: `linear-gradient(135deg, ${C.blue}, ${C.blueL})`,   color: '#fff' },
    amber:   { background: `linear-gradient(135deg, ${C.amber}, ${C.amberL})`, color: '#0B0C0F' },
    ghost:   { background: 'none', color: C.sub, border: `1px solid ${C.border}` },
    red:     { background: `${C.red}18`, color: C.red, border: `1px solid ${C.red}33` },
    green:   { background: `linear-gradient(135deg, ${C.green}, #00F0A0)`,      color: '#0B0C0F' },
  }
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      width: full ? '100%' : 'auto', padding: small ? '9px 16px' : '14px 20px',
      borderRadius: 12, border: 'none', fontWeight: 700,
      fontSize: small ? 13 : 15, letterSpacing: 0.2,
      opacity: disabled || loading ? .5 : 1,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'opacity .2s, transform .1s',
      ...styles[variant],
    }}
      onMouseDown={e => !disabled && !loading && (e.currentTarget.style.transform = 'scale(.98)')}
      onMouseUp={e   => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {loading ? <span className="spin">⟳</span> : children}
    </button>
  )
}

export const Toast = ({ msg, color = C.blue }) => (
  <div className="pop" style={{
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9999, background: C.card2, border: `1px solid ${color}66`,
    borderRadius: 12, padding: '10px 18px', color: C.white,
    fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
    boxShadow: `0 8px 32px ${color}25`, pointerEvents: 'none',
    fontFamily: "'DM Sans', sans-serif",
  }}>{msg}</div>
)

export const Divider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
    <div style={{ flex: 1, height: 1, background: C.border }} />
    {label && <div style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>{label}</div>}
    <div style={{ flex: 1, height: 1, background: C.border }} />
  </div>
)

export const TabBar = ({ tabs, active, onChange, accentColor }) => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: C.surface, borderTop: `1px solid ${C.border}`,
    display: 'flex', padding: '9px 0 16px', zIndex: 50,
  }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex: 1, background: 'none', border: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        position: 'relative',
      }}>
        {t.badge > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: 'calc(50% - 18px)',
            background: C.red, borderRadius: '50%', width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900, color: '#fff',
          }}>{t.badge}</div>
        )}
        <div style={{ fontSize: 20, filter: active === t.id ? 'none' : 'grayscale(.8) opacity(.4)', transition: 'filter .2s' }}>{t.icon}</div>
        <div style={{ fontSize: 9, color: active === t.id ? (accentColor || C.blue) : C.dim, fontWeight: active === t.id ? 700 : 400 }}>{t.lbl}</div>
        {active === t.id && <div style={{ width: 20, height: 3, borderRadius: 2, background: accentColor || C.blue, marginTop: 1 }} />}
      </button>
    ))}
  </div>
)

export const TripCard = ({ trip, onJoin, onLeave, joined, isDriver, small }) => {
  const seatsLeft   = trip.seats_total - (trip.seats_taken || 0)
  const isRecurring = trip.is_recurring
  const isPast      = new Date(trip.depart_at) < new Date()
  const fmtT = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const fmtD = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmt$ = (n) => `$${parseFloat(n || 0).toFixed(2)}`

  return (
    <div className="card-hover" style={{
      background: C.card, borderRadius: 16,
      padding: small ? '12px 14px' : '16px',
      border: `1.5px solid ${joined ? C.green + '44' : C.border}`,
      marginBottom: 10, transition: 'all .2s',
    }}>
      {/* Route */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{trip.origin}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: C.amber, flexShrink: 0 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{trip.destination}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, color: C.amber }}>{fmt$(trip.cost_per_seat)}</div>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>per seat</div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Tag label={`🕐 ${fmtT(trip.depart_at)}`}                                          color={C.sub}  />
        <Tag label={`📅 ${fmtD(trip.depart_at)}`}                                          color={C.sub}  />
        <Tag label={`💺 ${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`}              color={seatsLeft > 0 ? C.green : C.red} />
        {isRecurring  && <Tag label="🔁 Weekly"      color={C.blueL} />}
        {trip.detour_ok && <Tag label="↪ Detours OK" color={C.dim}   />}
      </div>

      {/* Driver info (riders only) */}
      {!isDriver && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 10px', background: C.card2, borderRadius: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${C.blue}40, ${C.blueL}20)`, border: `1px solid ${C.blue}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.blueL, flexShrink: 0 }}>
            {(trip.driver_name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{trip.driver_name || 'UF Student'}</div>
            <div style={{ fontSize: 10, color: C.sub }}>⭐ {trip.driver_rating || '5.0'} · {trip.driver_rides || 0} rides</div>
          </div>
          <UFBadge />
        </div>
      )}

      {/* Note */}
      {trip.note && (
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, fontStyle: 'italic', padding: '6px 10px', background: C.card2, borderRadius: 8 }}>
          "{trip.note}"
        </div>
      )}

      {/* CTA */}
      {!isDriver && !isPast && (
        joined
          ? <>
              <div style={{ textAlign: 'center', padding: 10, background: `${C.green}12`, border: `1px solid ${C.green}33`, borderRadius: 10, fontSize: 13, color: C.green, fontWeight: 700 }}>✓ You're on this ride</div>
              {onLeave && (
                <div style={{ marginTop: 8 }}>
                  <Btn onClick={() => onLeave(trip)} variant="red" small>Leave this ride</Btn>
                </div>
              )}
            </>
          : seatsLeft > 0
            ? <Btn onClick={() => onJoin(trip)} variant="primary" small>Join Carpool · {fmt$(trip.cost_per_seat)}</Btn>
            : <div style={{ textAlign: 'center', padding: 10, background: `${C.red}10`, border: `1px solid ${C.red}22`, borderRadius: 10, fontSize: 13, color: C.red, fontWeight: 600 }}>Full — no seats left</div>
      )}
      {isDriver && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag label={`${trip.seats_taken || 0}/${trip.seats_total} riders joined`} color={C.amber} />
          {isPast  ? <Tag label="Completed" color={C.green} />
                   : <Tag label="Active"    color={C.blue}  />}
        </div>
      )}
    </div>
  )
}
