// Mensajes de WhatsApp con los datos de la reserva ya puestos. No hay
// integración: es un link wa.me que abre el chat con el texto escrito, y el
// envío lo hace el usuario desde su WhatsApp.

import { formatFecha } from './fechas'
import { monedasCon, type PorMoneda } from './resumenReservas'

/** Teléfono argentino -> formato wa.me (54 + área + número, sin 0 ni 15) */
export function telefonoWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  let n = telefono.replace(/\D/g, '')
  if (!n) return null
  if (n.startsWith('54')) n = n.slice(2)
  if (n.startsWith('0')) n = n.slice(1)
  // Celulares: wa.me necesita el 9 después del 54
  if (!n.startsWith('9')) n = '9' + n
  return '54' + n
}

/** Link que abre el chat (o, sin teléfono, el selector de contacto) con el texto */
export function linkWhatsApp(telefono: string | null | undefined, texto: string) {
  const numero = telefonoWhatsApp(telefono)
  return `https://wa.me/${numero ?? ''}?text=${encodeURIComponent(texto)}`
}

const importe = (v: number, moneda: string) =>
  `${moneda === 'USD' ? 'U$D' : '$'} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))}`

export const importes = (o: PorMoneda) => monedasCon(o).map(m => importe(o[m], m)).join(' + ')

const primerNombre = (nombre?: string | null) => (nombre || '').trim().split(/\s+/)[0] || ''

interface DatosMensaje {
  huesped?: string | null
  casa: string
  fecha_inicio: string
  fecha_fin: string
  horario_ingreso?: string | null
  cobrado: PorMoneda
  saldo: PorMoneda
  vencimientoSaldo: string // YYYY-MM-DD
}

const saludo = (d: DatosMensaje) => `¡Hola${primerNombre(d.huesped) ? ` ${primerNombre(d.huesped)}` : ''}!`
const haySaldo = (d: DatosMensaje) => monedasCon(d.saldo).some(m => d.saldo[m] > 0)

export function mensajeConfirmacion(d: DatosMensaje) {
  const partes = [
    `${saludo(d)} Te confirmo la reserva en ${d.casa} del ${formatFecha(d.fecha_inicio)} al ${formatFecha(d.fecha_fin)}.`,
  ]
  if (monedasCon(d.cobrado).length) partes.push(`Recibimos ${importes(d.cobrado)}.`)
  if (haySaldo(d)) partes.push(`El saldo de ${importes(d.saldo)} vence el ${formatFecha(d.vencimientoSaldo)}.`)
  partes.push('¡Gracias!')
  return partes.join(' ')
}

export function mensajeRecordatorioSaldo(d: DatosMensaje) {
  return `${saludo(d)} Te recuerdo que el ${formatFecha(d.vencimientoSaldo)} vence el saldo de la reserva en ${d.casa} ` +
    `(${formatFecha(d.fecha_inicio)} al ${formatFecha(d.fecha_fin)}): ${importes(d.saldo)}. ¿Cómo preferís abonarlo?`
}

export function mensajeIngreso(d: DatosMensaje, linkInfo: string) {
  const hora = (d.horario_ingreso || '14:00').slice(0, 5)
  return `${saludo(d)} Los esperamos el ${formatFecha(d.fecha_inicio)} desde las ${hora} hs en ${d.casa}. ` +
    `Acá tenés la info de la casa y teléfonos útiles: ${linkInfo}. Cualquier cosa, escribime. ¡Buen viaje!`
}
