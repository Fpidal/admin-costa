'use client'

import { PageHeader } from '@/components/PageHeader'
import { VERSIONES } from '@/lib/versiones'

// Historial de versiones: qué cambió en el panel y cuándo
export default function VersionesPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Versiones" description="Los cambios que se van haciendo en el sistema, de la más nueva a la más vieja" />
      <ol className="space-y-4">
        {VERSIONES.map((v, i) => (
          <li key={v.version} className="rounded-xl border border-costa-borde bg-costa-superficie p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${i === 0 ? 'bg-costa-esmeralda text-white' : 'bg-costa-arena text-costa-esmeralda'}`}>v{v.version}</span>
              <h2 className="text-base font-bold text-costa-esmeralda">{v.titulo}</h2>
              <span className="ml-auto text-xs text-costa-gris tabular-nums">{v.fecha}{i === 0 ? ' · actual' : ''}</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-costa-navy">
              {v.cambios.map(c => <li key={c}>{c}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
