import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getAuthInstance } from '../lib/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const initStarted = useRef(false)

  useEffect(() => {
    let unsubscribe = () => {}

    // Defer Firebase Auth init — don't load on landing page or block first paint
    const timer = requestIdleCallback?.(() => startAuth()) ?? setTimeout(() => startAuth(), 50)

    function startAuth() {
      if (initStarted.current) return
      initStarted.current = true
      ;(async () => {
        try {
          const auth = await getAuthInstance()
          const { onAuthStateChanged } = await import('firebase/auth')
          unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u)
            setLoading(false)
          })
        } catch {
          // Firebase not configured — demo mode
          setLoading(false)
        }
      })()
    }

    return () => {
      if (typeof timer === 'number') {
        cancelIdleCallback?.(timer) ?? clearTimeout(timer)
      }
      unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    const auth = await getAuthInstance()
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    return signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    const auth = await getAuthInstance()
    const { signOut } = await import('firebase/auth')
    return signOut(auth)
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
