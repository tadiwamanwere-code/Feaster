/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getMyDriverProfile, getMyWallet } from '../lib/drivers'

const DriverAuthContext = createContext()

export function DriverAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [driver, setDriver] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const d = await getMyDriverProfile()
      setDriver(d)
      if (d) {
        const w = await getMyWallet()
        setWallet(w)
      } else {
        setWallet(null)
      }
    } catch {
      setDriver(null)
      setWallet(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user || null)
      if (session?.user) await refresh()
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
      if (session?.user) await refresh()
      else { setDriver(null); setWallet(null) }
      setLoading(false)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [refresh])

  return (
    <DriverAuthContext.Provider value={{ user, driver, wallet, loading, refresh }}>
      {children}
    </DriverAuthContext.Provider>
  )
}

export function useDriverAuth() {
  const ctx = useContext(DriverAuthContext)
  if (!ctx) throw new Error('useDriverAuth must be used within DriverAuthProvider')
  return ctx
}
