'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { metricas, nochesDe, type ReservaEst } from '@/lib/estadisticas'
import { filtrarReservas, rangoTemporada, temporadaDe, nochesEntre, FILTRO_INICIAL } from '@/lib/resumenReservas'
import { precioEstadia } from '@/lib/preciosReglas'
import type { PriceRule } from '@/lib/priceRules'

// Cómo fue cambiando cada temporada contra la anterior: precio de lista
// (Precios alquileres), lo que se cobró en promedio por noche, noches vendidas,
// ocupación del 15/12 al 20/02 y total reservado en dólares.

interface Casa { id: string; nombre: string; color: string }
interface CobroE { reserva_id: number | string; monto: number; moneda: string; concepto: string; aplicar_a: string }

const usd = (v: number) => `U$D ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))}`
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}%`

export function EvolucionTemporadas({ reservas, cobros, casas, reglas }: {
  reservas: ReservaEst[]
  cobros: CobroE[]
  casas: Casa[]
  reglas: PriceRule[]
}) {
  const validas = reservas.filter(r => r.estado !== 'cancelada' && r.estado !== 'pendiente')
  const temporadas = Array.from(new Set(validas.map(r => temporadaDe(r.fecha_inicio)).filter((t): t is number => t !== null))).sort((a, b) => a - b)

  const datos = temporadas.map(t => {
    const rango = rangoTemporada(t)
    const nochesTemp = nochesEntre(rango.desde, rango.hasta)
    const delaTemp = filtrarReservas(validas, { ...FILTRO_INICIAL, tipo: 'temporada', valor: String(t) })
    const porCasa = casas.map(c => {
      const propias = delaTemp.filter(r => String(r.propiedad_id) === c.id)
      const m = metricas(propias, cobros, c.id)
      const enRango = propias.reduce((a, r) => a + nochesDe(r).filter(n => n >= rango.desde && n < rango.hasta).length, 0)
      const lista = precioEstadia(rango.desde, rango.hasta, reglas.filter(r => String(r.property_id) === c.id))
      return {
        casa: c, noches: m.noches, reservas: m.reservas, tarifa: m.tarifaPromedio,
        ocupacion: Math.round((enRango / nochesTemp) * 100),
        total: m.total.USD || 0,
        lista: lista.precioPromedio || null,
      }
    })
    return { t, etiqueta: `${t}/${String(t + 1).slice(-2)}`, porCasa }
  })

  if (!datos.length) return null

  const anterior = (i: number, casaId: string) => (i > 0 ? datos[i - 1].porCasa.find(p => p.casa.id === casaId) : undefined)
  const variacion = (hoy: number | null, antes: number | null | undefined) =>
    hoy && antes ? Math.round(((hoy - antes) / antes) * 100) : null

  const serie = datos.map(d => ({ etiqueta: d.etiqueta, ...Object.fromEntries(d.porCasa.map(p => [p.casa.id, p.tarifa])) }))
  const ejeTexto = { fontSize: 11, fill: '#6b7c93' }
  const Var = ({ v }: { v: number | null }) => v === null
    ? <span className="text-costa-gris">–</span>
    : <span className={v >= 0 ? 'text-costa-esmeralda' : 'text-red-700'}>{pct(v)}</span>

  return (
    <div className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
      <h3 className="text-base font-bold text-costa-esmeralda">Evolución por temporada</h3>
      <p className="text-xs text-costa-gris mt-1 mb-3">
        Cada temporada contra la anterior (del 15/12 al 20/02, reservas confirmadas). Lista: el promedio por noche de Precios alquileres; cobrado: lo que se cerró en promedio.
      </p>

      {datos.length > 1 && (
        <div className="h-56 mb-4" role="img" aria-label="Precio cobrado por noche en cada temporada, por casa">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 6, right: 16, left: -6, bottom: 0 }}>
              <CartesianGrid stroke="#e8dfd2" vertical={false} />
              <XAxis dataKey="etiqueta" tick={ejeTexto} axisLine={false} tickLine={false} />
              <YAxis tick={ejeTexto} axisLine={false} tickLine={false} tickFormatter={v => `${v}`} width={50} />
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
              <th className="px-3 py-1.5 text-right font-semibold">Lista x noche</th>
              <th className="px-3 py-1.5 text-right font-semibold">Cobrado x noche</th>
              <th className="px-3 py-1.5 text-right font-semibold">Var. precio</th>
              <th className="px-3 py-1.5 text-right font-semibold">Noches</th>
              <th className="px-3 py-1.5 text-right font-semibold">Ocupación</th>
              <th className="px-3 py-1.5 text-right font-semibold">Total</th>
              <th className="px-3 py-1.5 text-right font-semibold">Var. total</th>
            </tr>
          </thead>
          <tbody>
            {[...datos].reverse().map(d => {
              const i = datos.indexOf(d)
              return [
                <tr key={`t${d.t}`} className="bg-costa-arena/50">
                  <td colSpan={8} className="px-3 py-1.5 text-xs font-bold text-costa-navy">Temporada {d.etiqueta}</td>
                </tr>,
                ...d.porCasa.map(p => {
                  const a = anterior(i, p.casa.id)
                  return (
                    <tr key={`${d.t}-${p.casa.id}`} className="border-b border-costa-borde/50">
                      <td className="px-3 py-2 text-costa-navy whitespace-nowrap">
                        <span className="inline-block h-2.5 w-2.5 rounded-full mr-1.5 align-middle" style={{ background: p.casa.color }} />{p.casa.nombre}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-costa-gris">{p.lista ? usd(p.lista) : '–'}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-costa-navy">{p.tarifa ? usd(p.tarifa) : '–'}</td>
                      <td className="px-3 py-2 text-right tabular-nums"><Var v={variacion(p.tarifa, a?.tarifa)} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-costa-navy">{p.noches || '–'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-costa-navy">{p.noches ? `${p.ocupacion}%` : '–'}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-costa-navy">{p.total ? usd(p.total) : '–'}</td>
                      <td className="px-3 py-2 text-right tabular-nums"><Var v={variacion(p.total, a?.total)} /></td>
                    </tr>
                  )
                }),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
