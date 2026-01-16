'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PrecioCalendario, TEMPORADAS_PRESETS } from '@/lib/calcularPrecio'

interface CalendarioPreciosProps {
  precios: PrecioCalendario[]
  anio: number
  onSelectRange: (inicio: Date, fin: Date) => void
  onChangeAnio: (anio: number) => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export function CalendarioPrecios({
  precios,
  anio,
  onSelectRange,
  onChangeAnio,
}: CalendarioPreciosProps) {
  const [mesActual, setMesActual] = useState(new Date().getMonth())
  const [seleccionInicio, setSeleccionInicio] = useState<Date | null>(null)
  const [seleccionFin, setSeleccionFin] = useState<Date | null>(null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  // Obtener precio para una fecha
  const getPrecioFecha = (fecha: Date): PrecioCalendario | null => {
    const fechaStr = fecha.toISOString().split('T')[0]
    return precios.find(
      p => fechaStr >= p.fecha_inicio && fechaStr <= p.fecha_fin
    ) || null
  }

  // Generar días del mes
  const getDiasMes = (mes: number) => {
    const primerDia = new Date(anio, mes, 1)
    const ultimoDia = new Date(anio, mes + 1, 0)
    const diasEnMes = ultimoDia.getDate()
    const primerDiaSemana = primerDia.getDay()

    const dias: (Date | null)[] = []

    // Días vacíos al inicio
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null)
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(new Date(anio, mes, dia))
    }

    return dias
  }

  // Manejar click en día
  const handleClickDia = (fecha: Date) => {
    if (!seleccionInicio || (seleccionInicio && seleccionFin)) {
      // Iniciar nueva selección
      setSeleccionInicio(fecha)
      setSeleccionFin(null)
    } else {
      // Completar selección
      if (fecha < seleccionInicio) {
        setSeleccionFin(seleccionInicio)
        setSeleccionInicio(fecha)
        onSelectRange(fecha, seleccionInicio)
      } else {
        setSeleccionFin(fecha)
        onSelectRange(seleccionInicio, fecha)
      }
    }
  }

  // Verificar si fecha está en rango seleccionado
  const isInRange = (fecha: Date): boolean => {
    if (!seleccionInicio) return false

    const fin = seleccionFin || hoveredDate
    if (!fin) return fecha.getTime() === seleccionInicio.getTime()

    const inicio = seleccionInicio < fin ? seleccionInicio : fin
    const final = seleccionInicio < fin ? fin : seleccionInicio

    return fecha >= inicio && fecha <= final
  }

  // Color de fondo según temporada
  const getColorTemporada = (temporada: string | null): string => {
    if (!temporada) return 'bg-gray-100'
    const config = TEMPORADAS_PRESETS[temporada as keyof typeof TEMPORADAS_PRESETS]
    if (!config) return 'bg-gray-100'

    switch (temporada) {
      case 'alta': return 'bg-red-100 border-red-300'
      case 'media': return 'bg-amber-100 border-amber-300'
      case 'baja': return 'bg-green-100 border-green-300'
      case 'especial': return 'bg-violet-100 border-violet-300'
      default: return 'bg-gray-100'
    }
  }

  return (
    <div className="space-y-4">
      {/* Navegación de año */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onChangeAnio(anio - 1)}
          className="p-2 hover:bg-costa-beige rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-costa-navy">{anio}</h2>
        <button
          onClick={() => onChangeAnio(anio + 1)}
          className="p-2 hover:bg-costa-beige rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-100 border border-red-300"></span>
          <span>Alta</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></span>
          <span>Media</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-green-100 border border-green-300"></span>
          <span>Baja</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-violet-100 border border-violet-300"></span>
          <span>Especial</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-gray-300"></span>
          <span>No disponible</span>
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between border-b border-costa-beige pb-2">
        <button
          onClick={() => setMesActual(m => m > 0 ? m - 1 : 11)}
          className="p-1 hover:bg-costa-beige rounded transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-semibold text-costa-navy">{MESES[mesActual]}</h3>
        <button
          onClick={() => setMesActual(m => m < 11 ? m + 1 : 0)}
          className="p-1 hover:bg-costa-beige rounded transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendario del mes */}
      <div>
        {/* Encabezado días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA.map((dia, i) => (
            <div
              key={i}
              className="text-center text-xs font-medium text-costa-gris py-1"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {getDiasMes(mesActual).map((fecha, i) => {
            if (!fecha) {
              return <div key={i} className="aspect-square"></div>
            }

            const precio = getPrecioFecha(fecha)
            const inRange = isInRange(fecha)
            const isStart = seleccionInicio && fecha.getTime() === seleccionInicio.getTime()
            const isEnd = seleccionFin && fecha.getTime() === seleccionFin.getTime()
            const noDisponible = precio && !precio.disponible

            return (
              <button
                key={i}
                onClick={() => handleClickDia(fecha)}
                onMouseEnter={() => setHoveredDate(fecha)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  aspect-square p-1 rounded-lg border text-xs transition-all
                  flex flex-col items-center justify-center
                  ${noDisponible ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                  ${!noDisponible && precio ? getColorTemporada(precio.temporada) : 'bg-white border-gray-200'}
                  ${inRange ? 'ring-2 ring-costa-navy ring-offset-1' : ''}
                  ${isStart || isEnd ? 'bg-costa-navy text-white' : ''}
                  ${!noDisponible ? 'hover:border-costa-navy cursor-pointer' : ''}
                `}
              >
                <span className="font-medium">{fecha.getDate()}</span>
                {precio && !noDisponible && (
                  <span className="text-[10px] text-costa-gris truncate w-full text-center">
                    ${precio.precio_noche}
                  </span>
                )}
                {noDisponible && (
                  <span className="text-[10px]">—</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vista de todos los meses (miniatura) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-6">
        {MESES.map((mes, idx) => (
          <button
            key={idx}
            onClick={() => setMesActual(idx)}
            className={`
              p-2 text-xs rounded-lg border transition-colors
              ${idx === mesActual ? 'bg-costa-navy text-white border-costa-navy' : 'bg-white border-gray-200 hover:border-costa-navy'}
            `}
          >
            {mes.substring(0, 3)}
          </button>
        ))}
      </div>
    </div>
  )
}
