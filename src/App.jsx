import { useState, useEffect } from 'react'
import { supabase, isDemo } from './supabase.js'
import { setDemoRole } from './demoClient.js'
import { C, CSS } from './theme.js'
import { Logo, DemoBanner } from './components/UI.jsx'
import { RoleSelector, LoginScreen, ForgotScreen, AdminPinGate } from './screens/Auth.jsx'
import { RiderSignup, DriverSignup } from './screens/Signup.jsx'
import { RiderApp, DriverApp, AdminPlatform } from './screens/Apps.jsx'

export default function App() {
  const [stage,   setStage]   = useState('loading')
  const [role,    setRole]    = useState(null)
  const [profile, setProfile] = useState(null)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*, driver_profiles(*)')
          .eq('id', session.user.id)
          .single()
        if (prof) {
          setProfile(prof)
          setStage(prof.role === 'admin' ? 'adminApp' : prof.role === 'driver' ? 'driverApp' : 'riderApp')
          return
        }
      }
      setStage('role')
    }
    checkSession()

    // Listen for auth state changes (logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    setStage(prof.role === 'admin' ? 'adminApp' : prof.role === 'driver' ? 'driverApp' : 'riderApp')
  }

  // Loading splash
  if (stage === 'loading') return (
    <div style={{ height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>
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

      {/* Forgot password */}
      {stage === 'forgot' && (
        <ForgotScreen role={role} onBack={() => setStage('login')} />
      )}

      {/* Admin login → PIN gate */}
      {stage === 'adminLogin' && (
        <LoginScreen
          role="admin"
          onBack={() => setStage('role')}
          onSuccess={() => setStage('adminPin')}
          onSignup={null}
          onForgot={() => setStage('forgot')}
        />
      )}
      {stage === 'adminPin' && (
        <AdminPinGate onBack={() => setStage('role')} onVerified={() => setStage('adminApp')} />
      )}

      {/* Apps */}
      {stage === 'riderApp'  && profile && <RiderApp      profile={profile} onLogout={handleLogout} />}
      {stage === 'driverApp' && profile && <DriverApp     profile={profile} onLogout={handleLogout} />}
      {stage === 'adminApp'             && <AdminPlatform                   onLogout={handleLogout} />}

      {isDemo && <DemoBanner />}
    </>
  )
}
