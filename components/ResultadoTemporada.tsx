'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoGastos } from '@/lib/demoData'
import { montosReserva } from '@/lib/resumenReservas'

// Balance del año (caja): lo cobrado de alquiler y servicios en el año (según
// la fecha de cada pago, sin depósitos) menos los gastos del año de cada casa.
// Arranca en 2026: el saldo de un año pasa como saldo inicial del siguiente.
// Los gastos están en pesos y lo cobrado mayormente en dólares: se pasa todo
// con el dólar del día o uno a mano.

// Primer año del balance (lo anterior no se cuenta)
const PRIMER_ANIO = 2026

interface ReservaR { id: number; propiedad_id: string; fecha_inicio: string; fecha_fin: string; estado: string; precio_noche: number | null; moneda: string | null; [k: string]: unknown }
interface CobroR { reserva_id: number; monto: number; moneda: string; concepto: string; aplicar_a: string; fecha?: string | null }
interface GastoR { propiedad_id: string | null; monto: number; fecha: string; pagado: boolean | null }
interface Casa { id: string; nombre: string }

const TIPOS_DOLAR = [
  { k: 'blue', t: 'Blue' },
  { k: 'bolsa', t: 'MEP' },
  { k: 'oficial', t: 'Oficial' },
] as const

const fmt = (v: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))

export function ResultadoTemporada({ reservas, cobros, casas, userId, isDemo }: {
  temporada?: number
  reservas: ReservaR[]
  cobros: CobroR[]
  casas: Casa[]
  userId?: string | null
  isDemo: boolean
}) {
  const [anio, setAnio] = useState(Math.max(PRIMER_ANIO, new Date().getFullYear()))
  const desde = `${anio}-01-01`
  const hasta = `${anio}-12-31`
  const [gastos, setGastos] = useState<GastoR[]>([])
  const [tipoDolar, setTipoDolar] = useState<'blue' | 'bolsa' | 'oficial'>('blue')
  const [cotizacion, setCotizacion] = useState<number | null>(null)
  const [manual, setManual] = useState('')
  const [fechaCotizacion, setFechaCotizacion] = useState('')

  useEffect(() => {
    let vivo = true
    async function cargar() {
      if (isDemo) { setGastos(demoGastos as unknown as GastoR[]); return }
      if (!userId) return
      const { data } = await supabase.from('gastos').select('propiedad_id, monto, fecha, pagado')
        .eq('user_id', userId).is('eliminado_at', null)
      if (vivo) setGastos((data || []) as GastoR[])
    }
    cargar()
    return () => { vivo = false }
  }, [userId, isDemo])

  // Dólar del día (venta) desde dolarapi.com: solo se pide la cotización, no se manda ningún dato
  useEffect(() => {
    let vivo = true
    fetch(`https://dolarapi.com/v1/dolares/${tipoDolar}`)
      .then(r => r.json())
      .then(d => { if (vivo && d?.venta) { setCotizacion(Number(d.venta)); setFechaCotizacion(String(d.fechaActualizacion || '').slice(0, 10)) } })
      .catch(() => { if (vivo) setCotizacion(null) })
    return () => { vivo = false }
  }, [tipoDolar])

  const dolar = Number(manual) > 0 ? Number(manual) : cotizacion || 0

  // Cobrado y gastos de una casa entre dos fechas (sin límite si no se pasan)
  const calcular = (casaId: string, d?: string, h?: string) => {
    const dentro = (f: string) => (!d || f >= d) && (!h || f <= h)
    const ids = new Set(reservas.filter(r => String(r.propiedad_id) === casaId && r.estado !== 'cancelada').map(r => r.id))
    let usd = 0, ars = 0
    const conPago = new Set<number>()
    cobros.forEach(cb => {
      const f = (cb.fecha || '').slice(0, 10)
      if (!ids.has(cb.reserva_id) || cb.aplicar_a === 'deposito' || !f || !dentro(f)) return
      const v = (cb.concepto === 'devolucion_sena' ? -1 : 1) * Number(cb.monto || 0)
      if (cb.moneda === 'USD') usd += v; else ars += v
      conPago.add(cb.reserva_id)
    })
    const propios = gastos.filter(g => String(g.propiedad_id) === casaId && dentro(String(g.fecha).slice(0, 10)))
    // Por cobrar: saldo de las reservas confirmadas que entran en el período (lo que falta que entre)
    let porCobrarUsd = 0, porCobrarArs = 0
    reservas.filter(r => String(r.propiedad_id) === casaId && r.estado === 'confirmada' && dentro(r.fecha_inicio.slice(0, 10)))
      .forEach(r => {
        const { saldo } = montosReserva(r as never, cobros)
        porCobrarUsd += Math.max(0, saldo.USD || 0); porCobrarArs += Math.max(0, saldo.ARS || 0)
      })
    return {
      usd, ars, reservas: conPago.size, porCobrarUsd, porCobrarArs,
      gastosArs: propios.reduce((a, g) => a + Number(g.monto), 0),
      sinPagar: propios.filter(g => !g.pagado).reduce((a, g) => a + Number(g.monto), 0),
    }
  }

  // Saldo inicial: todo lo de los años anteriores desde PRIMER_ANIO; saldo final: hasta el 31/12 del año
  const vacio = { usd: 0, ars: 0, reservas: 0, gastosArs: 0, sinPagar: 0, porCobrarUsd: 0, porCobrarArs: 0 }
  const filas = useMemo(() => casas.map(c => ({
    casa: c, ...calcular(c.id, desde, hasta),
    inicial: anio > PRIMER_ANIO ? calcular(c.id, `${PRIMER_ANIO}-01-01`, `${anio - 1}-12-31`) : vacio,
    acum: calcular(c.id, `${PRIMER_ANIO}-01-01`, hasta),
  })),
    [casas, reservas, cobros, gastos, desde, hasta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Años con movimientos desde PRIMER_ANIO, más el actual
  const anios = useMemo(() => {
    // Siempre el año actual y el que viene (que arranca con el saldo de este)
    const actual = Math.max(PRIMER_ANIO, new Date().getFullYear())
    const set = new Set<number>([actual, actual + 1])
    cobros.forEach(c => c.fecha && set.add(Number(String(c.fecha).slice(0, 4))))
    gastos.forEach(g => g.fecha && set.add(Number(String(g.fecha).slice(0, 4))))
    return [...set].filter(a => a >= PRIMER_ANIO).sort((a, b) => b - a)
  }, [cobros, gastos])

  type Montos = { usd: number; ars: number; gastosArs: number; sinPagar: number; reservas: number; porCobrarUsd: number; porCobrarArs: number }
  const sumar = (lista: Montos[]) =>
    lista.reduce((a, f) => ({ usd: a.usd + f.usd, ars: a.ars + f.ars, gastosArs: a.gastosArs + f.gastosArs, sinPagar: a.sinPagar + f.sinPagar, reservas: a.reservas + f.reservas, porCobrarUsd: a.porCobrarUsd + f.porCobrarUsd, porCobrarArs: a.porCobrarArs + f.porCobrarArs }),
      { usd: 0, ars: 0, gastosArs: 0, sinPagar: 0, reservas: 0, porCobrarUsd: 0, porCobrarArs: 0 })
  const total = { ...sumar(filas), inicial: sumar(filas.map(f => f.inicial)), acum: sumar(filas.map(f => f.acum)) }
  const enUsd = (f: { usd: number; ars: number; gastosArs: number }) => dolar ? f.usd + (f.ars - f.gastosArs) / dolar : null
  const enArs = (f: { usd: number; ars: number; gastosArs: number }) => dolar ? f.usd * dolar + f.ars - f.gastosArs : null
  const dmy = (iso: string) => iso.split('-').reverse().join('/')

  const Fila = ({ f, nombre, fuerte = false }: { f: typeof total; nombre: string; fuerte?: boolean }) => {
    const ru = enUsd(f), ra = enArs(f), au = enUsd(f.acum), aa = enArs(f.acum), iu = enUsd(f.inicial), ia = enArs(f.inicial)
    const tono = (v: number | null) => v === null ? 'text-costa-gris' : v >= 0 ? 'text-costa-esmeralda' : 'text-red-700'
    return (
      <tr className={`border-b border-costa-borde/60 ${fuerte ? 'bg-costa-arena/50 font-bold' : ''}`}>
        <td className="px-3 py-2 text-costa-navy">{nombre}<span className="block text-[0.75em] font-normal text-costa-gris">{f.reservas} reserva{f.reservas !== 1 ? 's' : ''} con pagos</span></td>
        <td className={`px-3 py-2 text-right tabular-nums border-r border-costa-borde ${anio === PRIMER_ANIO ? 'text-costa-gris' : tono(iu)}`}>
          {anio === PRIMER_ANIO ? '–' : iu === null ? '–' : `U$D ${fmt(iu)}`}
          {anio > PRIMER_ANIO && ia !== null && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(ia)}</span>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-costa-olivo">{f.usd ? `U$D ${fmt(f.usd)}` : '–'}{f.ars ? <span className="block">$ {fmt(f.ars)}</span> : null}
          {(f.porCobrarUsd > 0 || f.porCobrarArs > 0) && (
            <span className="block text-[0.75em] font-semibold text-amber-700">
              + {[f.porCobrarUsd > 0 && `U$D ${fmt(f.porCobrarUsd)}`, f.porCobrarArs > 0 && `$ ${fmt(f.porCobrarArs)}`].filter(Boolean).join(' + ')} por cobrar
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-costa-coral-dark">{f.gastosArs ? `$ ${fmt(f.gastosArs)}` : '–'}
          {f.sinPagar > 0 && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(f.sinPagar)} sin pagar</span>}
          {dolar > 0 && f.gastosArs > 0 && <span className="block text-[0.75em] font-normal text-costa-gris">≈ U$D {fmt(f.gastosArs / dolar)}</span>}
        </td>
        <td className={`px-3 py-2 text-right tabular-nums text-base ${ru === null ? 'text-costa-gris' : ru >= 0 ? 'text-costa-esmeralda' : 'text-red-700'}`}>
          {ru === null ? '–' : `U$D ${fmt(ru)}`}
          {ra !== null && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(ra)}</span>}
        </td>
        <td className={`px-3 py-2 text-right tabular-nums border-l border-costa-borde font-bold ${tono(au)}`}>
          {au === null ? '–' : `U$D ${fmt(au)}`}
          {aa !== null && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(aa)}</span>}
          {au !== null && (f.porCobrarUsd > 0 || f.porCobrarArs > 0) && (
            <span className="block text-[0.75em] font-semibold text-amber-700">U$D {fmt(au + f.porCobrarUsd + f.porCobrarArs / dolar)} con lo por cobrar</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-bold text-costa-esmeralda flex flex-wrap items-center gap-2">
            Balance del año
            <select value={anio} onChange={e => setAnio(Number(e.target.value))}
              className="h-8 rounded-lg border border-costa-borde bg-white px-2 text-sm font-bold text-costa-esmeralda">
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </h3>
          <p className="text-xs text-costa-gris mt-1">
            Del {dmy(desde)} al {dmy(hasta)}: lo que entró en el año (pagos de alquiler y servicios, sin depósitos) menos los gastos del año de cada casa. El saldo final pasa como saldo inicial del año siguiente; el balance arranca en {PRIMER_ANIO}. En naranja, lo que falta cobrar de las reservas confirmadas que entran en el año.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-costa-gris">Dólar</span>
          <div className="inline-flex rounded-lg border border-costa-borde bg-white p-0.5">
            {TIPOS_DOLAR.map(d => (
              <button key={d.k} type="button" onClick={() => { setTipoDolar(d.k); setManual('') }}
                className={`px-2 py-1 rounded-md font-semibold ${tipoDolar === d.k && !manual ? 'bg-costa-esmeralda text-white' : 'text-costa-gris'}`}>{d.t}</button>
            ))}
          </div>
          <input type="number" placeholder={cotizacion ? fmt(cotizacion) : 'a mano'} value={manual} onChange={e => setManual(e.target.value)}
            className="w-24 h-8 rounded-lg border border-costa-borde bg-white px-2 text-right font-semibold text-costa-esmeralda" title="Escribí otra cotización si querés" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-costa-borde text-[0.7em] uppercase tracking-wider text-costa-gris">
              <th className="px-3 py-1.5 text-left font-semibold">Casa</th>
              <th className="px-3 py-1.5 text-right font-semibold border-r border-costa-borde">Saldo inicial</th>
              <th className="px-3 py-1.5 text-right font-semibold">Cobrado</th>
              <th className="px-3 py-1.5 text-right font-semibold">Gastos</th>
              <th className="px-3 py-1.5 text-right font-semibold">Resultado {anio}</th>
              <th className="px-3 py-1.5 text-right font-semibold border-l border-costa-borde">Saldo al 31/12</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(f => <Fila key={f.casa.id} f={f} nombre={f.casa.nombre} />)}
            {filas.length > 1 && <Fila f={total} nombre="Total" fuerte />}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.75em] text-costa-gris">
        {dolar
          ? `Pasado a una moneda con el dólar ${manual ? 'que escribiste' : `${TIPOS_DOLAR.find(d => d.k === tipoDolar)?.t.toLowerCase()} de hoy`}: $ ${fmt(dolar)}${!manual && fechaCotizacion ? ` (actualizado ${dmy(fechaCotizacion)})` : ''}.`
          : 'No se pudo traer la cotización: escribila a mano para ver el resultado en una sola moneda.'}
        {' '}Los gastos salen de la sección Gastos; lo cobrado, de los pagos registrados en cada reserva.
      </p>
    </div>
  )
}
