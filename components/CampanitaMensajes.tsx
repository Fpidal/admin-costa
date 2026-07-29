'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMensajes } from '@/hooks/useMensajes'

export function CampanitaMensajes() {
  const { userId } = useAuth()
  const { mensajes, noLeidos, marcarLeido } = useMensajes(userId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleOpen() {
    setOpen(!open)
  }

  function handleClickMensaje(id: number, leido: boolean) {
    if (!leido) marcarLeido(id)
  }

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  if (!userId) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-lg hover:bg-costa-white/50 text-costa-navy"
        title="Mensajes"
      >
        <Bell size={20} />
        {noLeidos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-costa-coral text-white text-[10px] font-bold">
            {noLeidos > 9 ? '9+' : noLeidos}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-costa-beige z-50">
          <div className="px-4 py-3 border-b border-costa-beige">
            <h3 className="text-sm font-bold text-costa-navy">Mensajes</h3>
          </div>
          {mensajes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-costa-gris text-center">No tenés mensajes</p>
          ) : (
            <ul>
              {mensajes.map((m) => (
                <li
                  key={m.id}
                  onClick={() => handleClickMensaje(m.id, m.leido)}
                  className={`px-4 py-3 border-b border-costa-beige last:border-0 cursor-pointer hover:bg-costa-beige-light/40 ${!m.leido ? 'bg-costa-beige-light/60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!m.leido && <span className="mt-1.5 w-2 h-2 rounded-full bg-costa-coral flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm text-costa-navy break-words">{m.mensaje}</p>
                      <p className="text-xs text-costa-gris mt-1">{formatFecha(m.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
