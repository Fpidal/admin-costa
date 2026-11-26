// Conceptos de un pago según qué se está registrando. El alquiler (con sus
// servicios) y el depósito en garantía van separados: el depósito no es
// ingreso, se devuelve. En la base se guardan los mismos valores de siempre
// (`concepto` + `aplicar_a`); acá solo cambia cómo se llaman en pantalla.

export type TipoMovimiento = 'alquiler' | 'deposito'

export const CONCEPTOS: Record<TipoMovimiento, { value: string; label: string; ayuda: string }[]> = {
  alquiler: [
    { value: 'seña', label: 'Seña', ayuda: 'El 50% para confirmar la reserva' },
    { value: 'liquidacion', label: 'Saldo', ayuda: 'Lo que falta, antes del ingreso' },
    { value: 'otro', label: 'Otro pago', ayuda: 'Servicios, extras o un pago parcial' },
    { value: 'devolucion_sena', label: 'Devolución al huésped', ayuda: 'Plata del alquiler que se le devuelve (resta)' },
  ],
  deposito: [
    { value: 'seña', label: 'Depósito recibido', ayuda: 'La garantía que deja el huésped' },
    { value: 'devolucion_sena', label: 'Depósito devuelto', ayuda: 'Lo que se le devuelve al salir (resta)' },
  ],
}

export const tipoDe = (aplicarA: string): TipoMovimiento => (aplicarA === 'deposito' ? 'deposito' : 'alquiler')

/** Nombre del concepto de un pago ya cargado, según sea de alquiler o de depósito */
export function etiquetaCobro(c: { concepto: string | null; aplicar_a: string }): string {
  if (tipoDe(c.aplicar_a) === 'deposito') {
    return c.concepto === 'devolucion_sena' ? 'Depósito devuelto' : 'Depósito recibido'
  }
  switch (c.concepto) {
    case 'seña': return 'Seña'
    case 'liquidacion': return 'Saldo'
    case 'anticipo': return 'Anticipo'
    case 'devolucion_sena': return 'Devolución al huésped'
    default: return 'Pago'
  }
}
