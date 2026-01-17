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
          className="flex-1 flex items-center justify-between p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-blue-600" />
            <span className="font-medium text-blue-900">Feriados Argentina {year}</span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              {feriados.length} feriados
            </span>
            {feriadosCustom.length > 0 && (
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                {feriadosCustom.length} personalizados
              </span>
            )}
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
            <h4 className="text-xs font-semibold text-costa-navy mb-2">
              Todos los feriados
              <span className="font-normal text-costa-gris ml-1">(click para editar)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
              {Object.entries(feriadosPorMes).map(([mes, feriadosMes]) => (
                <div key={mes}>
                  <div className="text-[10px] font-semibold text-costa-gris uppercase mb-1">{mes}</div>
                  <div className="space-y-0.5">
                    {feriadosMes.map((f, i) => (
                      <div
                        key={i}
                        onClick={() => f.esCustom && openEditModal(f)}
                        className={`text-[10px] p-1 rounded flex items-center justify-between group ${
                          f.esCustom
                            ? 'bg-purple-50 text-purple-700 cursor-pointer hover:bg-purple-100'
                            : f.esFinDeSemanaLargo
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-50 text-gray-700'
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
          <div className="flex gap-4 text-[10px] pt-2 border-t border-costa-beige">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-200"></span>
              <span className="text-costa-gris">FDS largo</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-gray-200"></span>
              <span className="text-costa-gris">Oficial</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-purple-200"></span>
              <span className="text-costa-gris">Personalizado</span>
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
