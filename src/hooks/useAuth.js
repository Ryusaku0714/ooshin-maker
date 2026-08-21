import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () => {
    const forceAccountPicker = localStorage.getItem('ooshin_force_account_picker')
    if (forceAccountPicker) localStorage.removeItem('ooshin_force_account_picker')

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        ...(forceAccountPicker ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    })
  }

  const signOut = () =>
    supabase.auth.signOut().then(result => {
      localStorage.setItem('ooshin_force_account_picker', '1')
      return result
    })

  return { user, loading, signInWithGoogle, signOut }
}
