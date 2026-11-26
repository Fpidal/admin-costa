'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { metricas, nochesDe, type ReservaEst } from '@/lib/estadisticas'
import { filtrarReservas, rangoTemporada, temporadaDe, temporadaActual, nochesEntre, FILTRO_INICIAL } from '@/lib/resumenReservas'
import { precioEstadia } from '@/lib/preciosReglas'
import type { PriceRule } from '@/lib/priceRules'
import { obtenerFinesDeSemanaLargos } from '@/lib/calendarioArgentina'
import { aFechaISO } from '@/lib/fechas'

// Cómo fue cambiando cada temporada contra la anterior y, aparte, lo que se
// alquila fuera de temporada (fines de semana largos, Semana Santa, etc.).
// Las cifras usan reservas confirmadas y cerradas; las sin confirmar se
// muestran aparte para no inflar los números.

interface Casa { id: string; nombre: string; color: string }
interface CobroE { reserva_id: number | string; monto: number; moneda: string; concepto: string; aplicar_a: string }

const usd = (v: number) => `U$D ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))}`
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}%`
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const variacion = (hoy: number | null | undefined, antes: number | null | undefined) =>
  hoy && antes ? Math.round(((hoy - antes) / antes) * 100) : null

// Promedio por noche ponderado por noches (solo reservas en dólares con precio)
function precioPromedio(reservas: ReservaEst[], dentro: (noche: string) => boolean): number | null {
  let suma = 0, noches = 0
  reservas.forEach(r => {
    if ((r.moneda || 'USD') !== 'USD' || !(r.precio_noche || 0)) return
    const n = nochesDe(r).filter(dentro).length
    suma += n * Number(r.precio_noche); noches += n
  })
  return noches ? Math.round(suma / noches) : null
}

const MESES_TEMPORADA = [{ mm: '12', t: 'Diciembre' }, { mm: '01', t: 'Enero' }, { mm: '02', t: 'Febrero' }]

function Var({ v, apagado = false }: { v: number | null; apagado?: boolean }) {
  if (v === null) return <span className="text-costa-gris">–</span>
  return <span className={apagado ? 'text-costa-gris' : v >= 0 ? 'text-costa-esmeralda' : 'text-red-700'}>{pct(v)}</span>
}

const th = 'px-3 py-1.5 text-right font-semibold'
const td = 'px-3 py-2 text-right tabular-nums'

function Punto({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5 align-middle" style={{ background: color }} />
}

export function EvolucionTemporadas({ reservas, cobros, casas, reglas }: {
  reservas: ReservaEst[]
  cobros: CobroE[]
  casas: Casa[]
  reglas: PriceRule[]
}) {
  const hoy = aFechaISO(new Date())
  const vivas = reservas.filter(r => r.estado !== 'cancelada')
  const firmes = vivas.filter(r => r.estado !== 'pendiente')
  const pendientes = vivas.filter(r => r.estado === 'pendiente')
  const deCasa = (rs: ReservaEst[], id: string) => rs.filter(r => String(r.propiedad_id) === id)

  // ── Temporada alta ──────────────────────────────────────────────
  const temporadas = Array.from(new Set(vivas.map(r => temporadaDe(r.fecha_inicio)).filter((t): t is number => t !== null))).sort((a, b) => a - b)

  const datos = temporadas.map(t => {
    const rango = rangoTemporada(t)
    const enRango = (n: string) => n >= rango.desde && n < rango.hasta
    const nochesTemp = nochesEntre(rango.desde, rango.hasta)
    const filtro = { ...FILTRO_INICIAL, tipo: 'temporada' as const, valor: String(t) }
    const firmesT = filtrarReservas(firmes, filtro)
    const pendT = filtrarReservas(pendientes, filtro)
    const porCasa = casas.map(c => {
      const propias = deCasa(firmesT, c.id)
      const m = metricas(propias, cobros, c.id)
      const ocupadas = propias.reduce((a, r) => a + nochesDe(r).filter(enRango).length, 0)
      const sinConfirmar = deCasa(pendT, c.id).reduce((a, r) => a + nochesDe(r).filter(enRango).length, 0)
      const lista = precioEstadia(rango.desde, rango.hasta, reglas.filter(r => String(r.property_id) === c.id))
      return {
        casa: c, noches: m.noches, tarifa: m.tarifaPromedio, sinConfirmar,
        ocupacion: Math.round((ocupadas / nochesTemp) * 100),
        ocupacionConPend: Math.round(((ocupadas + sinConfirmar) / nochesTemp) * 100),
        total: m.total.USD || 0,
        lista: lista.precioPromedio || null,
        porMes: Object.fromEntries(MESES_TEMPORADA.map(({ mm }) => [mm, precioPromedio(propias, n => enRango(n) && n.slice(5, 7) === mm)])),
      }
    })
    return { t, etiqueta: `${t}/${String(t + 1).slice(-2)}`, enCurso: hoy <= rango.hasta, porCasa }
  })

  // ── Fuera de temporada (por año calendario de ingreso) ──────────
  const fueraFirmes = firmes.filter(r => temporadaDe(r.fecha_inicio) === null)
  const fueraPend = pendientes.filter(r => temporadaDe(r.fecha_inicio) === null)
  const aniosFuera = Array.from(new Set([...fueraFirmes, ...fueraPend].map(r => Number(r.fecha_inicio.slice(0, 4))))).sort((a, b) => a - b)
  const findes = new Map<number, ReturnType<typeof obtenerFinesDeSemanaLargos>>()
  const findeDe = (r: ReservaEst) => {
    const anio = Number(r.fecha_inicio.slice(0, 4))
    if (!findes.has(anio)) findes.set(anio, obtenerFinesDeSemanaLargos(anio))
    const ini = r.fecha_inicio.slice(0, 10), fin = r.fecha_fin.slice(0, 10)
    return findes.get(anio)!.find(f => f.fechaInicio < fin && f.fechaFin >= ini)?.nombre || null
  }
  const fuera = aniosFuera.map(anio => {
    const delAnio = (rs: ReservaEst[]) => rs.filter(r => r.fecha_inicio.startsWith(String(anio)))
    return {
      anio, enCurso: anio === new Date().getFullYear(),
      porCasa: casas.map(c => {
        const propias = deCasa(delAnio(fueraFirmes), c.id)
        const pend = deCasa(delAnio(fueraPend), c.id)
        const m = metricas(propias, cobros, c.id)
        return {
          casa: c, reservas: m.reservas, noches: m.noches, tarifa: m.tarifaPromedio, total: m.total.USD || 0,
          detalle: [...propias, ...pend].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)),
        }
      }).filter(p => p.detalle.length),
    }
  })

  if (!datos.length && !fuera.length) return null

  const anteriorT = (i: number, id: string) => (i > 0 ? datos[i - 1].porCasa.find(p => p.casa.id === id) : undefined)
  const anteriorF = (i: number, id: string) => (i > 0 ? fuera[i - 1].porCasa.find(p => p.casa.id === id) : undefined)
  const serie = datos.map(d => ({ etiqueta: d.etiqueta, ...Object.fromEntries(d.porCasa.map(p => [p.casa.id, p.tarifa])) }))
  const ejeTexto = { fontSize: 11, fill: '#6b7c93' }
  // Precio por mes: las últimas 4 temporadas, de la más vieja a la más nueva
  const ultimas = datos.slice(-4)

  return (
    <div className="space-y-4">
      {datos.length > 0 && (
        <div className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
          <h3 className="text-base font-bold text-costa-esmeralda">Evolución por temporada</h3>
          <p className="text-xs text-costa-gris mt-1 mb-3">
            Del 15/12 al 20/02, con reservas confirmadas y cerradas; las sin confirmar van aparte. Lista: el promedio por noche de Precios alquileres. La temporada en curso todavía se está vendiendo: su variación del total es parcial.
          </p>

          {datos.length > 1 && (
            <div className="h-56 mb-4" role="img" aria-label="Precio cobrado por noche en cada temporada, por casa">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 6, right: 16, left: -6, bottom: 0 }}>
                  <CartesianGrid stroke="#e8dfd2" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={ejeTexto} axisLine={false} tickLine={false} />
                  <YAxis tick={ejeTexto} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e8dfd2', fontSize: 12 }}
                    formatter={(v, id) => [v ? `${usd(Number(v))} por noche` : '–', casas.find(c => c.id === String(id))?.nombre || '']}
                    labelFormatter={l => `Temporada ${l}`} />
                  <Legend formatter={v => <span style={{ color: '#1b2c42', fontSize: 12 }}>{casas.find(c => c.id === String(v))?.nombre}</span>} iconType="circle" iconSize={8} />
                  {casas.map(c => (
                    <Line key={c.id} dataKey={c.id} stroke={c.color} strokeWidth={2} connectNulls
                      dot={{ r: 4, fill: c.color, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-costa-borde text-[0.7em] uppercase tracking-wider text-costa-gris">
                  <th className="px-3 py-1.5 text-left font-semibold">Casa</th>
                  <th className={th}>Lista x noche</th>
                  <th className={th}>Cobrado x noche</th>
                  <th className={th}>Var. precio</th>
                  <th className={th}>Noches</th>
                  <th className={th}>Sin confirmar</th>
                  <th className={th}>Ocupación</th>
                  <th className={th}>Total</th>
                  <th className={th}>Var. total</th>
                </tr>
              </thead>
              <tbody>
                {[...datos].reverse().map(d => {
                  const i = datos.indexOf(d)
                  return [
                    <tr key={`t${d.t}`} className="bg-costa-arena/50">
                      <td colSpan={9} className="px-3 py-1.5 text-xs font-bold text-costa-navy">
                        Temporada {d.etiqueta}{d.enCurso && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">en curso</span>}
                      </td>
                    </tr>,
                    ...d.porCasa.map(p => {
                      const a = anteriorT(i, p.casa.id)
                      return (
                        <tr key={`${d.t}-${p.casa.id}`} className="border-b border-costa-borde/50">
                          <td className="px-3 py-2 text-costa-navy whitespace-nowrap"><Punto color={p.casa.color} />{p.casa.nombre}</td>
                          <td className={`${td} text-costa-gris`}>{p.lista ? usd(p.lista) : '–'}</td>
                          <td className={`${td} font-semibold text-costa-navy`}>{p.tarifa ? usd(p.tarifa) : '–'}</td>
                          <td className={td}><Var v={variacion(p.tarifa, a?.tarifa)} /></td>
                          <td className={`${td} text-costa-navy`}>{p.noches || '–'}</td>
                          <td className={`${td} ${p.sinConfirmar ? 'text-amber-700 font-semibold' : 'text-costa-gris'}`}>{p.sinConfirmar ? `${p.sinConfirmar} noches` : '–'}</td>
                          <td className={`${td} text-costa-navy`}>
                            {p.noches ? `${p.ocupacion}%` : '–'}
                            {p.sinConfirmar > 0 && <span className="block text-[0.75em] text-amber-700">{p.ocupacionConPend}% con sin confirmar</span>}
                          </td>
                          <td className={`${td} font-semibold text-costa-navy`}>{p.total ? usd(p.total) : '–'}</td>
                          <td className={td}>
                            <Var v={variacion(p.total, a?.total)} apagado={d.enCurso} />
                            {d.enCurso && a?.total ? <span className="block text-[0.75em] text-costa-gris">parcial</span> : null}
                          </td>
                        </tr>
                      )
                    }),
                  ]
                })}
              </tbody>
            </table>
          </div>

          {/* Precio cobrado por noche, mes por mes */}
          <h4 className="mt-5 mb-1 text-sm font-bold text-costa-navy">Precio cobrado por noche, mes por mes</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-costa-borde text-[0.7em] uppercase tracking-wider text-costa-gris">
                  <th className="px-3 py-1.5 text-left font-semibold">Casa</th>
                  <th className="px-3 py-1.5 text-left font-semibold">Mes</th>
                  {ultimas.map(d => <th key={d.t} className={th}>{d.etiqueta}</th>)}
                  {ultimas.length > 1 && <th className={th}>Var.</th>}
                </tr>
              </thead>
              <tbody>
                {casas.map(c => MESES_TEMPORADA.map(({ mm, t }, k) => {
                  const valores = ultimas.map(d => d.porCasa.find(p => p.casa.id === c.id)?.porMes[mm] ?? null)
                  if (valores.every(v => v === null)) return null
                  const n = valores.length
                  return (
                    <tr key={`${c.id}-${mm}`} className={`border-b border-costa-borde/50 ${k === 0 ? 'border-t border-costa-borde' : ''}`}>
                      <td className="px-3 py-1.5 text-costa-navy whitespace-nowrap">{k === 0 && <><Punto color={c.color} />{c.nombre}</>}</td>
                      <td className="px-3 py-1.5 text-costa-gris">{t}</td>
                      {valores.map((v, j) => <td key={j} className={`${td} py-1.5 ${j === n - 1 ? 'font-semibold text-costa-navy' : 'text-costa-gris'}`}>{v ? usd(v) : '–'}</td>)}
                      {n > 1 && <td className={`${td} py-1.5`}><Var v={variacion(valores[n - 1], valores[n - 2])} /></td>}
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {fuera.length > 0 && (
        <div className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
          <h3 className="text-base font-bold text-costa-esmeralda">Fuera de temporada</h3>
          <p className="text-xs text-costa-gris mt-1 mb-3">
            Reservas que entran entre el 21/02 y el 14/12, por año. Al lado de cada una, el fin de semana largo en el que cayó.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-costa-borde text-[0.7em] uppercase tracking-wider text-costa-gris">
                  <th className="px-3 py-1.5 text-left font-semibold">Casa</th>
                  <th className={th}>Reservas</th>
                  <th className={th}>Noches</th>
                  <th className={th}>Cobrado x noche</th>
                  <th className={th}>Var. precio</th>
                  <th className={th}>Total</th>
                  <th className={th}>Var. total</th>
                </tr>
              </thead>
              <tbody>
                {[...fuera].reverse().map(f => {
                  const i = fuera.indexOf(f)
                  return [
                    <tr key={`a${f.anio}`} className="bg-costa-arena/50">
                      <td colSpan={7} className="px-3 py-1.5 text-xs font-bold text-costa-navy">
                        {f.anio}{f.enCurso && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">en curso</span>}
                      </td>
                    </tr>,
                    ...f.porCasa.map(p => {
                      const a = anteriorF(i, p.casa.id)
                      return (
                        <tr key={`${f.anio}-${p.casa.id}`} className="border-b border-costa-borde/50 align-top">
                          <td className="px-3 py-2 text-costa-navy">
                            <span className="whitespace-nowrap"><Punto color={p.casa.color} />{p.casa.nombre}</span>
                            <ul className="mt-1 space-y-0.5 text-xs text-costa-gris">
                              {p.detalle.map(r => {
                                const finde = findeDe(r)
                                return (
                                  <li key={String(r.id)}>
                                    {dm(r.fecha_inicio)} al {dm(r.fecha_fin)} · {nochesEntre(r.fecha_inicio, r.fecha_fin)} noches
                                    {r.precio_noche ? ` · ${r.moneda === 'ARS' ? '$' : 'U$D'} ${Number(r.precio_noche).toLocaleString('es-AR')}` : ''}
                                    {finde && <span className="text-costa-navy"> · {finde}</span>}
                                    {r.estado === 'pendiente' && <span className="ml-1 text-amber-700 font-semibold">sin confirmar</span>}
                                  </li>
                                )
                              })}
                            </ul>
                          </td>
                          <td className={`${td} text-costa-navy`}>{p.reservas || '–'}</td>
                          <td className={`${td} text-costa-navy`}>{p.noches || '–'}</td>
                          <td className={`${td} font-semibold text-costa-navy`}>{p.tarifa ? usd(p.tarifa) : '–'}</td>
                          <td className={td}><Var v={variacion(p.tarifa, a?.tarifa)} /></td>
                          <td className={`${td} font-semibold text-costa-navy`}>{p.total ? usd(p.total) : '–'}</td>
                          <td className={td}>
                            <Var v={variacion(p.total, a?.total)} apagado={f.enCurso} />
                            {f.enCurso && a?.total ? <span className="block text-[0.75em] text-costa-gris">parcial</span> : null}
                          </td>
                        </tr>
                      )
                    }),
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
