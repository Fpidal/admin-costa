'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { aFechaISO, formatFecha } from '@/lib/fechas'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { demoPropiedades, demoReservas } from '@/lib/demoData'
import { obtenerInfoMesConCustom, FeriadoCustom } from '@/lib/calendarioArgentina'
import { nochesEntre } from '@/lib/resumenReservas'

// Tablero del mes: una fila por casa y una columna por día, todas juntas.
// Cada reserva es una barra que va de la mitad del día de ingreso a la mitad
// del día de salida, así se ve que ese día sale uno y puede entrar otro.

interface Propiedad {
  id: string
  nombre: string
  lote: string | null
}

interface Reserva {
  id: string
  propiedad_id: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  cantidad_personas?: number | null
  inquilinos?: { nombre: string }
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const INICIAL_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const ESTILO_BARRA: Record<string, string> = {
  confirmada: 'bg-costa-esmeralda text-white',
  cerrada: 'bg-costa-esmeralda/45 text-white',
  pendiente: 'bg-costa-superficie text-red-700 border-2 border-dashed border-red-600',
}

function CalendarioContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const demoQ = isDemo ? '?demo=true' : ''
  const demoAmp = isDemo ? '&demo=true' : ''
  const { userId } = useAuth()

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [feriadosCustom, setFeriadosCustom] = useState<FeriadoCustom[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => {
    if (isDemo) {
      setPropiedades(demoPropiedades.map(p => ({ id: p.id, nombre: p.nombre, lote: null })))
      setReservas(demoReservas.filter(r => r.estado !== 'cancelada').map(r => ({
        id: r.id,
        propiedad_id: r.propiedad_id,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        estado: r.estado,
        cantidad_personas: r.cantidad_personas,
        inquilinos: r.inquilinos ? { nombre: (r.inquilinos as { nombre: string }).nombre } : undefined,
      })))
      setLoading(false)
      return
    }
    if (!userId) return
    async function cargar() {
      const [p, r] = await Promise.all([
        supabase.from('propiedades').select('id, nombre, lote').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
        // Las cerradas también: en los meses pasados se ve quién estuvo
        supabase.from('reservas').select('id, propiedad_id, fecha_inicio, fecha_fin, estado, cantidad_personas, inquilinos(nombre)')
          .eq('user_id', userId).is('eliminado_at', null).in('estado', ['confirmada', 'pendiente', 'cerrada']).order('fecha_inicio'),
      ])
      if (p.data) setPropiedades(p.data)
      if (r.data) setReservas(r.data as unknown as Reserva[])
      setLoading(false)
    }
    cargar()
  }, [userId, isDemo])

  useEffect(() => {
    if (!userId || isDemo) return
    supabase.from('feriados_custom').select('*').eq('user_id', userId)
      .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`).order('fecha')
      .then(({ data }) => { if (data) setFeriadosCustom(data) })
  }, [anio, userId, isDemo])

  const feriados = useMemo(() => obtenerInfoMesConCustom(anio, mes, feriadosCustom), [anio, mes, feriadosCustom])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-costa-gris">Cargando...</div>
  }

  const cambiarMes = (delta: number) => {
    const d = new Date(anio, mes + delta, 1)
    setMes(d.getMonth())
    setAnio(d.getFullYear())
  }
  const irAHoy = () => { const d = new Date(); setMes(d.getMonth()); setAnio(d.getFullYear()) }

  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasEnMes }, (_, i) => {
    const fecha = new Date(anio, mes, i + 1)
    const iso = aFechaISO(fecha)
    return { n: i + 1, iso, dow: fecha.getDay(), feriado: feriados.get(iso) || null }
  })
  const primero = dias[0].iso
  const ultimo = dias[diasEnMes - 1].iso
  const finMes = aFechaISO(new Date(anio, mes + 1, 1)) // primer día del mes siguiente
  const hoy = aFechaISO(new Date())
  const esFinde = (dow: number) => dow === 0 || dow === 6

  // Posición en el tablero, en "días" desde el 1 del mes (puede ser decimal)
  const posicion = (iso: string) => nochesEntre(primero, iso)
  const pct = (v: number) => `${(v / diasEnMes) * 100}%`

  const reservasDelMes = reservas
    .filter(r => r.fecha_inicio.slice(0, 10) <= ultimo && r.fecha_fin.slice(0, 10) >= primero)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  const columnas = `minmax(110px, 140px) repeat(${diasEnMes}, minmax(30px, 1fr))`

  return (
    <div className="vista-compacta">
      <PageHeader title="Calendario" description="Todas las casas en el mismo tablero">
        <div className="flex items-center gap-1 rounded-lg border border-costa-borde bg-costa-superficie">
          <button onClick={() => cambiarMes(-1)} className="p-2 text-costa-navy hover:bg-costa-arena rounded-l-lg" title="Mes anterior"><ChevronLeft size={18} /></button>
          <span className="min-w-36 text-center font-bold text-costa-navy">{MESES[mes]} {anio}</span>
          <button onClick={() => cambiarMes(1)} className="p-2 text-costa-navy hover:bg-costa-arena rounded-r-lg" title="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
        <button onClick={irAHoy} className="rounded-lg border border-costa-borde bg-costa-superficie px-3 py-2 text-sm font-semibold text-costa-navy hover:bg-costa-arena">Hoy</button>
      </PageHeader>

      {propiedades.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-costa-gris">
          <Home size={40} className="mx-auto mb-3 opacity-40" />
          Todavía no hay casas cargadas. <Link href={`/admin/propiedades${demoQ}`} className="text-costa-esmeralda font-semibold underline">Agregar una</Link>
        </CardContent></Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[1000px] p-4">
                  {/* Encabezado: día de la semana y número */}
                  <div className="grid" style={{ gridTemplateColumns: columnas }}>
                    <span />
                    {dias.map(d => (
                      <div key={d.iso} title={d.feriado ? `Feriado: ${d.feriado.nombre}` : undefined}
                        className={`flex flex-col items-center pb-1.5 text-[0.75em] ${esFinde(d.dow) ? 'text-costa-navy' : 'text-costa-gris'}`}>
                        <span className={esFinde(d.dow) ? 'font-semibold' : ''}>{INICIAL_DIA[d.dow]}</span>
                        <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[1.1em] tabular-nums ${
                          d.iso === hoy ? 'bg-costa-esmeralda text-white font-bold' : d.feriado ? 'bg-sky-100 text-sky-800 font-bold' : 'font-semibold text-costa-navy'
                        }`}>{d.n}</span>
                      </div>
                    ))}
                  </div>

                  {/* Una fila por casa */}
                  <div className="space-y-2">
                    {propiedades.map(p => {
                      const delaCasa = reservasDelMes.filter(r => String(r.propiedad_id) === String(p.id))
                      // Noches ocupadas dentro del mes (sin contar las pendientes)
                      const ocupadas = delaCasa.filter(r => r.estado !== 'pendiente').reduce((acc, r) => {
                        const d = r.fecha_inicio.slice(0, 10) > primero ? r.fecha_inicio.slice(0, 10) : primero
                        const h = r.fecha_fin.slice(0, 10) < finMes ? r.fecha_fin.slice(0, 10) : finMes
                        return acc + Math.max(0, nochesEntre(d, h))
                      }, 0)
                      return (
                        <div key={p.id} className="grid items-stretch" style={{ gridTemplateColumns: columnas }}>
                          <div className="pr-2 py-1 flex flex-col justify-center">
                            <span className="font-bold text-costa-navy text-sm leading-tight">{p.nombre}</span>
                            <span className="text-[0.75em] text-costa-gris tabular-nums">{ocupadas} de {diasEnMes} noches</span>
                          </div>
                          <div className="relative h-14 rounded-lg border border-costa-borde bg-costa-superficie overflow-hidden" style={{ gridColumn: `span ${diasEnMes}` }}>
                            {/* Fondo: un casillero por día; tocar uno libre carga una reserva */}
                            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${diasEnMes}, 1fr)` }}>
                              {dias.map(d => (
                                <Link key={d.iso} href={`/admin/reservas?nueva=1&propiedad=${p.id}&desde=${d.iso}${demoAmp}`}
                                  title={`Cargar reserva desde el ${formatFecha(d.iso)}`}
                                  className={`border-r border-costa-borde/60 last:border-r-0 hover:bg-costa-esmeralda-suave transition-colors ${
                                    d.feriado ? 'bg-sky-50' : esFinde(d.dow) ? 'bg-costa-arena/70' : ''
                                  }`} />
                              ))}
                            </div>
                            {/* Reservas */}
                            {delaCasa.map(r => {
                              const ini = r.fecha_inicio.slice(0, 10) < primero ? 0 : posicion(r.fecha_inicio) + 0.5
                              const fin = r.fecha_fin.slice(0, 10) > ultimo ? diasEnMes : posicion(r.fecha_fin) + 0.5
                              const ancho = fin - ini
                              const nombre = (r.inquilinos?.nombre || 'Reserva').trim()
                              const noches = nochesEntre(r.fecha_inicio, r.fecha_fin)
                              return (
                                <Link key={r.id} href={`/admin/reservas/${r.id}/cobros${demoQ}`}
                                  title={`${nombre} · ${formatFecha(r.fecha_inicio)} al ${formatFecha(r.fecha_fin)} · ${noches} noches${r.estado === 'pendiente' ? ' · sin confirmar' : r.estado === 'cerrada' ? ' · cerrada' : ''}`}
                                  className={`absolute top-1.5 bottom-1.5 z-10 flex flex-col justify-center overflow-hidden whitespace-nowrap rounded-md px-2 text-[0.75em] leading-tight shadow-sm transition-opacity hover:opacity-85 ${ESTILO_BARRA[r.estado] || ESTILO_BARRA.confirmada}`}
                                  style={{ left: `calc(${pct(ini)} + 1px)`, width: `calc(${pct(ancho)} - 2px)` }}>
                                  {ancho >= 2 && <span className="font-bold truncate">{nombre}</span>}
                                  {ancho >= 3 && <span className="opacity-85 truncate tabular-nums">{formatFecha(r.fecha_inicio).slice(0, 5)} → {formatFecha(r.fecha_fin).slice(0, 5)} · {noches}n</span>}
                                </Link>
                              )
                            })}
                            {/* Hoy */}
                            {hoy >= primero && hoy <= ultimo && (
                              <span className="absolute top-0 bottom-0 z-20 w-0.5 bg-costa-coral-dark/70 pointer-events-none" style={{ left: pct(posicion(hoy) + 0.5) }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-costa-borde px-4 py-2.5 text-xs text-costa-gris">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm bg-costa-esmeralda" />Confirmada</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm border-2 border-dashed border-red-600" />Sin confirmar</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm bg-costa-esmeralda/45" />Cerrada</span>
                <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-sky-100 ring-1 ring-sky-300" />Feriado</span>
                <span className="flex items-center gap-1.5"><i className="h-3 w-0.5 bg-costa-coral-dark" />Hoy</span>
                <span className="ml-auto">Tocá una reserva para ver sus cobros, o un día libre para cargar una reserva</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardContent className="py-3">
                <h3 className="mb-2 font-bold text-costa-esmeralda">Reservas de {MESES[mes].toLowerCase()}</h3>
                {reservasDelMes.length === 0 ? (
                  <p className="py-4 text-sm text-costa-gris">No hay reservas este mes.</p>
                ) : (
                  <ul className="divide-y divide-costa-borde/70">
                    {reservasDelMes.map(r => {
                      const casa = propiedades.find(p => String(p.id) === String(r.propiedad_id))
                      return (
                        <li key={r.id}>
                          <Link href={`/admin/reservas/${r.id}/cobros${demoQ}`} className="flex items-center gap-3 py-2 text-sm hover:bg-costa-arena/50 rounded px-1">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.estado === 'pendiente' ? 'border-2 border-red-600' : r.estado === 'cerrada' ? 'bg-costa-esmeralda/45' : 'bg-costa-esmeralda'}`} />
                            <span className="w-28 shrink-0 font-semibold text-costa-navy truncate">{casa?.nombre}</span>
                            <span className="flex-1 min-w-0 truncate text-costa-navy">{r.inquilinos?.nombre?.trim() || '-'}</span>
                            <span className="shrink-0 tabular-nums text-costa-gris">{formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</span>
                            {r.estado === 'pendiente' && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Sin confirmar</span>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <h3 className="mb-2 font-bold text-costa-esmeralda">Feriados de {MESES[mes].toLowerCase()}</h3>
                {feriados.size === 0 ? (
                  <p className="py-4 text-sm text-costa-gris">Sin feriados este mes.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {Array.from(feriados.values()).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(f => (
                      <li key={f.fecha} className="flex gap-3">
                        <span className="w-12 shrink-0 font-semibold tabular-nums text-sky-800">{formatFecha(f.fecha).slice(0, 5)}</span>
                        <span className="text-costa-navy">{f.nombre}{f.esFinDeSemanaLargo && <span className="text-costa-gris"> · fin de semana largo</span>}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-costa-gris">Cargando...</div>}>
      <CalendarioContent />
    </Suspense>
  )
}
