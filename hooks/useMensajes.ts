'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MensajeUsuario {
  id: number
  mensaje: string
  leido: boolean
  created_at: string
}

export function useMensajes(userId: string | null | undefined) {
  const [mensajes, setMensajes] = useState<MensajeUsuario[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMensajes = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('mensajes_usuarios')
      .select('id, mensaje, leido, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) setMensajes(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchMensajes()
  }, [fetchMensajes])

  async function marcarLeido(id: number) {
    setMensajes(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m))
    await supabase.from('mensajes_usuarios').update({ leido: true }).eq('id', id)
  }

  const noLeidos = mensajes.filter(m => !m.leido).length

  return { mensajes, noLeidos, loading, marcarLeido, refetch: fetchMensajes }
}
