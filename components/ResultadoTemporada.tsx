'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoGastos } from '@/lib/demoData'

// Resultado por año calendario: lo cobrado de alquiler y servicios en el año
// (según la fecha de cada pago, sin depósitos) menos los gastos del año de cada
// casa, más el acumulado de todos los años. Los gastos están en pesos y lo
// cobrado mayormente en dólares: se pasa todo con el dólar del día o uno a mano.

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
  // Resultado por año calendario (1/1 al 31/12): pagos cobrados en el año menos
  // gastos del año. Al lado, el acumulado de todos los años juntos.
  const [anio, setAnio] = useState(new Date().getFullYear())
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
    return {
      usd, ars, reservas: conPago.size,
      gastosArs: propios.reduce((a, g) => a + Number(g.monto), 0),
      sinPagar: propios.filter(g => !g.pagado).reduce((a, g) => a + Number(g.monto), 0),
    }
  }

  const filas = useMemo(() => casas.map(c => ({ casa: c, ...calcular(c.id, desde, hasta), acum: calcular(c.id) })),
    [casas, reservas, cobros, gastos, desde, hasta]) // eslint-disable-line react-hooks/exhaustive-deps

  // Años con movimientos, más el actual
  const anios = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()])
    cobros.forEach(c => c.fecha && set.add(Number(String(c.fecha).slice(0, 4))))
    gastos.forEach(g => g.fecha && set.add(Number(String(g.fecha).slice(0, 4))))
    return [...set].sort((a, b) => b - a)
  }, [cobros, gastos])
  const primerAnio = anios[anios.length - 1]

  const sumar = (lista: { usd: number; ars: number; gastosArs: number; sinPagar: number; reservas: number }[]) =>
    lista.reduce((a, f) => ({ usd: a.usd + f.usd, ars: a.ars + f.ars, gastosArs: a.gastosArs + f.gastosArs, sinPagar: a.sinPagar + f.sinPagar, reservas: a.reservas + f.reservas }),
      { usd: 0, ars: 0, gastosArs: 0, sinPagar: 0, reservas: 0 })
  const total = { ...sumar(filas), acum: sumar(filas.map(f => f.acum)) }
  const enUsd = (f: { usd: number; ars: number; gastosArs: number }) => dolar ? f.usd + (f.ars - f.gastosArs) / dolar : null
  const enArs = (f: { usd: number; ars: number; gastosArs: number }) => dolar ? f.usd * dolar + f.ars - f.gastosArs : null
  const dmy = (iso: string) => iso.split('-').reverse().join('/')

  const Fila = ({ f, nombre, fuerte = false }: { f: typeof total; nombre: string; fuerte?: boolean }) => {
    const ru = enUsd(f), ra = enArs(f), au = enUsd(f.acum), aa = enArs(f.acum)
    return (
      <tr className={`border-b border-costa-borde/60 ${fuerte ? 'bg-costa-arena/50 font-bold' : ''}`}>
        <td className="px-3 py-2 text-costa-navy">{nombre}<span className="block text-[0.75em] font-normal text-costa-gris">{f.reservas} reserva{f.reservas !== 1 ? 's' : ''} con pagos</span></td>
        <td className="px-3 py-2 text-right tabular-nums text-costa-olivo">{f.usd ? `U$D ${fmt(f.usd)}` : '–'}{f.ars ? <span className="block">$ {fmt(f.ars)}</span> : null}</td>
        <td className="px-3 py-2 text-right tabular-nums text-costa-coral-dark">{f.gastosArs ? `$ ${fmt(f.gastosArs)}` : '–'}
          {f.sinPagar > 0 && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(f.sinPagar)} sin pagar</span>}
          {dolar > 0 && f.gastosArs > 0 && <span className="block text-[0.75em] font-normal text-costa-gris">≈ U$D {fmt(f.gastosArs / dolar)}</span>}
        </td>
        <td className={`px-3 py-2 text-right tabular-nums text-base ${ru === null ? 'text-costa-gris' : ru >= 0 ? 'text-costa-esmeralda' : 'text-red-700'}`}>
          {ru === null ? '–' : `U$D ${fmt(ru)}`}
          {ra !== null && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(ra)}</span>}
        </td>
        <td className={`px-3 py-2 text-right tabular-nums border-l border-costa-borde ${au === null ? 'text-costa-gris' : au >= 0 ? 'text-costa-esmeralda' : 'text-red-700'}`}>
          {au === null ? '–' : `U$D ${fmt(au)}`}
          {aa !== null && <span className="block text-[0.75em] font-normal text-costa-gris">$ {fmt(aa)}</span>}
        </td>
      </tr>
    )
  }

  return (
    <div className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-bold text-costa-esmeralda flex flex-wrap items-center gap-2">
            Resultado del año
            <select value={anio} onChange={e => setAnio(Number(e.target.value))}
              className="h-8 rounded-lg border border-costa-borde bg-white px-2 text-sm font-bold text-costa-esmeralda">
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </h3>
          <p className="text-xs text-costa-gris mt-1">
            Del {dmy(desde)} al {dmy(hasta)}: los pagos de alquiler y servicios cobrados en el año (sin depósitos) menos los gastos del año de cada casa. A la derecha, el acumulado desde {primerAnio}.
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
              <th className="px-3 py-1.5 text-right font-semibold">Cobrado</th>
              <th className="px-3 py-1.5 text-right font-semibold">Gastos</th>
              <th className="px-3 py-1.5 text-right font-semibold">Resultado {anio}</th>
              <th className="px-3 py-1.5 text-right font-semibold border-l border-costa-borde">Acumulado</th>
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
