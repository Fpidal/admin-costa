// Avisos de cobranza y de la temporada, armados con las reglas del contrato:
// el saldo se abona hasta 15 días antes del ingreso. Se calculan con las
// reservas y cobros que ya están cargados; no guardan nada.

import { aFechaISO, parseFechaLocal } from './fechas'
import { montosReserva, monedasCon, type PorMoneda } from './resumenReservas'
import type { ServicioExtra } from './serviciosReserva'

export const DIAS_SALDO_ANTES_DEL_INGRESO = 15
const DIAS_AVISO_PRONTO = 7 // saldo que vence o ingreso que llega en la semana
const DIAS_AVISO_CAMBIO = 14 // cambios de huésped el mismo día

export interface ReservaAviso {
  id: number | string
  propiedad_id: number | string
  fecha_inicio: string
  fecha_fin: string
  horario_ingreso?: string | null
  horario_salida?: string | null
  estado: string
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
  propiedades?: { nombre: string; lote?: string | null }
  inquilinos?: { nombre: string; telefono?: string | null }
}

interface CobroAviso {
  reserva_id: number | string
  monto: number
  moneda: string
  concepto: string
  aplicar_a: string
}

export type TipoAviso = 'saldo' | 'confirmar' | 'ingreso' | 'cambio'
export type Urgencia = 'vencido' | 'pronto' | 'normal'

export interface Aviso<R extends ReservaAviso = ReservaAviso> {
  clave: string
  tipo: TipoAviso
  urgencia: Urgencia
  fecha: string // YYYY-MM-DD del evento (vencimiento, ingreso o cambio)
  reserva: R
  saldo: PorMoneda
  cobrado: PorMoneda
  /** Solo en 'cambio': la reserva que entra ese día */
  entrante?: R
}

const sumarDias = (iso: string, dias: number) => {
  const d = parseFechaLocal(iso)
  d.setDate(d.getDate() + dias)
  return aFechaISO(d)
}

const diasHasta = (hoy: string, iso: string) =>
  Math.round((parseFechaLocal(iso).getTime() - parseFechaLocal(hoy).getTime()) / 86400000)

export const vencimientoSaldo = (fechaInicio: string) => sumarDias(fechaInicio, -DIAS_SALDO_ANTES_DEL_INGRESO)

export function nombreCasa(r: ReservaAviso) {
  const p = r.propiedades
  return p ? `${p.nombre}${p.lote ? ` (Lote ${p.lote})` : ''}` : 'la casa'
}

const ORDEN_URGENCIA: Record<Urgencia, number> = { vencido: 0, pronto: 1, normal: 2 }

export function armarAvisos<R extends ReservaAviso>(reservas: R[], cobros: CobroAviso[], hoyFecha = new Date()): Aviso<R>[] {
  const hoy = aFechaISO(hoyFecha)
  // Solo lo que todavía no terminó: ni canceladas, ni cerradas, ni ya pasadas
  const vigentes = reservas.filter(r => r.estado !== 'cancelada' && r.estado !== 'cerrada' && r.fecha_fin.slice(0, 10) >= hoy)
  const avisos: Aviso<R>[] = []

  for (const r of vigentes) {
    const { saldo, cobrado } = montosReserva(r, cobros)
    const inicio = r.fecha_inicio.slice(0, 10)
    const yaIngreso = inicio < hoy

    if (r.estado === 'pendiente') {
      avisos.push({ clave: `confirmar-${r.id}`, tipo: 'confirmar', urgencia: diasHasta(hoy, inicio) <= 30 ? 'pronto' : 'normal', fecha: inicio, reserva: r, saldo, cobrado })
      continue
    }

    // Saldo: de las confirmadas con algo por cobrar
    if (monedasCon(saldo).some(m => saldo[m] > 0)) {
      const vence = vencimientoSaldo(inicio)
      const dias = diasHasta(hoy, vence)
      const urgencia: Urgencia = dias < 0 ? 'vencido' : dias <= DIAS_AVISO_PRONTO ? 'pronto' : 'normal'
      avisos.push({ clave: `saldo-${r.id}`, tipo: 'saldo', urgencia, fecha: vence, reserva: r, saldo, cobrado })
    }

    // Ingreso en la semana: mandar instrucciones
    const diasIngreso = diasHasta(hoy, inicio)
    if (!yaIngreso && diasIngreso <= DIAS_AVISO_PRONTO) {
      avisos.push({ clave: `ingreso-${r.id}`, tipo: 'ingreso', urgencia: diasIngreso <= 1 ? 'pronto' : 'normal', fecha: inicio, reserva: r, saldo, cobrado })
    }
  }

  // Cambio de huésped: sale uno y entra otro en la misma casa el mismo día
  for (const sale of vigentes) {
    const dia = sale.fecha_fin.slice(0, 10)
    const dias = diasHasta(hoy, dia)
    if (dias < 0 || dias > DIAS_AVISO_CAMBIO) continue
    const entra = vigentes.find(e => e.id !== sale.id && String(e.propiedad_id) === String(sale.propiedad_id) && e.fecha_inicio.slice(0, 10) === dia)
    if (entra) {
      const { saldo, cobrado } = montosReserva(sale, cobros)
      avisos.push({ clave: `cambio-${sale.id}`, tipo: 'cambio', urgencia: dias <= 2 ? 'pronto' : 'normal', fecha: dia, reserva: sale, entrante: entra, saldo, cobrado })
    }
  }

  return avisos.sort((a, b) => ORDEN_URGENCIA[a.urgencia] - ORDEN_URGENCIA[b.urgencia] || a.fecha.localeCompare(b.fecha))
}
