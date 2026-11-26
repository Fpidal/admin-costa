'use client'

import Link from 'next/link'
import { BellRing, MessageCircle, Wallet, Pencil, ArrowLeftRight, KeyRound, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { formatFecha } from '@/lib/fechas'
import { armarAvisos, nombreCasa, vencimientoSaldo, type Aviso, type ReservaAviso } from '@/lib/cobranza'
import { sumarMontos } from '@/lib/resumenReservas'
import { importes, linkWhatsApp, mensajeIngreso, mensajeRecordatorioSaldo, mensajeConfirmacion } from '@/lib/whatsapp'

interface CobroAviso {
  reserva_id: number | string
  monto: number
  moneda: string
  concepto: string
  aplicar_a: string
}

interface Props<R extends ReservaAviso> {
  reservas: R[]
  cobros: CobroAviso[]
  isDemo?: boolean
  linkInfoUtil: string
  onEditar?: (reserva: R) => void
}

const ESTILO_URGENCIA = {
  vencido: { fila: 'bg-red-50 border-red-200', fecha: 'text-red-700', etiqueta: 'Vencido' },
  pronto: { fila: 'bg-costa-coral/10 border-costa-coral/30', fecha: 'text-costa-coral-dark', etiqueta: 'Esta semana' },
  normal: { fila: 'bg-costa-beige-light border-costa-beige', fecha: 'text-costa-gris', etiqueta: '' },
} as const

// Qué es la fecha de cada aviso: el vencimiento del saldo o el día del ingreso/cambio
const etiquetaFecha = (tipo: string, urgencia: string) =>
  tipo === 'saldo' ? (urgencia || 'Vence') : tipo === 'cambio' ? 'Cambio' : 'Ingreso'

const boton = 'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap'

export function AvisosCobranza<R extends ReservaAviso>({ reservas, cobros, isDemo, linkInfoUtil, onEditar }: Props<R>) {
  const avisos = armarAvisos(reservas, cobros)
  if (avisos.length === 0) return null

  const saldos = avisos.filter(a => a.tipo === 'saldo')
  const porCobrar = sumarMontos(saldos.map(a => a.saldo))
  const urgentes = saldos.filter(a => a.urgencia !== 'normal').length

  const datos = (a: Aviso<R>) => ({
    huesped: a.reserva.inquilinos?.nombre,
    casa: nombreCasa(a.reserva),
    fecha_inicio: a.reserva.fecha_inicio,
    fecha_fin: a.reserva.fecha_fin,
    horario_ingreso: a.reserva.horario_ingreso,
    cobrado: a.cobrado,
    saldo: a.saldo,
    vencimientoSaldo: vencimientoSaldo(a.reserva.fecha_inicio),
  })
  const tel = (a: Aviso<R>) => a.reserva.inquilinos?.telefono
  const sufijoDemo = isDemo ? '&demo=true' : ''

  return (
    <Card className="mb-3">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h3 className="flex items-center gap-2 font-semibold text-costa-navy">
            <BellRing size={16} className="text-costa-coral" /> Cobranza y avisos
          </h3>
          {saldos.length > 0 && (
            <p className="text-xs text-costa-gris">
              Por cobrar: <span className="font-semibold text-costa-coral-dark">{importes(porCobrar)}</span>
              {' '}en {saldos.length} reserva{saldos.length !== 1 ? 's' : ''}
              {urgentes > 0 && <> · <span className="font-semibold text-red-700">{urgentes} para esta semana o vencido{urgentes !== 1 ? 's' : ''}</span></>}
            </p>
          )}
        </div>

        <ul className="space-y-1.5">
          {avisos.map(a => {
            const estilo = ESTILO_URGENCIA[a.urgencia]
            const r = a.reserva
            const casa = nombreCasa(r)
            const huesped = r.inquilinos?.nombre?.trim() || 'sin titular'
            return (
              <li key={a.clave} className={`flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 rounded-lg border ${estilo.fila}`}>
                <div className={`sm:w-24 shrink-0 text-xs font-semibold tabular-nums ${estilo.fecha}`}>
                  {formatFecha(a.fecha)}
                  <span className="block font-normal">{etiquetaFecha(a.tipo, estilo.etiqueta)}</span>
                </div>

                <div className="flex-1 min-w-0 text-sm text-costa-navy">
                  {a.tipo === 'saldo' && (
                    <p><span className="font-semibold">{a.urgencia === 'vencido' ? 'Venció el saldo' : 'Vence el saldo'}</span> de {huesped} · {casa}, ingreso {formatFecha(r.fecha_inicio)}: <span className="font-semibold tabular-nums">{importes(a.saldo)}</span></p>
                  )}
                  {a.tipo === 'confirmar' && (
                    <p><span className="font-semibold">Sin confirmar:</span> {huesped} · {casa}, del {formatFecha(r.fecha_inicio)} al {formatFecha(r.fecha_fin)}. Las fechas siguen bloqueadas.</p>
                  )}
                  {a.tipo === 'ingreso' && (
                    <p><span className="font-semibold">Ingresa</span> {huesped} a {casa} a las {(r.horario_ingreso || '14:00').slice(0, 5)} hs. Mandale la info de la casa.</p>
                  )}
                  {a.tipo === 'cambio' && (
                    <p><span className="font-semibold">Cambio de huésped</span> en {casa}: sale {huesped} a las {(r.horario_salida || '10:00').slice(0, 5)} y entra {a.entrante?.inquilinos?.nombre?.trim() || 'otra reserva'} a las {(a.entrante?.horario_ingreso || '14:00').slice(0, 5)}. Coordinar la limpieza.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {a.tipo === 'saldo' && (
                    <>
                      <Link href={`/admin/reservas/${r.id}/cobros?registrar=saldo${sufijoDemo}`} className={`${boton} text-white bg-costa-navy border-costa-navy hover:bg-costa-navy-light`}>
                        <Wallet size={13} /> Registrar pago
                      </Link>
                      <a href={linkWhatsApp(tel(a), mensajeRecordatorioSaldo(datos(a)))} target="_blank" rel="noopener noreferrer" className={`${boton} text-costa-olivo border-costa-olivo/40 hover:bg-costa-olivo/10`}>
                        <MessageCircle size={13} /> Recordar
                      </a>
                    </>
                  )}
                  {a.tipo === 'confirmar' && (
                    <>
                      {onEditar && (
                        <button onClick={() => onEditar(r)} className={`${boton} text-costa-navy border-costa-navy/25 hover:bg-costa-navy/5`}>
                          <Pencil size={13} /> Confirmar o liberar
                        </button>
                      )}
                      <a href={linkWhatsApp(tel(a), mensajeConfirmacion(datos(a)))} target="_blank" rel="noopener noreferrer" className={`${boton} text-costa-olivo border-costa-olivo/40 hover:bg-costa-olivo/10`} title="Mensaje de confirmación, para mandar cuando entre la seña">
                        <MessageCircle size={13} /> Confirmación
                      </a>
                    </>
                  )}
                  {a.tipo === 'ingreso' && (
                    <a href={linkWhatsApp(tel(a), mensajeIngreso(datos(a), linkInfoUtil))} target="_blank" rel="noopener noreferrer" className={`${boton} text-costa-olivo border-costa-olivo/40 hover:bg-costa-olivo/10`}>
                      <KeyRound size={13} /> Enviar info
                    </a>
                  )}
                  {a.tipo === 'cambio' && (
                    <span className={`${boton} text-costa-gris border-transparent`}><ArrowLeftRight size={13} /> Mismo día</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[0.7em] text-costa-gris flex items-center gap-1">
          <Clock size={11} /> El saldo vence 15 días antes del ingreso, como dice el contrato.
        </p>
      </CardContent>
    </Card>
  )
}
