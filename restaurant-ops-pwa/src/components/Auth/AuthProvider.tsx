// Authentication provider component for managing auth state
import type { FC, ReactNode } from 'react'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { supabase } from '../../services/supabase'
import { getCurrentUser } from '../../store/authSlice'
import type { AppDispatch } from '../../store'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    // Check active session
    dispatch(getCurrentUser())

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          dispatch(getCurrentUser())
        } else if (event === 'SIGNED_OUT') {
          // Handle sign out
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [dispatch])

  return <>{children}</>
}