// Estadísticas de reservas para el tablero de Resumen. Todo se calcula con las
// reservas y cobros ya cargados; no guarda nada.

import { parseFechaLocal, aFechaISO } from './fechas'
import { montosReserva, nochesEntre, rangoTemporada, sumarMontos, type PorMoneda } from './resumenReservas'
import type { ServicioExtra } from './serviciosReserva'

export interface ReservaEst {
  id: number | string
  propiedad_id: number | string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  precio_noche: number | null
  moneda: string | null
  cantidad_personas?: number | null
  created_at?: string | null
  ropa_blanca?: boolean | null
  monto_ropa_blanca?: number | null
  moneda_ropa_blanca?: string | null
  limpieza_final?: number | null
  moneda_limpieza?: string | null
  monto_lavadero?: number | null
  moneda_lavadero?: string | null
  servicios_extra?: ServicioExtra[] | null
}

interface CobroEst { reserva_id: number | string; monto: number; moneda: string; concepto: string; aplicar_a: string }

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Cada noche de una reserva, como 'YYYY-MM-DD' */
export function nochesDe(r: { fecha_inicio: string; fecha_fin: string }): string[] {
  const out: string[] = []
  const d = parseFechaLocal(r.fecha_inicio)
  const fin = r.fecha_fin.slice(0, 10)
  for (let i = 0; i < 400; i++) {
    const iso = aFechaISO(d)
    if (iso >= fin) break
    out.push(iso)
    d.setDate(d.getDate() + 1)
  }
  return out
}

export interface StatsCasa {
  propiedadId: string
  reservas: number
  noches: number
  total: PorMoneda
  cobrado: PorMoneda
  saldo: PorMoneda
  tarifaPromedio: number | null // por noche, en la moneda del alquiler más usada (USD)
  estadiaPromedio: number | null
  personasPromedio: number | null
  anticipacionPromedio: number | null // días entre que se cargó y el ingreso
}

/** Métricas de un grupo de reservas (ya filtradas, sin canceladas ni pendientes) */
export function metricas(reservas: ReservaEst[], cobros: CobroEst[], propiedadId = ''): StatsCasa {
  const montos = reservas.map(r => montosReserva(r, cobros))
  const noches = reservas.reduce((a, r) => a + nochesEntre(r.fecha_inicio, r.fecha_fin), 0)
  const enUSD = reservas.filter(r => (r.moneda || 'USD') === 'USD' && (r.precio_noche || 0) > 0)
  const nochesUSD = enUSD.reduce((a, r) => a + nochesEntre(r.fecha_inicio, r.fecha_fin), 0)
  const alquilerUSD = enUSD.reduce((a, r) => a + nochesEntre(r.fecha_inicio, r.fecha_fin) * (r.precio_noche || 0), 0)
  const conCarga = reservas.filter(r => r.created_at)
  const anticip = conCarga.map(r => nochesEntre(aFechaISO(new Date(r.created_at as string)), r.fecha_inicio)).filter(d => d >= 0)
  return {
    propiedadId,
    reservas: reservas.length,
    noches,
    total: sumarMontos(montos.map(m => m.total)),
    cobrado: sumarMontos(montos.map(m => m.cobrado)),
    saldo: sumarMontos(montos.map(m => m.saldo)),
    tarifaPromedio: nochesUSD ? Math.round(alquilerUSD / nochesUSD) : null,
    estadiaPromedio: reservas.length ? Math.round((noches / reservas.length) * 10) / 10 : null,
    personasPromedio: reservas.length ? Math.round((reservas.reduce((a, r) => a + (r.cantidad_personas || 1), 0) / reservas.length) * 10) / 10 : null,
    anticipacionPromedio: anticip.length ? Math.round(anticip.reduce((a, b) => a + b, 0) / anticip.length) : null,
  }
}

/**
 * Noches ocupadas por mes y por casa. `meses` define las columnas: para una
 * temporada, dic-ene-feb; para un año o todo, los 12 meses del calendario
 * (sumando todos los años, para ver qué meses rinden más).
 */
export function nochesPorMes(reservas: ReservaEst[], propiedadIds: string[], meses: number[], dentro?: (iso: string) => boolean) {
  const filas = meses.map(m => {
    const fila: Record<string, number | string> = { mes: MESES_CORTOS[m] }
    for (const id of propiedadIds) fila[id] = 0
    return fila
  })
  for (const r of reservas) {
    const id = String(r.propiedad_id)
    if (!propiedadIds.includes(id)) continue
    for (const n of nochesDe(r)) {
      if (dentro && !dentro(n)) continue
      const idx = meses.indexOf(Number(n.slice(5, 7)) - 1)
      if (idx >= 0) filas[idx][id] = (filas[idx][id] as number) + 1
    }
  }
  return filas
}

/**
 * Demanda día por día en temporada alta: de cada día del 15/12 al 20/02,
 * qué parte de las casas estuvo ocupada, promediando las temporadas pedidas.
 */
export function demandaTemporada(reservas: ReservaEst[], propiedadIds: string[], temporadas: number[]) {
  if (!temporadas.length || !propiedadIds.length) return []
  const base = rangoTemporada(temporadas[0])
  const dias = nochesEntre(base.desde, base.hasta)
  const ocupadas = new Array(dias).fill(0)
  const ocupadasConf = new Array(dias).fill(0)
  for (const t of temporadas) {
    const { desde, hasta } = rangoTemporada(t)
    for (const r of reservas) {
      if (!propiedadIds.includes(String(r.propiedad_id))) continue
      for (const n of nochesDe(r)) {
        if (n < desde || n >= hasta) continue
        const i = nochesEntre(desde, n)
        if (i >= 0 && i < dias) {
          ocupadas[i] += 1
          if (r.estado !== 'pendiente') ocupadasConf[i] += 1
        }
      }
    }
  }
  const posibles = propiedadIds.length * temporadas.length
  const inicio = parseFechaLocal(base.desde)
  return ocupadas.map((_, i) => {
    const d = new Date(inicio)
    d.setDate(d.getDate() + i)
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0')
    return { dia: `${dd}/${mm}`, ocupacion: Math.round((ocupadasConf[i] / posibles) * 100), conPendientes: Math.round((ocupadas[i] / posibles) * 100) }
  })
}
