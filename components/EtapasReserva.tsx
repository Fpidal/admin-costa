'use client'

import { Check } from 'lucide-react'

// Etapas de una reserva, de la consulta al cierre. Cada una se marca sola con
// los datos ya cargados (pagos, fechas, liquidación); no hay que tildar nada.
// La primera sin completar es "la de ahora" y trae el botón para resolverla.

export interface Etapa {
  clave: string
  titulo: string
  detalle?: string
  hecha: boolean
  accion?: { texto: string; onClick: () => void }
}

export function EtapasReserva({ etapas }: { etapas: Etapa[] }) {
  const actual = etapas.findIndex(e => !e.hecha)
  const enCurso = actual === -1 ? null : etapas[actual]

  return (
    <div className="rounded-xl border border-costa-borde bg-costa-superficie px-4 py-3 mb-4">
      <ol className="grid grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-0">
        {etapas.map((e, i) => {
          const ahora = i === actual
          return (
            <li key={e.clave} className="relative flex sm:flex-col items-center sm:text-center gap-3 sm:gap-1.5">
              {/* Línea que une con la etapa anterior (solo en pantallas anchas) */}
              {i > 0 && (
                <span className={`hidden sm:block absolute top-3 right-1/2 w-full h-0.5 -z-0 ${etapas[i - 1].hecha ? 'bg-costa-olivo' : 'bg-costa-borde'}`} />
              )}
              <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                e.hecha
                  ? 'border-costa-olivo bg-costa-olivo text-white'
                  : ahora
                    ? 'border-costa-coral-dark bg-costa-superficie text-costa-coral-dark ring-4 ring-costa-coral/15'
                    : 'border-costa-borde bg-costa-superficie text-costa-gris'
              }`}>
                {e.hecha ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${ahora ? 'text-costa-coral-dark' : e.hecha ? 'text-costa-navy' : 'text-costa-gris'}`}>{e.titulo}</span>
                {e.detalle && <span className={`block text-xs ${ahora ? 'text-costa-coral-dark' : 'text-costa-gris'}`}>{e.detalle}</span>}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-3 pt-3 border-t border-costa-borde flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-costa-navy">
          {enCurso ? <>Ahora: <span className="font-semibold">{enCurso.titulo}</span>{enCurso.detalle ? ` · ${enCurso.detalle}` : ''}</> : <span className="font-semibold text-costa-olivo">Alquiler cerrado ✓</span>}
        </p>
        {enCurso?.accion && (
          <button
            type="button"
            onClick={enCurso.accion.onClick}
            className="inline-flex items-center gap-1.5 rounded-lg bg-costa-esmeralda px-3 py-1.5 text-sm font-semibold text-white hover:bg-costa-esmeralda-light"
          >
            {enCurso.accion.texto}
          </button>
        )}
      </div>
    </div>
  )
}
