// Montos y filtros de reservas que comparten la pestaña Reservas (tabla,
// tarjetas y recuadros de resumen) y el reporte PDF, para que den lo mismo.

import { parseFechaLocal } from './fechas'
import { serviciosConPrecio, type ServicioExtra } from './serviciosReserva'

export type PorMoneda = Record<string, number>

interface ReservaMontos {
  id: number | string
  fecha_inicio: string
  fecha_fin: string
  precio_noche: number | null
  moneda: string | null
  ropa_blanca?: boolean | null
  monto_ropa_blanca?: number | null
  moneda_ropa_blanca?: string | null
  limpieza_final?: number | null
  moneda_limpieza?: string | null
  monto_lavadero?: number | null
  moneda_lavadero?: string | null
  servicios_extra?: ServicioExtra[] | null
}

interface CobroMontos {
  reserva_id: number | string
  monto: number
  moneda: string
  concepto: string
  aplicar_a: string
}

export const nochesEntre = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0
  const dias = (parseFechaLocal(checkOut).getTime() - parseFechaLocal(checkIn).getTime()) / 86400000
  return Math.max(0, Math.round(dias))
}

const sumar = (o: PorMoneda, moneda: string, valor: number) => {
  if (valor) o[moneda] = (o[moneda] || 0) + valor
}

/**
 * Total = alquiler + servicios con cargo. Cobrado = todos los cobros menos el
 * depósito, que es garantía; la devolución de seña resta. Saldo = total - cobrado.
 * Todo separado por moneda.
 */
export function montosReserva(reserva: ReservaMontos, cobros: CobroMontos[]) {
  const total: PorMoneda = {}
  sumar(total, reserva.moneda || 'ARS', nochesEntre(reserva.fecha_inicio, reserva.fecha_fin) * (reserva.precio_noche || 0))
  for (const s of serviciosConPrecio(reserva)) sumar(total, s.moneda, s.monto)

  const cobrado: PorMoneda = {}
  for (const c of cobros) {
    if (c.reserva_id !== reserva.id || c.aplicar_a === 'deposito') continue
    sumar(cobrado, c.moneda, c.concepto === 'devolucion_sena' ? -(c.monto || 0) : (c.monto || 0))
  }

  // USD primero, después pesos
  const monedas = Array.from(new Set([...Object.keys(total), ...Object.keys(cobrado)])).sort().reverse()
  const saldo: PorMoneda = {}
  for (const m of monedas) saldo[m] = (total[m] || 0) - (cobrado[m] || 0)

  return { total, cobrado, saldo, monedas }
}

export function sumarMontos(lista: PorMoneda[]): PorMoneda {
  const out: PorMoneda = {}
  for (const o of lista) for (const m of Object.keys(o)) sumar(out, m, o[m])
  return out
}

/** Monedas con importe distinto de cero, USD primero */
export const monedasCon = (o: PorMoneda) =>
  Object.keys(o).filter(m => Math.round(o[m]) !== 0).sort().reverse()

// ---------- Filtro ----------

export type TipoPeriodo = 'todo' | 'temporada' | 'anio' | 'rango'

export interface FiltroReservas {
  propiedadId: string // '' = todas
  tipo: TipoPeriodo
  valor: string // año de inicio de temporada, o año calendario
  desde: string // YYYY-MM-DD (rango)
  hasta: string
}

export const FILTRO_INICIAL: FiltroReservas = { propiedadId: '', tipo: 'todo', valor: '', desde: '', hasta: '' }

// La temporada va de julio a junio: la 2026/27 junta todo el verano 26-27
const MES_INICIO_TEMPORADA = 7

export const temporadaDe = (fecha: string) => {
  const d = parseFechaLocal(fecha)
  return d.getMonth() + 1 >= MES_INICIO_TEMPORADA ? d.getFullYear() : d.getFullYear() - 1
}

export const etiquetaTemporada = (anio: number) => `Temporada ${anio}/${String(anio + 1).slice(-2)}`

/** Rango [desde, hasta] (YYYY-MM-DD, inclusive) del filtro; null = sin límite */
function rangoDe(f: FiltroReservas): { desde: string | null; hasta: string | null } {
  if (f.tipo === 'temporada' && f.valor) {
    const a = Number(f.valor)
    const mm = String(MES_INICIO_TEMPORADA).padStart(2, '0')
    const fin = new Date(a + 1, MES_INICIO_TEMPORADA - 1, 0) // último día del mes anterior
    return { desde: `${a}-${mm}-01`, hasta: `${a + 1}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}` }
  }
  if (f.tipo === 'anio' && f.valor) return { desde: `${f.valor}-01-01`, hasta: `${f.valor}-12-31` }
  if (f.tipo === 'rango') return { desde: f.desde || null, hasta: f.hasta || null }
  return { desde: null, hasta: null }
}

/** Una reserva entra si es de la casa elegida y su ingreso cae en el período */
export function filtrarReservas<T extends { propiedad_id: string | number; fecha_inicio: string }>(reservas: T[], f: FiltroReservas): T[] {
  const { desde, hasta } = rangoDe(f)
  return reservas.filter(r => {
    if (f.propiedadId && String(r.propiedad_id) !== f.propiedadId) return false
    const ingreso = r.fecha_inicio.slice(0, 10)
    if (desde && ingreso < desde) return false
    if (hasta && ingreso > hasta) return false
    return true
  })
}

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Texto del período para encabezados ("Temporada 2026/27", "Año 2026", "Del 01/01/2026 al 31/03/2026") */
export function describirPeriodo(f: FiltroReservas): string {
  if (f.tipo === 'temporada' && f.valor) return etiquetaTemporada(Number(f.valor))
  if (f.tipo === 'anio' && f.valor) return `Año ${f.valor}`
  if (f.tipo === 'rango' && (f.desde || f.hasta)) {
    if (f.desde && f.hasta) return `Del ${fechaCorta(f.desde)} al ${fechaCorta(f.hasta)}`
    return f.desde ? `Desde el ${fechaCorta(f.desde)}` : `Hasta el ${fechaCorta(f.hasta)}`
  }
  return 'Todas las fechas'
}
