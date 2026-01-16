'use client'

import { useState } from 'react'
import { Search, Calendar, X } from 'lucide-react'

interface SelectorFechasPublicoProps {
  onBuscar: (checkIn: string, checkOut: string) => void
  onLimpiar: () => void
  fechasActivas: { checkIn: string; checkOut: string } | null
}

export function SelectorFechasPublico({
  onBuscar,
  onLimpiar,
  fechasActivas,
}: SelectorFechasPublicoProps) {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  const handleBuscar = () => {
    if (checkIn && checkOut) {
      onBuscar(checkIn, checkOut)
    }
  }

  const handleLimpiar = () => {
    setCheckIn('')
    setCheckOut('')
    onLimpiar()
  }

  // Calcular fecha mínima (hoy)
  const hoy = new Date().toISOString().split('T')[0]

  // Calcular noches
  const calcularNoches = () => {
    if (!checkIn || !checkOut) return 0
    const inicio = new Date(checkIn)
    const fin = new Date(checkOut)
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  }

  const noches = calcularNoches()

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-costa-coral" />
        <h3 className="font-semibold text-costa-navy">Buscar disponibilidad</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-costa-gris mb-1">Check-in</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={hoy}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-costa-navy focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs text-costa-gris mb-1">Check-out</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || hoy}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-costa-navy focus:border-transparent"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleBuscar}
            disabled={!checkIn || !checkOut}
            className="flex-1 h-10 flex items-center justify-center gap-2 bg-costa-navy text-white rounded-lg hover:bg-costa-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={16} />
            <span className="text-sm font-medium">Buscar</span>
          </button>

          {fechasActivas && (
            <button
              onClick={handleLimpiar}
              className="h-10 px-3 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Limpiar búsqueda"
            >
              <X size={16} className="text-costa-gris" />
            </button>
          )}
        </div>
      </div>

      {noches > 0 && (
        <p className="mt-3 text-sm text-costa-gris text-center">
          {noches} noche{noches > 1 ? 's' : ''} seleccionada{noches > 1 ? 's' : ''}
        </p>
      )}

      {fechasActivas && (
        <div className="mt-3 p-2 bg-costa-beige/50 rounded-lg text-center">
          <p className="text-sm text-costa-navy">
            Mostrando disponibilidad para{' '}
            <span className="font-semibold">
              {new Date(fechasActivas.checkIn).toLocaleDateString('es-AR')} -{' '}
              {new Date(fechasActivas.checkOut).toLocaleDateString('es-AR')}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
