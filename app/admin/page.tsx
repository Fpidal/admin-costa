'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { demoReservas, demoPropiedades, demoCobros, demoGastos } from '@/lib/demoData'
import { formatFecha, aFechaISO } from '@/lib/fechas'
import {
  filtrarReservas, monedasCon, rangoTemporada, temporadaDe, temporadaActual, etiquetaTemporada,
  nochesEntre, FILTRO_INICIAL, type FiltroReservas, type PorMoneda,
} from '@/lib/resumenReservas'
import { metricas, nochesPorMes, demandaTemporada, nochesDe, MESES_CORTOS, type ReservaEst } from '@/lib/estadisticas'

// Tablero de Resumen: cuánto rinde cada temporada, qué meses y fechas se
// piden más y cómo se compara una casa con la otra.

// Un color fijo por casa, en el orden de la lista (validado para daltonismo)
const COLORES_CASA = ['#009480', '#c8692b', '#5b6ad0']
const COLOR_DEMANDA = '#009480'

interface Propiedad { id: string; nombre: string; lote: string | null }
interface Reserva extends ReservaEst {
  propiedades?: { nombre: string }
  inquilinos?: { nombre: string }
}
interface Cobro { reserva_id: number | string; monto: number; moneda: string; concepto: string; aplicar_a: string }
interface Gasto { id: number | string; concepto: string; monto: number; fecha: string | null; fecha_vencimiento: string | null; pagado: boolean; propiedad_id: string | null }

const importe = (v: number, moneda: string) =>
  `${moneda === 'USD' ? 'U$D' : '$'} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))}`
const importes = (o: PorMoneda, vacio = '–') => monedasCon(o).map(m => importe(o[m], m)).join(' + ') || vacio
// Para los indicadores: el dólar como cifra principal y los pesos debajo
const principal = (o: PorMoneda) => importe(o.USD || 0, 'USD')
const enPesos = (o: PorMoneda) => (Math.round(o.ARS || 0) > 0 ? `+ ${importe(o.ARS, 'ARS')}` : '')
const soloPositivos = (o: PorMoneda) => Object.fromEntries(Object.entries(o).filter(([, v]) => v > 0))

function Tile({ titulo, valor, detalle, tono = 'text-costa-navy' }: { titulo: string; valor: string; detalle?: React.ReactNode; tono?: string }) {
  return (
    <div className="rounded-xl border border-costa-borde bg-costa-superficie px-4 py-3">
      <p className="text-xs text-costa-gris">{titulo}</p>
      <p className={`mt-0.5 text-lg font-bold leading-tight tabular-nums ${tono}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-costa-gris">{detalle}</p>}
    </div>
  )
}

function ResumenContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const demoQ = isDemo ? '?demo=true' : ''
  const { userId } = useAuth()

  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroReservas>({ ...FILTRO_INICIAL, tipo: 'temporada', valor: String(temporadaActual()) })

  useEffect(() => {
    if (isDemo) {
      setReservas(demoReservas as unknown as Reserva[])
      setCobros(demoCobros as unknown as Cobro[])
      setPropiedades(demoPropiedades.map(p => ({ id: p.id, nombre: p.nombre, lote: null })))
      setGastos(demoGastos as unknown as Gasto[])
      setLoading(false)
      return
    }
    if (!userId) return
    async function cargar() {
      const [r, c, p, g] = await Promise.all([
        supabase.from('reservas').select('*, propiedades(nombre), inquilinos(nombre)').eq('user_id', userId).is('eliminado_at', null).order('fecha_inicio'),
        supabase.from('cobros').select('reserva_id, monto, moneda, concepto, aplicar_a, reservas!inner(eliminado_at)').eq('user_id', userId).is('reservas.eliminado_at', null),
        supabase.from('propiedades').select('id, nombre, lote').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
        supabase.from('gastos').select('id, concepto, monto, fecha, fecha_vencimiento, pagado, propiedad_id').eq('user_id', userId).is('eliminado_at', null),
      ])
      if (r.data) setReservas(r.data)
      if (c.data) setCobros(c.data)
      if (p.data) setPropiedades(p.data)
      if (g.data) setGastos(g.data)
      setLoading(false)
    }
    cargar()
  }, [isDemo, userId])

  if (loading) return <div className="flex items-center justify-center h-64 text-costa-gris">Cargando...</div>

  const hoy = aFechaISO(new Date())
  const ids = propiedades.map(p => String(p.id))
  const colorDe = (id: string) => COLORES_CASA[ids.indexOf(id) % COLORES_CASA.length]
  const nombreDe = (id: string) => propiedades.find(p => String(p.id) === id)?.nombre || ''

  // Opciones del período
  const temporadas = Array.from(new Set([temporadaActual(), ...reservas.map(r => temporadaDe(r.fecha_inicio)).filter((t): t is number => t !== null)])).sort((a, b) => b - a)
  const anios = Array.from(new Set([new Date().getFullYear(), ...reservas.map(r => Number(r.fecha_inicio.slice(0, 4)))])).sort((a, b) => b - a)
  const esTemporada = filtro.tipo === 'temporada' && !!filtro.valor
  const rango = esTemporada ? rangoTemporada(Number(filtro.valor)) : null
  const periodoTexto = esTemporada ? etiquetaTemporada(Number(filtro.valor)) : filtro.tipo === 'anio' ? `Año ${filtro.valor}` : 'Todas las reservas'

  // Reservas del período (por fecha de ingreso). Las estadísticas usan las
  // confirmadas y cerradas; las pendientes se cuentan aparte
  const delPeriodo = filtrarReservas(reservas, filtro).filter(r => r.estado !== 'cancelada')
  const firmes = delPeriodo.filter(r => r.estado !== 'pendiente')
  const pendientes = delPeriodo.filter(r => r.estado === 'pendiente')
  const total = metricas(firmes, cobros)
  const porCasa = ids.map(id => metricas(firmes.filter(r => String(r.propiedad_id) === id), cobros, id))
  const pctCobrado = total.total.USD ? Math.round(((total.cobrado.USD || 0) / total.total.USD) * 100) : null

  // Ocupación (solo tiene sentido en una temporada: noches dentro del 15/12–20/02)
  const nochesTemporada = rango ? nochesEntre(rango.desde, rango.hasta) : 0
  const nochesEnRango = (rs: Reserva[]) => rango ? rs.reduce((a, r) => a + nochesDe(r).filter(n => n >= rango.desde && n < rango.hasta).length, 0) : 0
  const ocupacion = rango && ids.length ? Math.round((nochesEnRango(firmes) / (nochesTemporada * ids.length)) * 100) : null
  const ocupacionCasa = (id: string) => rango ? Math.round((nochesEnRango(firmes.filter(r => String(r.propiedad_id) === id)) / nochesTemporada) * 100) : null

  // Noches por mes: en una temporada, dic-ene-feb; si no, los 12 meses
  const meses = esTemporada ? [11, 0, 1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const dentroPeriodo = rango ? (n: string) => n >= rango.desde && n < rango.hasta : filtro.tipo === 'anio' ? (n: string) => n.startsWith(filtro.valor) : undefined
  const porMes = nochesPorMes(firmes, ids, meses, dentroPeriodo)
  const totalesMes = porMes.map(f => ({ mes: f.mes as string, noches: ids.reduce((a, id) => a + (f[id] as number), 0) }))
  const conNoches = totalesMes.filter(m => m.noches > 0)
  const mesFuerte = conNoches.length ? conNoches.reduce((a, b) => (b.noches > a.noches ? b : a)) : null
  // El más flojo entre los meses que tuvieron reservas (los vacíos no dicen nada)
  const mesFlojo = conNoches.length > 1 ? conNoches.reduce((a, b) => (b.noches < a.noches ? b : a)) : null

  // Demanda día por día en temporada alta (la elegida, o todas las del período)
  const temporadasDemanda = esTemporada ? [Number(filtro.valor)] : Array.from(new Set(delPeriodo.map(r => temporadaDe(r.fecha_inicio)).filter((t): t is number => t !== null)))
  const demanda = demandaTemporada(reservas.filter(r => r.estado !== 'cancelada'), ids, temporadasDemanda)
  // Semanas más y menos pedidas (promedio móvil de 7 días)
  const semanas = demanda.length >= 7 ? demanda.slice(0, demanda.length - 6).map((_, i) => ({
    desde: demanda[i].dia, hasta: demanda[i + 6].dia,
    prom: Math.round(demanda.slice(i, i + 7).reduce((a, d) => a + d.ocupacion, 0) / 7),
  })) : []
  const semanaTop = semanas.length ? semanas.reduce((a, b) => (b.prom > a.prom ? b : a)) : null
  const semanaFloja = semanas.length ? semanas.reduce((a, b) => (b.prom < a.prom ? b : a)) : null

  // Gastos pagados del período (por fecha del gasto)
  const enPeriodo = (iso: string | null) => {
    if (!iso) return false
    if (rango) return iso >= rango.desde && iso <= rango.hasta
    if (filtro.tipo === 'anio') return iso.startsWith(filtro.valor)
    return true
  }
  const gastosPagados = gastos.filter(g => g.pagado && enPeriodo(g.fecha || g.fecha_vencimiento))
  const gastosCasa = (id: string) => gastosPagados.filter(g => String(g.propiedad_id) === id).reduce((a, g) => a + (g.monto || 0), 0)

  const proximas = reservas.filter(r => r.estado !== 'cancelada' && r.estado !== 'cerrada' && r.fecha_inicio.slice(0, 10) >= hoy).slice(0, 5)
  const gastosPendientes = gastos.filter(g => !g.pagado).sort((a, b) => (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || '')).slice(0, 5)

  const filasComparacion: { label: string; valor: (i: number, id: string) => string }[] = [
    { label: 'Reservas', valor: i => String(porCasa[i].reservas) },
    { label: 'Noches vendidas', valor: i => String(porCasa[i].noches) },
    ...(rango ? [{ label: 'Ocupación en temporada', valor: (_: number, id: string) => `${ocupacionCasa(id)}%` }] : []),
    { label: 'Tarifa promedio por noche', valor: i => porCasa[i].tarifaPromedio ? importe(porCasa[i].tarifaPromedio as number, 'USD') : '–' },
    { label: 'Total reservado', valor: i => importes(porCasa[i].total) },
    { label: 'Cobrado', valor: i => importes(porCasa[i].cobrado) },
    { label: 'Pendiente de cobro', valor: i => importes(Object.fromEntries(Object.entries(porCasa[i].saldo).filter(([, v]) => v > 0))) },
    { label: 'Estadía promedio', valor: i => porCasa[i].estadiaPromedio ? `${porCasa[i].estadiaPromedio} noches` : '–' },
    { label: 'Personas por reserva', valor: i => porCasa[i].personasPromedio ? String(porCasa[i].personasPromedio) : '–' },
    { label: 'Anticipación al reservar', valor: i => porCasa[i].anticipacionPromedio !== null ? `${porCasa[i].anticipacionPromedio} días` : '–' },
    { label: 'Gastos pagados', valor: (_: number, id: string) => { const g = gastosCasa(id); return g ? importe(g, 'ARS') : '–' } },
  ]

  const selectClase = 'rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-semibold text-costa-navy'
  const ejeTexto = { fontSize: 11, fill: '#6b7c93' }

  return (
    <div className="vista-compacta">
      <PageHeader title="Resumen" description={`${periodoTexto} · ${propiedades.map(p => p.nombre).join(', ')}`}>
        <select className={selectClase} value={filtro.tipo} aria-label="Período"
          onChange={e => {
            const tipo = e.target.value as FiltroReservas['tipo']
            setFiltro({ ...FILTRO_INICIAL, tipo, valor: tipo === 'temporada' ? String(temporadas[0]) : tipo === 'anio' ? String(anios[0]) : '' })
          }}>
          <option value="temporada">Temporada</option>
          <option value="anio">Año</option>
          <option value="todo">Todo</option>
        </select>
        {filtro.tipo !== 'todo' && (
          <select className={selectClase} value={filtro.valor} aria-label={filtro.tipo === 'temporada' ? 'Temporada' : 'Año'} onChange={e => setFiltro({ ...filtro, valor: e.target.value })}>
            {(filtro.tipo === 'temporada' ? temporadas : anios).map(a => (
              <option key={a} value={String(a)}>{filtro.tipo === 'temporada' ? `${a}/${String(a + 1).slice(-2)}` : a}</option>
            ))}
          </select>
        )}
      </PageHeader>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Tile titulo="Total reservado" valor={principal(total.total)}
          detalle={<>{enPesos(total.total) && <span className="block">{enPesos(total.total)}</span>}{pendientes.length ? <span className="text-red-700 font-semibold">+ {pendientes.length} sin confirmar</span> : `${total.reservas} reservas`}</>} />
        <Tile titulo="Cobrado" valor={principal(total.cobrado)} tono="text-costa-olivo"
          detalle={<>{enPesos(total.cobrado) && <span className="block">{enPesos(total.cobrado)}</span>}{pctCobrado !== null ? `${pctCobrado}% del total` : ''}</>} />
        <Tile titulo="Pendiente de cobro" valor={principal(soloPositivos(total.saldo))} tono="text-costa-coral-dark"
          detalle={enPesos(soloPositivos(total.saldo)) || undefined} />
        {ocupacion !== null
          ? <Tile titulo="Ocupación" valor={`${ocupacion}%`} detalle={`${nochesEnRango(firmes)} de ${nochesTemporada * ids.length} noches`} />
          : <Tile titulo="Noches vendidas" valor={String(total.noches)} detalle={`${total.reservas} reservas`} />}
        <Tile titulo="Tarifa promedio" valor={total.tarifaPromedio ? importe(total.tarifaPromedio, 'USD') : '–'} detalle="por noche" />
        <Tile titulo="Estadía promedio" valor={total.estadiaPromedio ? `${total.estadiaPromedio} noches` : '–'}
          detalle={total.anticipacionPromedio !== null ? `reservan con ${total.anticipacionPromedio} días de anticipación` : undefined} />
      </div>

      {firmes.length === 0 ? (
        <Card className="mb-4"><CardContent className="py-10 text-center text-costa-gris">No hay reservas confirmadas en {periodoTexto.toLowerCase()}.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            {/* Noches por mes y por casa */}
            <Card>
              <CardHeader><CardTitle>Noches ocupadas por mes</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64" role="img" aria-label="Noches ocupadas por mes y por casa">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porMes} barGap={2} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="#e8dfd2" vertical={false} />
                      <XAxis dataKey="mes" tick={ejeTexto} axisLine={false} tickLine={false} />
                      <YAxis tick={ejeTexto} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: 'rgba(20,80,76,0.06)' }} contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd2', fontSize: 12 }}
                        formatter={(v, name) => [`${v} noches`, nombreDe(String(name))]} />
                      <Legend formatter={(v) => <span style={{ color: '#1b2c42', fontSize: 12 }}>{nombreDe(String(v))}</span>} iconType="circle" iconSize={8} />
                      {ids.map(id => <Bar key={id} dataKey={id} fill={colorDe(id)} radius={[4, 4, 0, 0]} maxBarSize={36} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {mesFuerte && (
                  <p className="mt-2 text-sm text-costa-navy">
                    Mes más fuerte: <span className="font-bold">{mesFuerte.mes}</span> ({mesFuerte.noches} noches)
                    {mesFlojo && mesFlojo.mes !== mesFuerte.mes && <> · más flojo: <span className="font-bold">{mesFlojo.mes}</span> ({mesFlojo.noches} noches)</>}
                    {!esTemporada && <span className="text-costa-gris"> · sumando {filtro.tipo === 'anio' ? `el año ${filtro.valor}` : 'todos los años'}</span>}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Casa contra casa */}
            <Card>
              <CardHeader><CardTitle>Casa contra casa</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-costa-borde">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-costa-gris" />
                        {ids.map(id => (
                          <th key={id} className="px-4 py-2 text-right text-sm font-bold text-costa-navy whitespace-nowrap">
                            <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5 align-middle" style={{ background: colorDe(id) }} />{nombreDe(id)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filasComparacion.map(f => (
                        <tr key={f.label} className="border-b border-costa-borde/50 last:border-0">
                          <td className="px-4 py-2 text-costa-gris whitespace-nowrap">{f.label}</td>
                          {ids.map((id, i) => <td key={id} className="px-4 py-2 text-right font-semibold text-costa-navy tabular-nums whitespace-nowrap">{f.valor(i, id)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demanda en temporada alta */}
          {demanda.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle>Qué fechas se piden más</CardTitle>
                <span className="text-xs text-costa-gris">
                  % de casas ocupadas cada día del 15/12 al 20/02{temporadasDemanda.length > 1 ? `, promedio de ${temporadasDemanda.length} temporadas` : ''}
                </span>
              </CardHeader>
              <CardContent>
                <div className="h-48" role="img" aria-label="Ocupación día por día en temporada alta">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demanda} barCategoryGap={1} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="#e8dfd2" vertical={false} />
                      <XAxis dataKey="dia" tick={ejeTexto} axisLine={false} tickLine={false} interval={6} />
                      <YAxis tick={ejeTexto} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 50, 100]} unit="%" />
                      <Tooltip cursor={{ fill: 'rgba(20,80,76,0.06)' }} contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd2', fontSize: 12 }}
                        formatter={(v) => [`${v}% ocupado`, 'Confirmadas']} labelFormatter={(l) => `Noche del ${l}`} />
                      <Bar dataKey="ocupacion" fill={COLOR_DEMANDA} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {semanaTop && semanaFloja && (
                  <p className="mt-2 text-sm text-costa-navy">
                    Semana más pedida: <span className="font-bold">{semanaTop.desde} al {semanaTop.hasta}</span> ({semanaTop.prom}% ocupado)
                    {' · '}más floja: <span className="font-bold">{semanaFloja.desde} al {semanaFloja.hasta}</span> ({semanaFloja.prom}%)
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Próximas entradas y gastos pendientes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-baseline justify-between"><CardTitle>Próximas entradas</CardTitle><Link href={`/admin/temporada${demoQ}`} className="text-xs font-semibold text-costa-esmeralda">Ver temporada</Link></CardHeader>
          <CardContent className="p-0">
            {proximas.length === 0 ? <p className="px-6 py-6 text-sm text-costa-gris">No hay ingresos próximos.</p> : (
              <ul className="divide-y divide-costa-borde/60">
                {proximas.map(r => (
                  <li key={String(r.id)}>
                    <Link href={`/admin/reservas/${r.id}/cobros${demoQ}`} className="flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-costa-arena/50">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorDe(String(r.propiedad_id)) }} />
                      <span className="w-24 shrink-0 font-semibold text-costa-navy truncate">{nombreDe(String(r.propiedad_id))}</span>
                      <span className="flex-1 min-w-0 truncate text-costa-navy">{r.inquilinos?.nombre?.trim() || '-'}</span>
                      <span className="shrink-0 tabular-nums text-costa-gris">{formatFecha(r.fecha_inicio)}</span>
                      {r.estado === 'pendiente' && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Sin confirmar</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-baseline justify-between"><CardTitle>Gastos pendientes</CardTitle><Link href={`/admin/gastos${demoQ}`} className="text-xs font-semibold text-costa-esmeralda">Ver gastos</Link></CardHeader>
          <CardContent className="p-0">
            {gastosPendientes.length === 0 ? <p className="px-6 py-6 text-sm text-costa-gris">No hay gastos pendientes.</p> : (
              <ul className="divide-y divide-costa-borde/60">
                {gastosPendientes.map(g => {
                  const vencido = !!g.fecha_vencimiento && g.fecha_vencimiento < hoy
                  return (
                    <li key={String(g.id)} className="flex items-center gap-3 px-6 py-2.5 text-sm">
                      <span className="flex-1 min-w-0 truncate text-costa-navy">{g.concepto}{g.propiedad_id && <span className="text-costa-gris"> · {nombreDe(String(g.propiedad_id))}</span>}</span>
                      {g.fecha_vencimiento && <span className={`shrink-0 tabular-nums ${vencido ? 'font-semibold text-red-700' : 'text-costa-gris'}`}>{vencido ? 'venció ' : 'vence '}{formatFecha(g.fecha_vencimiento)}</span>}
                      <span className="shrink-0 font-semibold tabular-nums text-costa-navy">{importe(g.monto || 0, 'ARS')}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResumenPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-costa-gris">Cargando...</div>}>
      <ResumenContent />
    </Suspense>
  )
}
