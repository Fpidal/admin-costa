'use client'

import { useMemo, useState } from 'react'
import { generarFeriadosAnio, obtenerFinesDeSemanaLargos, Feriado } from '@/lib/calendarioArgentina'
import { ChevronDown, ChevronUp, Calendar, Flag } from 'lucide-react'

interface PanelFeriadosProps {
  year: number
}

export function PanelFeriados({ year }: PanelFeriadosProps) {
  const [expanded, setExpanded] = useState(false)

  const feriados = useMemo(() => generarFeriadosAnio(year), [year])
  const fdsLargos = useMemo(() => obtenerFinesDeSemanaLargos(year), [year])

  const formatFecha = (fecha: string) => {
    const d = new Date(`${fecha}T00:00:00`)
    return d.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    })
  }

  // Agrupar por mes
  const feriadosPorMes = useMemo(() => {
    const grupos: Record<string, Feriado[]> = {}
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    feriados.forEach(f => {
      const mes = new Date(`${f.fecha}T00:00:00`).getMonth()
      const nombreMes = meses[mes]
      if (!grupos[nombreMes]) grupos[nombreMes] = []
      grupos[nombreMes].push(f)
    })

    return grupos
  }, [feriados])

  return (
    <div className="space-y-3">
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Flag size={16} className="text-blue-600" />
          <span className="font-medium text-blue-900">Feriados Argentina {year}</span>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            {feriados.length} feriados
          </span>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Fines de semana largos */}
          <div>
            <h4 className="text-xs font-semibold text-costa-navy mb-2 flex items-center gap-1">
              <Calendar size={12} />
              Fines de Semana Largos ({fdsLargos.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fdsLargos.map((fds, i) => (
                <div
                  key={i}
                  className="p-2 bg-amber-50 border border-amber-200 rounded text-xs"
                >
                  <div className="font-medium text-amber-800">{fds.nombre}</div>
                  <div className="text-amber-600">
                    {formatFecha(fds.fechaInicio)} → {formatFecha(fds.fechaFin)}
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-200 rounded text-amber-700">
                      {fds.dias} días
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de feriados por mes */}
          <div>
            <h4 className="text-xs font-semibold text-costa-navy mb-2">Todos los feriados</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {Object.entries(feriadosPorMes).map(([mes, feriadosMes]) => (
                <div key={mes}>
                  <div className="text-[10px] font-semibold text-costa-gris uppercase mb-1">{mes}</div>
                  <div className="space-y-0.5">
                    {feriadosMes.map((f, i) => (
                      <div
                        key={i}
                        className={`text-[10px] p-1 rounded ${
                          f.esFinDeSemanaLargo
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="font-medium truncate">{f.nombre}</div>
                        <div className="text-[9px] opacity-75">{formatFecha(f.fecha)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 text-[10px] pt-2 border-t border-costa-beige">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-200"></span>
              <span className="text-costa-gris">Fin de semana largo</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-gray-200"></span>
              <span className="text-costa-gris">Feriado normal</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
