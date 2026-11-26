'use client'

import { useEffect } from 'react'

/** Lleva a la página pública con la ficha de la casa abierta */
export function IrALaCasa({ id }: { id: string }) {
  const destino = `/?casa=${encodeURIComponent(id)}#propiedades`
  useEffect(() => { window.location.replace(destino) }, [destino])
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      <a href={destino}>Abriendo la casa…</a>
    </div>
  )
}
