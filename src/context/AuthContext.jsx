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

  const logout = async () => {
    // Try server signOut, but don't get stuck if network/token is broken.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      /* ignore — we'll force-clear below */
    }
    // Belt-and-braces: nuke any stale Supabase keys and force a clean reload.
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-') || k.startsWith('supabase.auth.'))
        .forEach(k => localStorage.removeItem(k))
      sessionStorage.clear()
    } catch { /* ignore */ }
    setUser(null)
    if (typeof window !== 'undefined') window.location.href = '/'
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
