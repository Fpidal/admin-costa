'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Copy, CalendarPlus, X, Check } from 'lucide-react'
import { formatFecha } from '@/lib/fechas'
import { nochesEntre } from '@/lib/resumenReservas'
import { linkWhatsApp, mensajeOferta } from '@/lib/whatsapp'

// Panel para ofrecer un hueco libre por WhatsApp: fechas dentro del hueco,
// precio por noche sugerido (editable) y el mensaje listo para mandar.

export interface PrecioSugerido {
  precio: number
  moneda: string
  origen: string // de dónde salió, para mostrarlo
}

interface Props {
  casa: { id: string | number; nombre: string; lote: string | null }
  hueco: { desde: string; hasta: string }
  sugerido: PrecioSugerido
  linkSitio: string
  demoAmp: string
  onCerrar: () => void
}

export function OfertaHueco({ casa, hueco, sugerido, linkSitio, demoAmp, onCerrar }: Props) {
  const [desde, setDesde] = useState(hueco.desde)
  const [hasta, setHasta] = useState(hueco.hasta)
  const [precio, setPrecio] = useState(sugerido.precio)
  const [copiado, setCopiado] = useState(false)

  const noches = Math.max(0, nochesEntre(desde, hasta))
  const nombre = `${casa.nombre}${casa.lote ? ` (Lote ${casa.lote})` : ''}`
  const texto = mensajeOferta({ casa: nombre, desde, hasta, noches, precioNoche: precio, moneda: sugerido.moneda, linkSitio })
  const simbolo = sugerido.moneda === 'USD' ? 'U$D' : '$'
  const valido = noches > 0

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-costa-esmeralda/30 bg-costa-esmeralda-suave/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-costa-esmeralda">Ofrecer fechas libres · {nombre}</h3>
          <p className="text-xs text-costa-gris">Libre del {formatFecha(hueco.desde)} al {formatFecha(hueco.hasta)}. Podés ofrecer todo el hueco o una parte.</p>
        </div>
        <button onClick={onCerrar} className="rounded p-1 text-costa-gris hover:bg-white/60" title="Cerrar"><X size={16} /></button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,160px))_1fr] items-end">
        <label className="text-xs font-semibold text-costa-navy">
          Desde
          <input type="date" value={desde} min={hueco.desde} max={hasta} onChange={e => setDesde(e.target.value)}
            className="mt-1 w-full rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-costa-navy">
          Hasta
          <input type="date" value={hasta} min={desde} max={hueco.hasta} onChange={e => setHasta(e.target.value)}
            className="mt-1 w-full rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-costa-navy">
          Precio por noche ({simbolo})
          <input type="number" min={0} value={precio || ''} onChange={e => setPrecio(Number(e.target.value) || 0)} placeholder="Sin precio"
            className="mt-1 w-full rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-normal tabular-nums" />
        </label>
        <p className="text-sm text-costa-navy tabular-nums">
          {noches} noche{noches !== 1 ? 's' : ''}
          {precio > 0 && <> · <span className="font-bold">{simbolo} {new Intl.NumberFormat('es-AR').format(precio * noches)}</span> en total</>}
          <span className="block text-xs text-costa-gris">{sugerido.origen}</span>
        </p>
      </div>

      <p className="mt-3 rounded-lg bg-costa-superficie px-3 py-2 text-sm leading-snug text-costa-navy border border-costa-borde">{texto}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href={valido ? linkWhatsApp(null, texto) : undefined} target="_blank" rel="noopener noreferrer"
          aria-disabled={!valido}
          className={`inline-flex items-center gap-1.5 rounded-lg bg-costa-olivo px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 ${valido ? '' : 'pointer-events-none opacity-50'}`}>
          <MessageCircle size={15} /> Abrir WhatsApp
        </a>
        <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-lg border border-costa-borde bg-costa-superficie px-3 py-1.5 text-sm font-semibold text-costa-navy hover:bg-costa-arena">
          {copiado ? <Check size={15} className="text-costa-olivo" /> : <Copy size={15} />} {copiado ? 'Copiado' : 'Copiar texto'}
        </button>
        <Link href={`/admin/reservas?nueva=1&propiedad=${casa.id}&desde=${desde}&hasta=${hasta}${demoAmp}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-costa-borde bg-costa-superficie px-3 py-1.5 text-sm font-semibold text-costa-esmeralda hover:bg-costa-arena">
          <CalendarPlus size={15} /> Cargar reserva con estas fechas
        </Link>
      </div>
    </div>
  )
}
