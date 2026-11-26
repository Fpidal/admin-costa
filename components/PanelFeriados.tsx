'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  generarFeriadosAnio,
  obtenerFinesDeSemanaLargos,
  combinarFeriados,
  Feriado,
  FeriadoCustom
} from '@/lib/calendarioArgentina'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Modal, Button } from '@/components/ui'
import { ChevronDown, ChevronUp, Calendar, Flag, Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface PanelFeriadosProps {
  year: number
  onFeriadosChange?: (feriados: FeriadoCustom[]) => void
}

export function PanelFeriados({ year, onFeriadosChange }: PanelFeriadosProps) {
  const { userId } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [feriadosCustom, setFeriadosCustom] = useState<FeriadoCustom[]>([])
  const [loading, setLoading] = useState(false)

  // Modal de edición
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFeriado, setEditingFeriado] = useState<FeriadoCustom | null>(null)
  const [form, setForm] = useState({
    fecha: '',
    nombre: '',
    tipo: 'custom' as FeriadoCustom['tipo']
  })

  // Cargar feriados personalizados
  useEffect(() => {
    if (userId) {
      loadFeriadosCustom()
    }
  }, [userId, year])

  async function loadFeriadosCustom() {
    const { data } = await supabase
      .from('feriados_custom')
      .select('*')
      .eq('user_id', userId)
      .gte('fecha', `${year}-01-01`)
      .lte('fecha', `${year}-12-31`)
      .order('fecha')

    if (data) {
      setFeriadosCustom(data)
      onFeriadosChange?.(data)
    }
  }

  // Combinar feriados oficiales con personalizados
  const feriados = useMemo(() =>
    combinarFeriados(year, feriadosCustom),
    [year, feriadosCustom]
  )

  const fdsLargos = useMemo(() =>
    obtenerFinesDeSemanaLargos(year),
    [year]
  )

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

  function openAddModal() {
    setForm({
      fecha: `${year}-01-01`,
      nombre: '',
      tipo: 'custom'
    })
    setEditingFeriado(null)
    setModalOpen(true)
  }

  function openEditModal(feriado: Feriado) {
    setForm({
      fecha: feriado.fecha,
      nombre: feriado.nombre,
      tipo: feriado.tipo
    })
    setEditingFeriado(feriado as FeriadoCustom)
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.fecha || !form.nombre || !userId) return
    setLoading(true)

    try {
      if (editingFeriado?.id) {
        // Actualizar existente
        await supabase
          .from('feriados_custom')
          .update({
            fecha: form.fecha,
            nombre: form.nombre,
            tipo: form.tipo
          })
          .eq('id', editingFeriado.id)
      } else {
        // Crear nuevo
        await supabase
          .from('feriados_custom')
          .insert({
            fecha: form.fecha,
            nombre: form.nombre,
            tipo: form.tipo,
            user_id: userId
          })
      }

      await loadFeriadosCustom()
      setModalOpen(false)
    } catch (err) {
      console.error('Error guardando feriado:', err)
    }

    setLoading(false)
  }

  async function handleDelete(feriado: Feriado) {
    if (!feriado.esCustom || !feriado.id) {
      alert('Solo se pueden eliminar feriados personalizados')
      return
    }

    if (!confirm(`¿Eliminar "${feriado.nombre}"?`)) return

    setLoading(true)
    await supabase.from('feriados_custom').delete().eq('id', feriado.id)
    await loadFeriadosCustom()
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {/* Header colapsable */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between px-1 py-1 rounded-lg text-costa-esmeralda"
        >
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-[#c8692b]" />
            <span className="text-sm font-bold text-costa-esmeralda">Feriados {year}</span>
            <span className="text-xs text-costa-gris bg-costa-arena px-2 py-0.5 rounded-full">
              {feriados.length} feriados
            </span>
            {feriadosCustom.length > 0 && (
              <span className="text-xs text-costa-esmeralda bg-costa-esmeralda-suave px-2 py-0.5 rounded-full">
                {feriadosCustom.length} personalizados
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold">{expanded ? 'Ocultar' : 'Ver'}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>
        <Button size="sm" variant="secondary" onClick={openAddModal} className="ml-2">
          <Plus size={14} />
          Agregar
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Fines de semana largos */}
          <div>
            <h4 className="text-xs font-bold text-costa-esmeralda mb-2 flex items-center gap-1">
              <Calendar size={12} />
              Fines de semana largos ({fdsLargos.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fdsLargos.map((fds, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-white border border-costa-borde rounded-lg text-xs"
                >
                  <div className="font-semibold text-costa-esmeralda">{fds.nombre}</div>
                  <div className="text-costa-gris mt-0.5">
                    {formatFecha(fds.fechaInicio)} → {formatFecha(fds.fechaFin)}
                    <span className="ml-2 px-1.5 py-0.5 bg-[#f6e1cf] rounded text-[#8a3f12] font-semibold">
                      {fds.dias} días
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de feriados por mes */}
          <div>
            <h4 className="text-xs font-bold text-costa-esmeralda mb-2">
              Todos los feriados
              <span className="font-normal text-costa-gris ml-1">(los que agregaste vos se pueden editar)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {Object.entries(feriadosPorMes).map(([mes, feriadosMes]) => (
                <div key={mes}>
                  <div className="text-[10px] font-bold text-costa-gris uppercase tracking-wider mb-1">{mes}</div>
                  <div className="space-y-0.5">
                    {feriadosMes.map((f, i) => (
                      <div
                        key={i}
                        onClick={() => f.esCustom && openEditModal(f)}
                        className={`text-[11px] px-1.5 py-1 rounded-md flex items-center justify-between group ${
                          f.esCustom
                            ? 'bg-costa-esmeralda-suave text-costa-esmeralda cursor-pointer hover:bg-[#d3e6e1]'
                            : f.esFinDeSemanaLargo
                              ? 'bg-[#f6e1cf] text-[#8a3f12]'
                              : 'bg-white border border-costa-borde text-costa-esmeralda'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{f.nombre}</div>
                          <div className="text-[9px] opacity-75">{formatFecha(f.fecha)}</div>
                        </div>
                        {f.esCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(f)
                            }}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity"
                          >
                            <Trash2 size={10} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 text-[11px] pt-2 border-t border-costa-borde">
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded bg-[#f6e1cf]"></span>
              <span className="text-costa-gris">Fin de semana largo</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded bg-white border border-costa-borde"></span>
              <span className="text-costa-gris">Oficial</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-2.5 rounded bg-costa-esmeralda-suave"></span>
              <span className="text-costa-gris">Agregado por vos</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFeriado ? 'Editar Feriado' : 'Agregar Feriado'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              placeholder="Ej: Día del Amigo"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as FeriadoCustom['tipo'] })}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
            >
              <option value="custom">Personalizado</option>
              <option value="inamovible">Feriado Inamovible</option>
              <option value="trasladable">Feriado Trasladable</option>
              <option value="puente">Día Puente</option>
              <option value="no_laborable">No Laborable</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !form.nombre || !form.fecha}>
              <Save size={14} />
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
