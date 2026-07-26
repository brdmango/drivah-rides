import { useState, useEffect } from 'react'
import { supabase, isDemo } from './supabase.js'
import { setDemoRole } from './demoClient.js'
import { C } from './theme.js'
import { Logo, DemoBanner } from './components/UI.jsx'
import { RoleSelector, LoginScreen, ForgotScreen, AdminPinGate, ResetPasswordScreen } from './screens/Auth.jsx'
import { RiderSignup, DriverSignup } from './screens/Signup.jsx'
import { RiderApp, DriverApp, AdminPlatform } from './screens/Apps.jsx'

/* Supabase puts the recovery token in the URL fragment and emits
   PASSWORD_RECOVERY once it has parsed it. Check the fragment directly too,
   so a slow parse cannot drop the user on the role selector instead. */
const hasRecoveryToken = () =>
  typeof window !== 'undefined' && /type=recovery/.test(window.location.hash)

export default function App() {
  const [stage,   setStage]   = useState('loading')
  const [role,    setRole]    = useState(null)
  const [profile, setProfile] = useState(null)

  const stageFor = (prof) =>
    prof.role === 'admin'  ? 'adminPin'   // never skip the PIN, even on session restore
  : prof.role === 'driver' ? 'driverApp'
  :                          'riderApp'

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (hasRecoveryToken()) { setStage('resetPassword'); return }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*, driver_profiles(*)')
          .eq('id', session.user.id)
          .single()
        if (prof) {
          setProfile(prof)
          setStage(stageFor(prof))
          return
        }
      }
      setStage('role')
    }
    checkSession()

    // Listen for auth state changes (logout, recovery, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setStage('resetPassword'); return }
      if (!session) { setProfile(null); setStage('role') }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRole(null)
    setStage('role')
  }

  const handleLoginSuccess = (prof) => {
    setProfile(prof)
    setStage(stageFor(prof))
  }

  // Loading splash
  if (stage === 'loading') return (
    <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <Logo size="lg" />
      <div className="spin" style={{ fontSize: 24, color: C.blue }}>⟳</div>
    </div>
  )

  return (
    <>
      {/* Role selector */}
      {stage === 'role' && (
        <RoleSelector onSelect={r => { setRole(r); if (isDemo) setDemoRole(r); setStage(r === 'admin' ? 'adminLogin' : 'login') }} />
      )}

      {/* Rider / Driver login */}
      {stage === 'login' && (
        <LoginScreen
          role={role}
          onBack={() => setStage('role')}
          onSuccess={handleLoginSuccess}
          onSignup={() => setStage('signup')}
          onForgot={() => setStage('forgot')}
        />
      )}

      {/* Signup flows */}
      {stage === 'signup' && role === 'rider'  && <RiderSignup  onBack={() => setStage('login')} />}
      {stage === 'signup' && role === 'driver' && <DriverSignup onBack={() => setStage('login')} />}

      {/* Password reset */}
      {stage === 'forgot' && (
        <ForgotScreen role={role} onBack={() => setStage('login')} />
      )}
      {stage === 'resetPassword' && (
        <ResetPasswordScreen onDone={() => { setProfile(null); setStage('role') }} />
      )}

      {/* Admin login → PIN gate */}
      {stage === 'adminLogin' && (
        <LoginScreen
          role="admin"
          onBack={() => setStage('role')}
          onSuccess={handleLoginSuccess}
          onSignup={null}
          onForgot={() => setStage('forgot')}
        />
      )}
      {stage === 'adminPin' && (
        <AdminPinGate onBack={handleLogout} onVerified={() => setStage('adminApp')} />
      )}

      {/* Apps */}
      {stage === 'riderApp'  && profile && <RiderApp      profile={profile} onLogout={handleLogout} />}
      {stage === 'driverApp' && profile && <DriverApp     profile={profile} onLogout={handleLogout} />}
      {stage === 'adminApp'             && <AdminPlatform                   onLogout={handleLogout} />}

      {isDemo && <DemoBanner />}
    </>
  )
}
