// Servicios de una reserva que llevan precio. Cada uno se tilda y el precio es
// opcional: en 0 está incluido sin cargo y no suma al total. La tabla de
// reservas, el detalle en PDF y Cobros suman con esta misma lista.

export interface ServicioExtra {
  concepto: string
  monto: number
  moneda: string
}

interface ReservaServicios {
  ropa_blanca?: boolean | null
  monto_ropa_blanca?: number | null
  moneda_ropa_blanca?: string | null
  limpieza_final?: number | null
  moneda_limpieza?: string | null
  monto_lavadero?: number | null
  moneda_lavadero?: string | null
  servicios_extra?: ServicioExtra[] | null
}

export interface ServicioConPrecio {
  label: string
  monto: number
  moneda: string
}

export function serviciosConPrecio(r: ReservaServicios): ServicioConPrecio[] {
  const lista: ServicioConPrecio[] = []
  if (r.ropa_blanca && (r.monto_ropa_blanca || 0) > 0) {
    lista.push({ label: 'Ropa blanca', monto: r.monto_ropa_blanca || 0, moneda: r.moneda_ropa_blanca || 'ARS' })
  }
  if ((r.limpieza_final || 0) > 0) {
    lista.push({ label: 'Limpieza final', monto: r.limpieza_final || 0, moneda: r.moneda_limpieza || 'ARS' })
  }
  if ((r.monto_lavadero || 0) > 0) {
    lista.push({ label: 'Lavadero', monto: r.monto_lavadero || 0, moneda: r.moneda_lavadero || 'ARS' })
  }
  for (const x of r.servicios_extra || []) {
    if ((x.monto || 0) > 0) lista.push({ label: x.concepto || 'Servicio adicional', monto: x.monto, moneda: x.moneda || 'ARS' })
  }
  return lista
}
