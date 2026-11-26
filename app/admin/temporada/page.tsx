'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, Plus, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { AvisosCobranza } from '@/components/AvisosCobranza'
import { demoReservas, demoPropiedades, demoCobros } from '@/lib/demoData'
import { formatFecha, aFechaISO } from '@/lib/fechas'
import {
  montosReserva, sumarMontos, monedasCon, filtrarReservas, rangoTemporada, temporadaDe, temporadaActual,
  etiquetaTemporada, nochesEntre, FILTRO_INICIAL, type PorMoneda,
} from '@/lib/resumenReservas'
import { vencimientoSaldo } from '@/lib/cobranza'
import { ocupacionTemporada } from '@/lib/ocupacion'
import { generarReporteReservasPDF } from '@/lib/reporteReservasPDF'
import type { ServicioExtra } from '@/lib/serviciosReserva'

const URL_INFO_UTIL = 'https://admin-costa.vercel.app/'

interface Propiedad { id: number | string; nombre: string; lote: string | null }

interface Reserva {
  id: number
  propiedad_id: string
  fecha_inicio: string
  fecha_fin: string
  horario_ingreso: string | null
  horario_salida: string | null
  cantidad_personas: number | null
  precio_noche: number | null
  moneda: string | null
  deposito: number | null
  estado: string
  ropa_blanca?: boolean | null
  monto_ropa_blanca?: number | null
  moneda_ropa_blanca?: string | null
  limpieza_final?: number | null
  moneda_limpieza?: string | null
  monto_lavadero?: number | null
  moneda_lavadero?: string | null
  servicios_extra?: ServicioExtra[] | null
  propiedades?: { nombre: string; lote: string | null }
  inquilinos?: { nombre: string; telefono?: string | null }
}

interface Cobro { reserva_id: number | string; monto: number; moneda: string; concepto: string; aplicar_a: string }

const importe = (v: number, moneda: string) =>
  `${moneda === 'USD' ? 'U$D' : '$'} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))}`

function Montos({ montos, className = '', vacio = 'U$D 0' }: { montos: PorMoneda; className?: string; vacio?: string }) {
  const lista = monedasCon(montos)
  if (!lista.length) return <span className={className}>{vacio}</span>
  return <span className={className}>{lista.map((m, i) => <span key={m} className={i ? 'block text-base' : 'block'}>{importe(montos[m], m)}</span>)}</span>
}

const ddmm = (iso: string) => formatFecha(iso).slice(0, 5)

function TemporadaContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const demoQ = isDemo ? '?demo=true' : ''
  const demoAmp = isDemo ? '&demo=true' : ''
  const { userId } = useAuth()

  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [temporada, setTemporada] = useState(temporadaActual())

  useEffect(() => {
    if (isDemo) {
      setReservas(demoReservas as unknown as Reserva[])
      setCobros(demoCobros as unknown as Cobro[])
      setPropiedades(demoPropiedades.map(p => ({ id: p.id, nombre: p.nombre, lote: null })))
      setLoading(false)
      return
    }
    if (!userId) return
    async function cargar() {
      const [r, c, p] = await Promise.all([
        supabase.from('reservas').select('*, propiedades(nombre, lote), inquilinos(nombre, telefono)').eq('user_id', userId).is('eliminado_at', null).order('fecha_inicio'),
        supabase.from('cobros').select('reserva_id, monto, moneda, concepto, aplicar_a, reservas!inner(eliminado_at)').eq('user_id', userId).is('reservas.eliminado_at', null),
        supabase.from('propiedades').select('id, nombre, lote').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
      ])
      if (r.data) setReservas(r.data)
      if (c.data) setCobros(c.data)
      if (p.data) setPropiedades(p.data)
      setLoading(false)
    }
    cargar()
  }, [isDemo, userId])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-costa-gris">Cargando...</div>
  }

  const actual = temporadaActual()
  const { desde, hasta } = rangoTemporada(temporada)
  const hoy = aFechaISO(new Date())

  // Temporadas con reservas, más la actual
  const temporadas = Array.from(new Set([actual, ...reservas.map(r => temporadaDe(r.fecha_inicio)).filter((t): t is number => t !== null)])).sort((a, b) => a - b)
  const idx = temporadas.indexOf(temporada)

  // Plata: mismo criterio que Reservas (ingreso dentro de la temporada, sin canceladas).
  // Total y pendiente cuentan lo confirmado; lo sin confirmar va aparte
  const deLaTemporada = filtrarReservas(reservas, { ...FILTRO_INICIAL, tipo: 'temporada', valor: String(temporada) })
    .filter(r => r.estado !== 'cancelada')
  const firmes = deLaTemporada.filter(r => r.estado !== 'pendiente').map(r => montosReserva(r, cobros))
  const total = sumarMontos(firmes.map(m => m.total))
  const cobrado = sumarMontos(firmes.map(m => m.cobrado))
  const saldo = sumarMontos(firmes.map(m => m.saldo))
  const aConfirmar = sumarMontos(deLaTemporada.filter(r => r.estado === 'pendiente').map(r => montosReserva(r, cobros).total))
  const conSaldo = firmes.filter(m => monedasCon(m.saldo).some(x => m.saldo[x] > 0)).length
  const pctCobrado = total.USD ? Math.round((cobrado.USD || 0) / total.USD * 100) : null

  // Ocupación por casa
  const { totalNoches, casas } = ocupacionTemporada(reservas, propiedades.map(p => String(p.id)), desde, hasta)
  const nochesConf = casas.reduce((a, c) => a + c.nochesConfirmadas, 0)
  const nochesPosibles = totalNoches * casas.length
  const pctOcupacion = nochesPosibles ? Math.round(nochesConf / nochesPosibles * 100) : 0
  const pct = (noches: number) => `${(noches / totalNoches) * 100}%`
  const posHoy = hoy >= desde && hoy <= hasta ? nochesEntre(desde, hoy) : null

  // El hueco más largo de la temporada (de 5 noches o más), para avisarlo
  const huecoMayor = casas
    .flatMap(c => c.huecos.map(h => ({ ...h, casa: propiedades.find(p => String(p.id) === c.propiedadId) })))
    .filter(h => h.noches >= 5 && h.hasta > hoy)
    .sort((a, b) => b.noches - a.noches)[0]

  // Marcas del eje: inicio, fin y el primero de cada mes
  const marcas: { pos: number; label: string }[] = [{ pos: 0, label: ddmm(desde) }]
  for (const iso of [`${temporada}-12-24`, `${temporada + 1}-01-01`, `${temporada + 1}-01-15`, `${temporada + 1}-02-01`]) {
    marcas.push({ pos: nochesEntre(desde, iso), label: ddmm(iso) })
  }
  marcas.push({ pos: totalNoches, label: ddmm(hasta) })

  const nombreCasa = (id: string) => {
    const p = propiedades.find(p => String(p.id) === id)
    return p ? p.nombre : ''
  }

  function descargarReporte() {
    generarReporteReservasPDF({ reservas: deLaTemporada, cobros, casas: 'Todas las casas', periodo: etiquetaTemporada(temporada) })
  }

  const listado = [...deLaTemporada].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  return (
    <div className="vista-compacta">
      <PageHeader title={etiquetaTemporada(temporada)} description={`${formatFecha(desde)} al ${formatFecha(hasta)} · ${new Intl.ListFormat('es', { type: 'conjunction' }).format(propiedades.map(p => p.nombre))}`}>
        <div className="flex items-center rounded-lg border border-costa-borde bg-costa-superficie">
          <button className="p-2 text-costa-navy disabled:opacity-30" disabled={idx <= 0} onClick={() => setTemporada(temporadas[idx - 1])} title="Temporada anterior"><ChevronLeft size={16} /></button>
          <span className="px-1 text-sm font-semibold text-costa-navy tabular-nums">{temporada}/{String(temporada + 1).slice(-2)}</span>
          <button className="p-2 text-costa-navy disabled:opacity-30" disabled={idx >= temporadas.length - 1} onClick={() => setTemporada(temporadas[idx + 1])} title="Temporada siguiente"><ChevronRight size={16} /></button>
        </div>
        <Button variant="secondary" onClick={descargarReporte} disabled={!deLaTemporada.length}><Download size={15} /> Reporte PDF</Button>
        <Link href={`/admin/reservas?nueva=1${demoAmp}`}><Button><Plus size={16} /> Nueva reserva</Button></Link>
      </PageHeader>

      {/* Resumen de la temporada */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="py-3">
          <p className="text-sm text-costa-gris">Total reservado</p>
          <Montos montos={total} className="text-2xl font-bold text-costa-navy" />
          {monedasCon(aConfirmar).length > 0 && <p className="text-xs font-semibold text-red-700">+ {monedasCon(aConfirmar).map(m => importe(aConfirmar[m], m)).join(' + ')} sin confirmar</p>}
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-sm text-costa-gris">Cobrado</p>
          <Montos montos={cobrado} className="text-2xl font-bold text-costa-olivo" />
          {pctCobrado !== null && <p className="text-xs text-costa-gris">{pctCobrado}% del total</p>}
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-sm text-costa-gris">Pendiente de cobro</p>
          <Montos montos={saldo} className="text-2xl font-bold text-costa-coral-dark" />
          <p className="text-xs text-costa-gris">{conSaldo} reserva{conSaldo !== 1 ? 's' : ''}</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="text-sm text-costa-gris">Ocupación</p>
          <p className="text-2xl font-bold text-costa-navy">{pctOcupacion}%</p>
          <p className="text-xs text-costa-gris">{nochesConf} de {nochesPosibles} noches confirmadas</p>
        </CardContent></Card>
      </div>

      {/* Lo que hay que hacer: solo tiene sentido en la temporada en curso */}
      {temporada === actual && (
        <AvisosCobranza reservas={reservas} cobros={cobros} isDemo={isDemo} linkInfoUtil={URL_INFO_UTIL} />
      )}

      {/* Línea de ocupación */}
      <Card className="mb-4">
        <CardHeader className="flex items-baseline justify-between gap-2">
          <CardTitle>Ocupación</CardTitle>
          <span className="text-xs text-costa-gris">Tocá una reserva para ver sus cobros, o un hueco libre para cargar una reserva</span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-3">
              {casas.map(c => (
                <div key={c.propiedadId} className="grid grid-cols-[110px_1fr_56px] items-center gap-3">
                  <span className="font-semibold text-costa-navy text-sm">{nombreCasa(c.propiedadId)}</span>
                  <div className="relative h-11 rounded-md bg-costa-esmeralda-suave">
                    {c.huecos.map(h => (
                      <Link key={h.desde} href={`/admin/reservas?nueva=1&propiedad=${c.propiedadId}&desde=${h.desde}&hasta=${h.hasta}${demoAmp}`}
                        title={`Libre del ${formatFecha(h.desde)} al ${formatFecha(h.hasta)} (${h.noches} noches). Tocá para cargar una reserva`}
                        className="absolute top-0 bottom-0 flex items-center justify-center rounded-md text-[0.7em] font-semibold text-costa-esmeralda/70 hover:bg-costa-esmeralda/10 hover:text-costa-esmeralda transition-colors"
                        style={{ left: pct(h.inicio), width: pct(h.noches) }}>
                        {h.noches >= 4 && `${h.noches} libres`}
                      </Link>
                    ))}
                    {c.bloques.map(b => (
                      <Link key={String(b.reserva.id)} href={`/admin/reservas/${b.reserva.id}/cobros${demoQ}`}
                        title={`${b.reserva.inquilinos?.nombre?.trim() || 'Reserva'} · ${formatFecha(b.reserva.fecha_inicio)} al ${formatFecha(b.reserva.fecha_fin)}${b.confirmada ? '' : ' · sin confirmar'}`}
                        className={`absolute top-1 bottom-1 rounded px-1.5 overflow-hidden whitespace-nowrap text-[0.7em] leading-tight flex flex-col justify-center transition-opacity hover:opacity-85 ${b.confirmada ? 'bg-costa-esmeralda text-white' : 'bg-costa-superficie text-red-700 border-2 border-dashed border-red-600'}`}
                        style={{ left: pct(b.inicio), width: `calc(${pct(b.noches)} - 2px)` }}>
                        <span className="font-semibold truncate">{(b.reserva.inquilinos?.nombre || '').trim().split(/\s+/).slice(-1)[0] || 'Reserva'}</span>
                        <span className="opacity-80 truncate">{ddmm(b.reserva.fecha_inicio)}–{ddmm(b.reserva.fecha_fin)}</span>
                      </Link>
                    ))}
                    {posHoy !== null && <span className="absolute -top-1 -bottom-1 w-0.5 bg-costa-coral-dark pointer-events-none" style={{ left: pct(posHoy) }} title="Hoy" />}
                  </div>
                  <span className="text-right font-bold text-costa-esmeralda tabular-nums">{Math.round(c.nochesConfirmadas / totalNoches * 100)}%</span>
                </div>
              ))}
              <div className="grid grid-cols-[110px_1fr_56px] gap-3 text-[0.7em] text-costa-gris">
                <span />
                <div className="relative h-4">
                  {marcas.map(m => <span key={m.label} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(m.pos) }}>{m.label}</span>)}
                </div>
                <span />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-costa-gris">
            <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 h-2.5 rounded-sm bg-costa-esmeralda" />Confirmada</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 h-2.5 rounded-sm border-2 border-dashed border-red-600" />Sin confirmar</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 h-2.5 rounded-sm bg-costa-esmeralda-suave" />Libre</span>
            {posHoy !== null && <span className="flex items-center gap-1.5"><i className="inline-block w-0.5 h-3 bg-costa-coral-dark" />Hoy</span>}
          </div>
          {huecoMayor && (
            <p className="mt-3 rounded-lg bg-costa-coral/10 px-3 py-2 text-sm text-costa-navy">
              <span className="font-semibold text-costa-coral-dark">{huecoMayor.casa?.nombre}</span> tiene {huecoMayor.noches} noches libres seguidas, del {formatFecha(huecoMayor.desde)} al {formatFecha(huecoMayor.hasta)}.{' '}
              <Link href={`/admin/reservas?nueva=1&propiedad=${huecoMayor.casa?.id}&desde=${huecoMayor.desde}&hasta=${huecoMayor.hasta}${demoAmp}`} className="font-semibold text-costa-esmeralda underline underline-offset-2">Cargar una reserva</Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reservas de la temporada */}
      <Card>
        <CardHeader className="flex items-baseline justify-between gap-2">
          <CardTitle>Reservas de la temporada</CardTitle>
          <span className="text-xs text-costa-gris">{listado.length} reserva{listado.length !== 1 ? 's' : ''} · ingreso entre el {formatFecha(desde)} y el {formatFecha(hasta)}</span>
        </CardHeader>
        <CardContent className="p-0">
          {listado.length === 0 ? (
            <p className="py-10 text-center text-costa-gris">Todavía no hay reservas en esta temporada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-costa-arena/70 border-b border-costa-borde">
                  <tr className="text-left text-xs text-costa-gris">
                    <th className="px-4 py-2 font-semibold">Casa</th>
                    <th className="px-4 py-2 font-semibold">Huésped</th>
                    <th className="px-4 py-2 font-semibold">Ingreso</th>
                    <th className="px-4 py-2 font-semibold">Salida</th>
                    <th className="px-4 py-2 font-semibold text-right">Noches</th>
                    <th className="px-4 py-2 font-semibold text-right">Total</th>
                    <th className="px-4 py-2 font-semibold text-right">Cobrado</th>
                    <th className="px-4 py-2 font-semibold text-right">Saldo</th>
                    <th className="px-4 py-2 font-semibold">Estado</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {listado.map(r => {
                    const m = montosReserva(r, cobros)
                    const debe = monedasCon(m.saldo).some(x => m.saldo[x] > 0)
                    const vence = vencimientoSaldo(r.fecha_inicio)
                    const pendiente = r.estado === 'pendiente'
                    const estado = pendiente
                      ? { texto: 'Sin confirmar', clase: 'bg-red-50 text-red-700' }
                      : r.estado === 'cerrada'
                        ? { texto: 'Cerrada', clase: 'bg-costa-arena text-costa-gris' }
                        : debe
                          ? vence < hoy
                            ? { texto: `Saldo vencido ${ddmm(vence)}`, clase: 'bg-red-50 text-red-700' }
                            : { texto: `Saldo vence ${ddmm(vence)}`, clase: 'bg-costa-coral/15 text-costa-coral-dark' }
                          : { texto: 'Pagada', clase: 'bg-costa-olivo/15 text-costa-olivo' }
                    return (
                      <tr key={r.id} className="border-b border-costa-borde/60 last:border-0 hover:bg-costa-arena/40">
                        <td className="px-4 py-2.5 font-semibold text-costa-navy">{r.propiedades?.nombre}{r.propiedades?.lote && <span className="block text-xs font-normal text-costa-gris">Lote {r.propiedades.lote}</span>}</td>
                        <td className="px-4 py-2.5 text-costa-navy">{r.inquilinos?.nombre?.trim() || '-'}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatFecha(r.fecha_inicio)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatFecha(r.fecha_fin)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{nochesEntre(r.fecha_inicio, r.fecha_fin)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${pendiente ? 'text-costa-gris' : 'text-costa-navy'}`}><Montos montos={m.total} /></td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-costa-olivo">{pendiente ? '–' : <Montos montos={m.cobrado} vacio="–" />}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap text-costa-coral-dark font-semibold">{pendiente ? <span className="text-costa-gris font-normal">–</span> : <Montos montos={Object.fromEntries(Object.entries(m.saldo).filter(([, v]) => v > 0))} vacio="–" />}</td>
                        <td className="px-4 py-2.5"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.clase}`}>{estado.texto}</span></td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/admin/reservas/${r.id}/cobros${demoQ}`} className="inline-flex items-center gap-1 rounded border border-costa-borde px-2 py-1 text-xs font-semibold text-costa-esmeralda hover:bg-costa-esmeralda-suave">
                            <Wallet size={13} /> Cobros
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function TemporadaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-costa-gris">Cargando...</div>}>
      <TemporadaContent />
    </Suspense>
  )
}
