// Precio por noche a partir de las reglas de precios (tabla price_rules), las
// que se cargan en Casas → Precios alquileres. Lo usan el calendario de
// precios, la web pública, las ofertas de Temporada y Nueva reserva.

import type { PriceRule } from './priceRules'
import { obtenerFinesDeSemanaLargos } from './calendarioArgentina'

/** Marca de un tramo sin fechas fijas: vale para los fines de semana largos fuera de temporada */
export const FERIADO_LARGO = 'feriado_largo'
const CLAVE_DIA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']

const pad = (n: number) => String(n).padStart(2, '0')
const isoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const enTemporada = (iso: string) => iso.slice(5) >= '12-15' || iso.slice(5) <= '02-28'

/** Días (YYYY-MM-DD) de fines de semana largos fuera de temporada, para esos años */
export function diasFeriadoLargo(anios: number[]): Set<string> {
  const dias = new Set<string>()
  for (const y of anios) {
    obtenerFinesDeSemanaLargos(y).forEach(f => {
      const d = new Date(`${f.fechaInicio}T12:00:00`)
      const fin = new Date(`${f.fechaFin}T12:00:00`)
      while (d <= fin) {
        const iso = isoDe(d)
        if (!enTemporada(iso)) dias.add(iso)
        d.setDate(d.getDate() + 1)
      }
    })
  }
  return dias
}

/** La regla que pone el precio de ese día: la de mayor prioridad que aplica */
export function precioDelDia(reglas: PriceRule[], iso: string, dow: number, feriadosLargos: Set<string>): PriceRule | null {
  let mejor: PriceRule | null = null
  for (const r of reglas) {
    if (!r.active || iso < r.start_date || iso > r.end_date) continue
    if (r.applies_to_days?.includes(FERIADO_LARGO)) {
      if (!feriadosLargos.has(iso)) continue
    } else if (r.applies_to_days?.length && !r.applies_to_days.includes(CLAVE_DIA[dow])) continue
    if (!mejor || r.priority > mejor.priority) mejor = r
  }
  return mejor
}

export interface PrecioEstadia {
  noches: number
  total: number
  precioPromedio: number
  /** true si todas las noches tienen precio */
  completo: boolean
  minimoNoches: number
  desglose: { fecha: string; precio: number | null; tramo: string | null }[]
}

/** Precio de una estadía (desde = ingreso, hasta = salida; se cobran las noches) con las reglas de una casa */
export function precioEstadia(desde: string, hasta: string, reglas: PriceRule[]): PrecioEstadia {
  const ini = new Date(`${desde.slice(0, 10)}T12:00:00`)
  const fin = new Date(`${hasta.slice(0, 10)}T12:00:00`)
  const noches = Math.max(0, Math.round((fin.getTime() - ini.getTime()) / 86400000))
  const feriados = diasFeriadoLargo([ini.getFullYear(), fin.getFullYear()])
  const desglose: PrecioEstadia['desglose'] = []
  let total = 0, conPrecio = 0, minimoNoches = 1
  const d = new Date(ini)
  for (let i = 0; i < noches; i++) {
    const iso = isoDe(d)
    const r = precioDelDia(reglas, iso, d.getDay(), feriados)
    if (r) {
      total += Number(r.price_per_night)
      conPrecio++
      if ((r.min_nights || 0) > minimoNoches) minimoNoches = r.min_nights || 1
    }
    desglose.push({ fecha: iso, precio: r ? Number(r.price_per_night) : null, tramo: r?.name ?? null })
    d.setDate(d.getDate() + 1)
  }
  return {
    noches, total,
    precioPromedio: conPrecio ? Math.round(total / conPrecio) : 0,
    completo: noches > 0 && conPrecio === noches,
    minimoNoches, desglose,
  }
}

/** Normaliza lo que viene de la base (numéricos como texto, días nulos) */
export const normalizarReglas = (filas: unknown[]): PriceRule[] =>
  (filas as PriceRule[]).map(r => ({ ...r, price_per_night: Number(r.price_per_night), applies_to_days: r.applies_to_days || [] }))

/** Columnas que se leen (las que la web pública puede ver) */
export const COLUMNAS_REGLAS = 'property_id, name, price_per_night, start_date, end_date, applies_to_days, min_nights, priority, active'
