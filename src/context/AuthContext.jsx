import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const logout = async (redirectTo = '/') => {
    // Global sign-out invalidates the refresh token server-side too —
    // local-only leaves a zombie session that auto-restores.
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch {
      /* network can fail — we'll force-clear below */
    }
    // Belt-and-braces: nuke any stale Supabase keys + force a clean reload.
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k.startsWith('supabase.auth.') || k.startsWith('supabase-auth-token'))
        .forEach(k => localStorage.removeItem(k))
      sessionStorage.clear()
    } catch { /* ignore */ }
    setUser(null)
    if (typeof window !== 'undefined') {
      // .replace prevents Back-button bouncing back into the auth-walled page
      window.location.replace(redirectTo)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
