'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import {
  PriceRule,
  DayPrice,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  calculatePriceForDate,
  calculateMonthPrices
} from '@/lib/priceRules'
import { obtenerInfoMes, Feriado } from '@/lib/calendarioArgentina'

interface Reserva {
  id: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  inquilinos?: { nombre: string }
}

interface CalendarioPreciosProps {
  rules: PriceRule[]
  reservas?: Reserva[]
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
  rules,
  reservas = [],
  anio,
  onSelectRange,
  onChangeAnio,
}: CalendarioPreciosProps) {
  const [mesActual, setMesActual] = useState(new Date().getMonth())
  const [seleccionInicio, setSeleccionInicio] = useState<Date | null>(null)
  const [seleccionFin, setSeleccionFin] = useState<Date | null>(null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  // Calcular precios del mes actual
  const preciosMes = useMemo(() => {
    return calculateMonthPrices(anio, mesActual, rules)
  }, [anio, mesActual, rules])

  // Obtener feriados del mes
  const feriadosMes = useMemo(() => {
    return obtenerInfoMes(anio, mesActual)
  }, [anio, mesActual])

  // Obtener precio para una fecha
  const getPrecioFecha = (fecha: Date): DayPrice | null => {
    const dateStr = fecha.toISOString().split('T')[0]
    return preciosMes.get(dateStr) || null
  }

  // Verificar si una fecha tiene reserva
  const getReservaFecha = (fecha: Date): Reserva | null => {
    const fechaStr = fecha.toISOString().split('T')[0]
    return reservas.find(
      r => fechaStr >= r.fecha_inicio && fechaStr <= r.fecha_fin
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

  // Color de fondo según categoría de precio
  const getColorCategoria = (dayPrice: DayPrice | null): string => {
    if (!dayPrice) return 'bg-gray-50 border-gray-200'
    const colors = CATEGORY_COLORS[dayPrice.category]
    return `${colors.bg} ${colors.border}`
  }

  return (
    <div className="space-y-2 max-w-xs">
      {/* Navegación de año */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onChangeAnio(anio - 1)}
          className="p-1 hover:bg-costa-beige rounded transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <h2 className="text-sm font-bold text-costa-navy">{anio}</h2>
        <button
          onClick={() => onChangeAnio(anio + 1)}
          className="p-1 hover:bg-costa-beige rounded transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Leyenda de categorías */}
      <div className="flex flex-wrap gap-1.5 text-[9px]">
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300"></span>
          <span>Muy Alta</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-orange-100 border border-orange-300"></span>
          <span>Alta</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300"></span>
          <span>Media</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300"></span>
          <span>Baja</span>
        </div>
      </div>

      {/* Leyenda de reservas y feriados */}
      <div className="flex flex-wrap gap-1.5 text-[9px] pt-1 border-t border-costa-beige">
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-costa-olivo"></span>
          <span>Confirmada</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-costa-coral"></span>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
          <span>Feriado</span>
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between border-b border-costa-beige pb-1">
        <button
          onClick={() => setMesActual(m => m > 0 ? m - 1 : 11)}
          className="p-0.5 hover:bg-costa-beige rounded transition-colors"
        >
          <ChevronLeft size={12} />
        </button>
        <h3 className="text-xs font-semibold text-costa-navy">{MESES[mesActual]}</h3>
        <button
          onClick={() => setMesActual(m => m < 11 ? m + 1 : 0)}
          className="p-0.5 hover:bg-costa-beige rounded transition-colors"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Calendario del mes */}
      <div>
        {/* Encabezado días de la semana */}
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {DIAS_SEMANA.map((dia, i) => (
            <div
              key={i}
              className="text-center text-[9px] font-medium text-costa-gris py-0.5"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-0.5">
          {getDiasMes(mesActual).map((fecha, i) => {
            if (!fecha) {
              return <div key={i} className="h-9"></div>
            }

            const dateStr = fecha.toISOString().split('T')[0]
            const dayPrice = getPrecioFecha(fecha)
            const reserva = getReservaFecha(fecha)
            const feriado = feriadosMes.get(dateStr)
            const inRange = isInRange(fecha)
            const isStart = seleccionInicio && fecha.getTime() === seleccionInicio.getTime()
            const isEnd = seleccionFin && fecha.getTime() === seleccionFin.getTime()
            const estaReservado = !!reserva

            // Color según estado de reserva (tiene prioridad)
            const getColorReserva = () => {
              if (!reserva) return ''
              return reserva.estado === 'confirmada'
                ? 'bg-costa-olivo text-white border-costa-olivo'
                : 'bg-costa-coral text-white border-costa-coral'
            }

            // Tooltip con información
            const getTooltip = () => {
              let tooltip = ''
              if (feriado) {
                tooltip = `${feriado.nombre}${feriado.esFinDeSemanaLargo ? ' (FDS largo)' : ''}\n`
              }
              if (estaReservado) {
                tooltip += `${reserva?.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}: ${reserva?.inquilinos?.nombre || 'Sin nombre'}`
              } else if (dayPrice) {
                tooltip += `$${dayPrice.price} - ${dayPrice.ruleName}`
              } else {
                tooltip += 'Sin precio configurado'
              }
              return tooltip
            }

            return (
              <button
                key={i}
                onClick={() => handleClickDia(fecha)}
                onMouseEnter={() => setHoveredDate(fecha)}
                onMouseLeave={() => setHoveredDate(null)}
                title={getTooltip()}
                className={`
                  h-9 rounded border text-[8px] transition-all relative
                  flex flex-col items-center justify-center
                  ${estaReservado ? getColorReserva() : getColorCategoria(dayPrice)}
                  ${inRange ? 'ring-1 ring-costa-navy ring-offset-0' : ''}
                  ${isStart || isEnd ? 'bg-costa-navy text-white border-costa-navy' : ''}
                  ${!estaReservado ? 'hover:border-costa-navy cursor-pointer' : 'cursor-default'}
                  ${feriado && !estaReservado ? 'ring-1 ring-blue-400' : ''}
                `}
              >
                {/* Indicador de feriado */}
                {feriado && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" title={feriado.nombre} />
                )}
                <span className="font-medium text-[10px]">{fecha.getDate()}</span>
                {estaReservado ? (
                  <span className="text-[7px] leading-none truncate w-full text-center px-0.5">
                    {reserva?.inquilinos?.nombre?.split(' ')[0] || (reserva?.estado === 'confirmada' ? 'Conf.' : 'Pend.')}
                  </span>
                ) : dayPrice ? (
                  <span className={`text-[7px] leading-none font-mono ${CATEGORY_COLORS[dayPrice.category].text}`}>
                    ${dayPrice.price}
                  </span>
                ) : (
                  <span className="text-[7px] text-gray-400">-</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vista de todos los meses (miniatura) */}
      <div className="grid grid-cols-6 gap-1 mt-3">
        {MESES.map((mes, idx) => (
          <button
            key={idx}
            onClick={() => setMesActual(idx)}
            className={`
              py-1 text-[9px] rounded border transition-colors
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
