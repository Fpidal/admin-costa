'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos en milisegundos

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Función para cerrar sesión por inactividad
  const logoutByInactivity = useCallback(async () => {
    console.log('Sesión cerrada por inactividad')
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }, [])

  // Resetear el timer de inactividad
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      logoutByInactivity()
    }, INACTIVITY_TIMEOUT)
  }, [logoutByInactivity])

  useEffect(() => {
    // Obtener usuario actual
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Configurar listeners de actividad cuando hay usuario logueado
  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    // Throttle para no resetear el timer en cada movimiento
    let throttleTimer: NodeJS.Timeout | null = null
    const handleActivity = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        resetInactivityTimer()
      }, 1000) // Máximo una vez por segundo
    }

    // Agregar listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Iniciar timer
    resetInactivityTimer()

    // Verificar al volver a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const inactiveTime = Date.now() - lastActivityRef.current
        if (inactiveTime >= INACTIVITY_TIMEOUT) {
          logoutByInactivity()
        } else {
          resetInactivityTimer()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer)
      }
    }
  }, [user, resetInactivityTimer, logoutByInactivity])

  return { user, userId: user?.id, loading }
}
