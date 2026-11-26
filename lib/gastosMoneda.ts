// Gastos en pesos o en dólares. Cada gasto guarda el dólar del día en que se
// pagó (cotizacion), así su valor en dólares no cambia cuando sube el blue.
// Los que no tienen cotización (viejos o sin dato) se pasan con el dólar de hoy.

export interface GastoConMoneda { monto: number | null; moneda?: string | null; cotizacion?: number | null }

const fmt = (v: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))

export const esUsd = (g: GastoConMoneda) => g.moneda === 'USD'

/** Valor en dólares: el monto si es en dólares, o pesos / dólar del día del gasto (o el de hoy si no tiene). */
export function gastoEnUsd(g: GastoConMoneda, dolarHoy?: number | null): number | null {
  const monto = Number(g.monto || 0)
  if (esUsd(g)) return monto
  const cot = Number(g.cotizacion) > 0 ? Number(g.cotizacion) : Number(dolarHoy) > 0 ? Number(dolarHoy) : 0
  return cot ? monto / cot : null
}

/** Valor en pesos: el monto si es en pesos, o dólares × dólar del día del gasto (o el de hoy). */
export function gastoEnArs(g: GastoConMoneda, dolarHoy?: number | null): number | null {
  const monto = Number(g.monto || 0)
  if (!esUsd(g)) return monto
  const cot = Number(g.cotizacion) > 0 ? Number(g.cotizacion) : Number(dolarHoy) > 0 ? Number(dolarHoy) : 0
  return cot ? monto * cot : null
}

/** Importe tal como se cargó: "$ 292.500" o "U$D 1.950". */
export const importeGasto = (g: GastoConMoneda) => `${esUsd(g) ? 'U$D' : '$'} ${fmt(Number(g.monto || 0))}`

/** Pesos y dólares sumados por separado, como se cargaron: "$ 1.200.000 + U$D 1.950". */
export function sumaGastos(lista: GastoConMoneda[]): string {
  const ars = lista.filter(g => !esUsd(g)).reduce((a, g) => a + Number(g.monto || 0), 0)
  const usd = lista.filter(esUsd).reduce((a, g) => a + Number(g.monto || 0), 0)
  const partes = [ars ? `$ ${fmt(ars)}` : '', usd ? `U$D ${fmt(usd)}` : ''].filter(Boolean)
  return partes.length ? partes.join(' + ') : '$ 0'
}

/**
 * Dólar blue (venta) de una fecha AAAA-MM-DD. Usa el histórico público de
 * argentinadatos.com; si no hay dato (hoy o una fecha futura), el de hoy de
 * dolarapi.com. Solo se pide la cotización, no se manda ningún dato.
 */
export async function dolarBlueDe(fecha: string): Promise<number | null> {
  const hoy = new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha < hoy) {
    try {
      const r = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/${fecha.replace(/-/g, '/')}`)
      if (r.ok) { const d = await r.json(); if (Number(d?.venta) > 0) return Number(d.venta) }
    } catch { /* sigue con el de hoy */ }
  }
  try {
    const r = await fetch('https://dolarapi.com/v1/dolares/blue')
    const d = await r.json()
    return Number(d?.venta) > 0 ? Number(d.venta) : null
  } catch {
    return null
  }
}
