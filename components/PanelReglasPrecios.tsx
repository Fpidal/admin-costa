'use client'

import { useState } from 'react'
import {
  PriceRule,
  PriceCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DAYS_LABELS,
  detectConflicts,
  generateCostaEsmeraldaPreset,
  ConflictWarning
} from '@/lib/priceRules'
import { Card, CardContent, Button, Modal, Badge } from '@/components/ui'
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  AlertTriangle,
  Save,
  Sparkles,
  ArrowUpDown,
  Check,
  X
} from 'lucide-react'

interface PanelReglasPreciosProps {
  rules: PriceRule[]
  propertyId: string
  year: number
  onSave: (rules: PriceRule[]) => Promise<void>
  onDelete: (ruleId: string) => Promise<void>
  saving: boolean
}

const CATEGORIES: PriceCategory[] = ['muy_alta', 'alta', 'media', 'baja', 'excepcion']

export function PanelReglasPrecios({
  rules,
  propertyId,
  year,
  onSave,
  onDelete,
  saving
}: PanelReglasPreciosProps) {
  const [localRules, setLocalRules] = useState<PriceRule[]>(rules)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [presetBasePrice, setPresetBasePrice] = useState(300)
  const [hasChanges, setHasChanges] = useState(false)

  // Detectar conflictos
  const conflicts = detectConflicts(localRules)

  // Formulario de regla
  const [form, setForm] = useState<Omit<PriceRule, 'id' | 'property_id' | 'user_id' | 'created_at'>>({
    name: '',
    category: 'media',
    price_per_night: 300,
    start_date: '',
    end_date: '',
    applies_to_days: [],
    min_nights: null,
    priority: 50,
    active: true,
  })

  function openAddModal() {
    setForm({
      name: '',
      category: 'media',
      price_per_night: 300,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      applies_to_days: [],
      min_nights: null,
      priority: 50,
      active: true,
    })
    setEditingRule(null)
    setIsModalOpen(true)
  }

  function openEditModal(rule: PriceRule) {
    setForm({
      name: rule.name,
      category: rule.category,
      price_per_night: rule.price_per_night,
      start_date: rule.start_date,
      end_date: rule.end_date,
      applies_to_days: rule.applies_to_days || [],
      min_nights: rule.min_nights,
      priority: rule.priority,
      active: rule.active,
    })
    setEditingRule(rule)
    setIsModalOpen(true)
  }

  function handleSaveRule() {
    if (!form.name || !form.start_date || !form.end_date || form.price_per_night <= 0) {
      alert('Complete todos los campos obligatorios')
      return
    }

    const newRule: PriceRule = {
      ...form,
      id: editingRule?.id || `temp-${Date.now()}`,
      property_id: propertyId,
    }

    if (editingRule) {
      setLocalRules(prev => prev.map(r => r.id === editingRule.id ? newRule : r))
    } else {
      setLocalRules(prev => [...prev, newRule])
    }

    setHasChanges(true)
    setIsModalOpen(false)
  }

  function handleDuplicateRule(rule: PriceRule) {
    const duplicated: PriceRule = {
      ...rule,
      id: `temp-${Date.now()}`,
      name: `${rule.name} (copia)`,
    }
    setLocalRules(prev => [...prev, duplicated])
    setHasChanges(true)
  }

  function handleDeleteRule(ruleId: string) {
    if (!confirm('¿Eliminar esta regla?')) return
    setLocalRules(prev => prev.filter(r => r.id !== ruleId))
    setHasChanges(true)
  }

  function handleToggleActive(ruleId: string) {
    setLocalRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, active: !r.active } : r
    ))
    setHasChanges(true)
  }

  function handleSortByPriority() {
    setLocalRules(prev => [...prev].sort((a, b) => b.priority - a.priority))
  }

  async function handleSaveAll() {
    await onSave(localRules)
    setHasChanges(false)
  }

  function handleApplyPreset() {
    const preset = generateCostaEsmeraldaPreset(year, presetBasePrice)
    const newRules = preset.rules.map((r, i) => ({
      ...r,
      id: `preset-${Date.now()}-${i}`,
      property_id: propertyId,
    }))
    setLocalRules(newRules)
    setHasChanges(true)
    setIsPresetModalOpen(false)
  }

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      applies_to_days: prev.applies_to_days.includes(day)
        ? prev.applies_to_days.filter(d => d !== day)
        : [...prev.applies_to_days, day]
    }))
  }

  function formatDateDisplay(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short'
    })
  }

  function getDaysLabel(days: string[]) {
    if (!days || days.length === 0) return 'Todos'
    if (days.length === 7) return 'Todos'
    return days.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')
  }

  return (
    <div className="space-y-4">
      {/* Header con botones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-costa-navy">Reglas de Precios</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsPresetModalOpen(true)}>
            <Sparkles size={14} />
            Aplicar Preset
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSortByPriority}>
            <ArrowUpDown size={14} />
            Ordenar
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus size={14} />
            Agregar Regla
          </Button>
        </div>
      </div>

      {/* Alertas de conflictos */}
      {conflicts.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <AlertTriangle size={16} />
            Conflictos detectados
          </div>
          <ul className="text-sm text-amber-600 space-y-1">
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabla de reglas */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-costa-beige">
              <th className="text-left py-2 px-2 font-medium text-costa-gris">Activa</th>
              <th className="text-left py-2 px-2 font-medium text-costa-gris">Nombre</th>
              <th className="text-left py-2 px-2 font-medium text-costa-gris">Categoría</th>
              <th className="text-right py-2 px-2 font-medium text-costa-gris">USD/noche</th>
              <th className="text-left py-2 px-2 font-medium text-costa-gris">Fechas</th>
              <th className="text-left py-2 px-2 font-medium text-costa-gris">Días</th>
              <th className="text-center py-2 px-2 font-medium text-costa-gris">Prio</th>
              <th className="text-center py-2 px-2 font-medium text-costa-gris">Min.</th>
              <th className="text-right py-2 px-2 font-medium text-costa-gris">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {localRules.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-costa-gris">
                  No hay reglas configuradas. Agregue una regla o aplique un preset.
                </td>
              </tr>
            ) : (
              localRules.map((rule) => {
                const colors = CATEGORY_COLORS[rule.category]
                return (
                  <tr
                    key={rule.id}
                    className={`border-b border-costa-beige/50 ${!rule.active ? 'opacity-50' : ''}`}
                  >
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleToggleActive(rule.id!)}
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          rule.active ? 'bg-costa-olivo text-white' : 'bg-gray-200'
                        }`}
                      >
                        {rule.active && <Check size={12} />}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-medium">{rule.name}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}>
                        {CATEGORY_LABELS[rule.category]}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">${rule.price_per_night}</td>
                    <td className="py-2 px-2 text-xs">
                      {formatDateDisplay(rule.start_date)} → {formatDateDisplay(rule.end_date)}
                    </td>
                    <td className="py-2 px-2 text-xs">{getDaysLabel(rule.applies_to_days)}</td>
                    <td className="py-2 px-2 text-center font-mono text-xs">{rule.priority}</td>
                    <td className="py-2 px-2 text-center">{rule.min_nights || '-'}</td>
                    <td className="py-2 px-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1 hover:bg-costa-beige rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} className="text-costa-gris" />
                        </button>
                        <button
                          onClick={() => handleDuplicateRule(rule)}
                          className="p-1 hover:bg-costa-beige rounded transition-colors"
                          title="Duplicar"
                        >
                          <Copy size={14} className="text-costa-gris" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id!)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} className="text-costa-coral" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Botón guardar cambios */}
      {hasChanges && (
        <div className="flex justify-end pt-3 border-t border-costa-beige">
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save size={14} />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      )}

      {/* Modal de edición de regla */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? 'Editar Regla' : 'Nueva Regla'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              placeholder="Ej: Temporada Alta Enero"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Categoría *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as PriceCategory })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Precio/noche (USD) *</label>
              <input
                type="number"
                value={form.price_per_night}
                onChange={(e) => setForm({ ...form, price_per_night: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha inicio *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha fin *</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Días de la semana</label>
            <div className="flex gap-1">
              {DAYS_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    form.applies_to_days.includes(key)
                      ? 'bg-costa-navy text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-costa-gris mt-1">
              {form.applies_to_days.length === 0 ? 'Aplica a todos los días' : 'Aplica solo a los días seleccionados'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Prioridad</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
                min="1"
                max="100"
              />
              <p className="text-xs text-costa-gris mt-1">
                100=máx, 90=fiestas, 80=fds largo, 50=temporada, 40=base
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mínimo noches</label>
              <input
                type="number"
                value={form.min_nights || ''}
                onChange={(e) => setForm({ ...form, min_nights: e.target.value ? Number(e.target.value) : null })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
                min="1"
                placeholder="Sin mínimo"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Regla activa</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRule}>
              <Save size={14} />
              {editingRule ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de preset */}
      <Modal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        title="Aplicar Preset"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle size={14} className="inline mr-1" />
            Esto reemplazará todas las reglas actuales
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Precio base (USD)</label>
            <input
              type="number"
              value={presetBasePrice}
              onChange={(e) => setPresetBasePrice(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              min="100"
            />
            <p className="text-xs text-costa-gris mt-1">
              Los precios se calcularán como múltiplos de este valor
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleApplyPreset}
              className="w-full p-3 border border-gray-200 rounded-lg hover:border-costa-navy transition-colors text-left"
            >
              <div className="font-medium text-costa-navy">Verano Costa Esmeralda - Standard</div>
              <p className="text-xs text-costa-gris mt-1">
                Incluye: Fiestas, Enero Alta, Febrero, Semana Santa, Carnaval, Fds, Temporada Baja
              </p>
            </button>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => setIsPresetModalOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
