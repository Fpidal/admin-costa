'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { generarFeriadosAnio } from '@/lib/calendarioArgentina'
import { colorCasa } from '@/lib/coloresCasas'

// Tres meses de calendario, de lunes a domingo, con los días alquilados pintados
// del color de cada casa. Confirmada: día pintado en tono apagado. Sin
// confirmar: día blanco con una barra del color de la casa abajo. Si hay dos
// casas el mismo día, mitad y mitad.

interface ReservaCal {
  id: number
  propiedad_id: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}
interface Casa { id: string; nombre: string }

interface Props {
  reservas: ReservaCal[]
  casas: Casa[]
  onElegir?: (id: number) => void
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const pad = (n: number) => String(n).padStart(2, '0')
const isoDe = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export function CalendarioTrimestre({ reservas, casas, onElegir }: Props) {
  const hoy = new Date()
  const hoyISO = isoDe(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  // Arranca en el mes actual; en temporada conviene ver dic-ene-feb con las flechas
  const [inicio, setInicio] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() })

  const colores = useMemo(() => Object.fromEntries(casas.map((c, i) => [c.id, colorCasa(c.nombre, i)])), [casas])
  const nombres = useMemo(() => Object.fromEntries(casas.map(c => [c.id, c.nombre])), [casas])
  const activas = useMemo(() => reservas.filter(r => r.estado !== 'cancelada'), [reservas])

  const meses = [0, 1, 2].map(k => {
    const m = inicio.m + k
    return { y: inicio.y + Math.floor(m / 12), m: m % 12 }
  })

  const feriados = useMemo(() => {
    const mapa = new Map<string, string>()
    new Set(meses.map(x => x.y)).forEach(y => generarFeriadosAnio(y).forEach(f => mapa.set(f.fecha, f.nombre)))
    return mapa
  }, [meses.map(x => x.y).join()]) // eslint-disable-line react-hooks/exhaustive-deps

  function mover(delta: number) {
    const m = inicio.m + delta
    setInicio({ y: inicio.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 })
  }

  // Ocupación de los tres meses por casa (noches confirmadas o sin confirmar)
  const totalDias = meses.reduce((a, x) => a + new Date(x.y, x.m + 1, 0).getDate(), 0)
  const desde = isoDe(meses[0].y, meses[0].m, 1)
  const hasta = isoDe(meses[2].y, meses[2].m, new Date(meses[2].y, meses[2].m + 1, 0).getDate())
  const ocupacion = casas.map(c => {
    let noches = 0
    for (const x of meses) {
      const dias = new Date(x.y, x.m + 1, 0).getDate()
      for (let d = 1; d <= dias; d++) {
        const f = isoDe(x.y, x.m, d)
        if (activas.some(r => r.propiedad_id === c.id && f >= r.fecha_inicio && f < r.fecha_fin)) noches++
      }
    }
    return { casa: c, noches }
  })

  return (
    <div className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior"
          className="w-8 h-8 rounded-lg border border-costa-borde flex items-center justify-center text-costa-esmeralda hover:bg-costa-arena">
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-base font-bold text-costa-esmeralda">
          {MESES[meses[0].m]} {meses[0].y !== meses[2].y ? meses[0].y : ''} a {MESES[meses[2].m]} {meses[2].y}
        </h3>
        <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente"
          className="w-8 h-8 rounded-lg border border-costa-borde flex items-center justify-center text-costa-esmeralda hover:bg-costa-arena">
          <ChevronRight size={16} />
        </button>
        <button type="button" onClick={() => setInicio({ y: hoy.getFullYear(), m: hoy.getMonth() })}
          className="h-8 px-3 rounded-lg border border-costa-borde text-xs font-semibold text-costa-esmeralda hover:bg-costa-arena">
          Hoy
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-costa-gris">
          {casas.map(c => (
            <span key={c.id} className="flex items-center gap-1.5"><i className="w-3.5 h-3 rounded" style={{ background: colores[c.id] }} />{c.nombre}</span>
          ))}
          <span className="flex items-center gap-1.5">
            <i className="relative w-3.5 h-3 rounded border border-costa-borde bg-white">
              <i className="absolute left-0.5 right-0.5 bottom-0.5 h-[3px] rounded bg-costa-gris" />
            </i>Sin confirmar
          </span>
          <span className="flex items-center gap-1.5"><i className="w-3.5 h-1 rounded bg-[#e9b98f]" />Feriado</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {meses.map(({ y, m }) => {
          const dias = new Date(y, m + 1, 0).getDate()
          const offset = (new Date(y, m, 1).getDay() + 6) % 7
          return (
            <div key={`${y}-${m}`}>
              <h4 className="text-center text-sm font-bold text-costa-esmeralda mb-1">{MESES[m]} {y}</h4>
              <div className="grid grid-cols-7 gap-[3px]">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-costa-gris">{d}</div>
                ))}
                {Array.from({ length: offset }).map((_, i) => <div key={`v${i}`} />)}
                {Array.from({ length: dias }).map((_, i) => {
                  const d = i + 1
                  const f = isoDe(y, m, d)
                  const en = activas.filter(r => f >= r.fecha_inicio && f < r.fecha_fin)
                  const conf = en.filter(r => r.estado !== 'pendiente')
                  const pend = en.filter(r => r.estado === 'pendiente')
                  const feriado = feriados.get(f)
                  const fondo = conf.length === 0 ? undefined
                    : conf.length === 1 ? colores[conf[0].propiedad_id]
                    : `linear-gradient(135deg, ${colores[conf[0].propiedad_id]} 0 50%, ${colores[conf[1].propiedad_id]} 50% 100%)`
                  const barra = pend.length === 0 ? undefined
                    : pend.length === 1 ? colores[pend[0].propiedad_id]
                    : `linear-gradient(90deg, ${colores[pend[0].propiedad_id]} 0 50%, ${colores[pend[1].propiedad_id]} 50% 100%)`
                  const titulo = [
                    feriado ? `Feriado: ${feriado}` : '',
                    ...en.map(r => `${nombres[r.propiedad_id] || 'Casa'}: ${dm(r.fecha_inicio)} al ${dm(r.fecha_fin)}${r.estado === 'pendiente' ? ' (sin confirmar)' : ''}`),
                  ].filter(Boolean).join('\n') || 'Libre'
                  return (
                    <button key={f} type="button" title={titulo} disabled={!en.length}
                      onClick={() => en[0] && onElegir?.(en[0].id)}
                      className={`relative aspect-[1/0.8] rounded-md border text-xs font-bold flex items-center justify-center overflow-hidden
                        ${fondo ? 'text-white border-transparent' : `bg-white border-[#efe8dd] ${feriado ? 'text-[#8a3f12]' : 'text-costa-navy'}`}
                        ${f === hoyISO ? 'outline outline-2 -outline-offset-1 outline-costa-esmeralda' : ''}
                        ${en.length ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
                      style={fondo ? { background: fondo } : undefined}>
                      {feriado && <span className="absolute left-[3px] right-[3px] top-[2px] h-[3px] rounded bg-[#e9b98f]" />}
                      <span className="relative">{d}</span>
                      {barra && <span className="absolute left-1 right-1 bottom-1 h-[4px] rounded" style={{ background: barra }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-costa-borde flex flex-wrap gap-x-5 gap-y-1 text-xs text-costa-gris">
        <span>Del {dm(desde)} al {dm(hasta)}:</span>
        {ocupacion.map(o => (
          <span key={o.casa.id}><b className="text-costa-navy">{o.casa.nombre}</b> {o.noches} de {totalDias} noches ({Math.round((o.noches / totalDias) * 100)}%)</span>
        ))}
        {onElegir && <span>Tocá un día alquilado para ver la reserva arriba.</span>}
      </div>
    </div>
  )
}
