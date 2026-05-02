import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
/* eslint-disable react-refresh/only-export-components */
import { getMyCustomerProfile } from '../lib/customers'

const CustomerAuthContext = createContext()

export function CustomerAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pinSet, setPinSet] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getMyCustomerProfile()
      setProfile(p)
      setPinSet(!!p?.pin_hash)
    } catch {
      setProfile(null)
      setPinSet(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user || null)
      if (session?.user) await refreshProfile()
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
      if (session?.user) {
        await refreshProfile()
      } else {
        setProfile(null)
        setPinSet(false)
      }
      setLoading(false)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [refreshProfile])

  return (
    <CustomerAuthContext.Provider value={{ user, profile, pinSet, loading, refreshProfile }}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext)
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  return ctx
}
