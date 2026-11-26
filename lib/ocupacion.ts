// Ocupación de cada casa en una temporada: bloques de reservas recortados al
// rango de la temporada y huecos libres entre ellos. La noche se cuenta por la
// fecha de ingreso (una reserva del 26/12 al 02/01 ocupa 7 noches).

import { nochesEntre } from './resumenReservas'

interface ReservaOcupacion {
  id: number | string
  propiedad_id: number | string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

export interface Bloque<R> {
  reserva: R
  desde: string // YYYY-MM-DD, ya recortado a la temporada
  hasta: string
  inicio: number // noches desde el comienzo de la temporada
  noches: number
  confirmada: boolean // confirmada o cerrada; las pendientes bloquean pero no cuentan
}

export interface Hueco {
  desde: string
  hasta: string
  inicio: number
  noches: number
}

export interface OcupacionCasa<R> {
  propiedadId: string
  bloques: Bloque<R>[]
  huecos: Hueco[]
  nochesConfirmadas: number
  nochesSinConfirmar: number
}

const max = (a: string, b: string) => (a > b ? a : b)
const min = (a: string, b: string) => (a < b ? a : b)

export function ocupacionTemporada<R extends ReservaOcupacion>(
  reservas: R[],
  propiedadIds: string[],
  desde: string,
  hasta: string,
): { totalNoches: number; casas: OcupacionCasa<R>[] } {
  const totalNoches = nochesEntre(desde, hasta)

  const casas = propiedadIds.map(propiedadId => {
    const bloques: Bloque<R>[] = reservas
      .filter(r => String(r.propiedad_id) === propiedadId && r.estado !== 'cancelada')
      .filter(r => r.fecha_inicio.slice(0, 10) < hasta && r.fecha_fin.slice(0, 10) > desde)
      .map(r => {
        const d = max(r.fecha_inicio.slice(0, 10), desde)
        const h = min(r.fecha_fin.slice(0, 10), hasta)
        return {
          reserva: r,
          desde: d,
          hasta: h,
          inicio: nochesEntre(desde, d),
          noches: nochesEntre(d, h),
          confirmada: r.estado !== 'pendiente',
        }
      })
      .filter(b => b.noches > 0)
      .sort((a, b) => a.desde.localeCompare(b.desde))

    // Huecos: lo que queda libre entre bloques (las pendientes también bloquean)
    const huecos: Hueco[] = []
    let cursor = desde
    for (const b of bloques) {
      if (b.desde > cursor) huecos.push({ desde: cursor, hasta: b.desde, inicio: nochesEntre(desde, cursor), noches: nochesEntre(cursor, b.desde) })
      cursor = max(cursor, b.hasta)
    }
    if (cursor < hasta) huecos.push({ desde: cursor, hasta, inicio: nochesEntre(desde, cursor), noches: nochesEntre(cursor, hasta) })

    return {
      propiedadId,
      bloques,
      huecos,
      nochesConfirmadas: bloques.filter(b => b.confirmada).reduce((a, b) => a + b.noches, 0),
      nochesSinConfirmar: bloques.filter(b => !b.confirmada).reduce((a, b) => a + b.noches, 0),
    }
  })

  return { totalNoches, casas }
}
