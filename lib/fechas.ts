/**
 * Postgres devuelve las columnas `date` como 'YYYY-MM-DD', y `new Date()` las
 * lee como medianoche UTC: en Argentina (UTC-3) eso cae el día anterior, así
 * que una reserva del 1 de febrero se mostraba como 31 de enero.
 *
 * Estas funciones las interpretan en horario local, para que la fecha que se
 * muestra sea la que está guardada. Usarlas con columnas `date`; las
 * `timestamptz` (created_at, eliminado_at) traen zona y van con `new Date()`.
 */
export const parseFechaLocal = (fecha: string) => {
  const [a, m, d] = fecha.split('T')[0].split('-').map(Number)
  return new Date(a, (m || 1) - 1, d || 1)
}

export const formatFecha = (fecha: string) => parseFechaLocal(fecha).toLocaleDateString('es-AR')

/**
 * Fecha local -> 'YYYY-MM-DD' para comparar contra columnas `date`.
 * `toISOString()` pasa por UTC y en zonas UTC+ devuelve el día siguiente.
 */
export const aFechaISO = (fecha: Date) => {
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${m}-${d}`
}
