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
  AlertTriangle,
  Save,
  Sparkles,
  ArrowUpDown,
  Check,
  Copy
} from 'lucide-react'

interface PanelReglasPreciosProps {
  rules: PriceRule[]
  propertyId: string
  year: number
  onSave: (rules: PriceRule[]) => Promise<void>
  onDelete: (ruleId: string) => Promise<void>
  onApplyToAll?: (rules: PriceRule[]) => Promise<void>
  saving: boolean
}

const CATEGORIES: PriceCategory[] = ['muy_alta', 'alta', 'media', 'baja', 'excepcion']

export function PanelReglasPrecios({
  rules,
  propertyId,
  year,
  onSave,
  onDelete,
  onApplyToAll,
  saving
}: PanelReglasPreciosProps) {
  const [localRules, setLocalRules] = useState<PriceRule[]>(rules)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [isApplyAllModalOpen, setIsApplyAllModalOpen] = useState(false)
  const [applyingToAll, setApplyingToAll] = useState(false)
  const [presetBasePrice, setPresetBasePrice] = useState(300)
  const [hasChanges, setHasChanges] = useState(false)

  // Multiplicadores personalizables del preset
  const [presetMultipliers, setPresetMultipliers] = useState({
    fiestas: 1.8,
    enero: 1.5,
    feb1: 1.3,
    feb2: 1.1,
    semanaSanta: 1.3,
    carnaval: 1.3,
    fds: 1.0,
    baja: 0.8,
  })

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
    priority: 2,
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
      priority: 2,
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
    // Calcular fechas móviles
    const getEasterDate = (y: number) => {
      const a = y % 19
      const b = Math.floor(y / 100)
      const c = y % 100
      const d = Math.floor(b / 4)
      const e = b % 4
      const f = Math.floor((b + 8) / 25)
      const g = Math.floor((b - f + 1) / 3)
      const h = (19 * a + b - d - g + 15) % 30
      const i = Math.floor(c / 4)
      const k = c % 4
      const l = (32 + 2 * e + 2 * i - h - k) % 7
      const m = Math.floor((a + 11 * h + 22 * l) / 451)
      const month = Math.floor((h + l - 7 * m + 114) / 31)
      const day = ((h + l - 7 * m + 114) % 31) + 1
      return new Date(y, month - 1, day)
    }

    const easter = getEasterDate(year)
    const holyWeekStart = new Date(easter)
    holyWeekStart.setDate(easter.getDate() - 7)
    const holyWeekEnd = new Date(easter)
    holyWeekEnd.setDate(easter.getDate() + 1)
    const carnivalStart = new Date(easter)
    carnivalStart.setDate(easter.getDate() - 49)
    const carnivalEnd = new Date(easter)
    carnivalEnd.setDate(easter.getDate() - 46)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    const newRules: PriceRule[] = [
      {
        id: `preset-${Date.now()}-0`,
        property_id: propertyId,
        name: 'Fiestas',
        category: 'muy_alta',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.fiestas),
        start_date: `${year}-12-23`,
        end_date: `${year + 1}-01-02`,
        applies_to_days: [],
        min_nights: 7,
        priority: 5,
        active: true,
      },
      {
        id: `preset-${Date.now()}-1`,
        property_id: propertyId,
        name: 'Enero - Temporada Alta',
        category: 'alta',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.enero),
        start_date: `${year}-01-03`,
        end_date: `${year}-01-31`,
        applies_to_days: [],
        min_nights: 3,
        priority: 2,
        active: true,
      },
      {
        id: `preset-${Date.now()}-2`,
        property_id: propertyId,
        name: 'Febrero 1ra quincena',
        category: 'alta',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.feb1),
        start_date: `${year}-02-01`,
        end_date: `${year}-02-15`,
        applies_to_days: [],
        min_nights: 2,
        priority: 2,
        active: true,
      },
      {
        id: `preset-${Date.now()}-3`,
        property_id: propertyId,
        name: 'Febrero 2da quincena',
        category: 'media',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.feb2),
        start_date: `${year}-02-16`,
        end_date: `${year}-02-28`,
        applies_to_days: [],
        min_nights: 2,
        priority: 2,
        active: true,
      },
      {
        id: `preset-${Date.now()}-4`,
        property_id: propertyId,
        name: 'Semana Santa',
        category: 'alta',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.semanaSanta),
        start_date: formatDate(holyWeekStart),
        end_date: formatDate(holyWeekEnd),
        applies_to_days: [],
        min_nights: 3,
        priority: 4,
        active: true,
      },
      {
        id: `preset-${Date.now()}-5`,
        property_id: propertyId,
        name: 'Carnaval',
        category: 'alta',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.carnaval),
        start_date: formatDate(carnivalStart),
        end_date: formatDate(carnivalEnd),
        applies_to_days: [],
        min_nights: 2,
        priority: 4,
        active: true,
      },
      {
        id: `preset-${Date.now()}-6`,
        property_id: propertyId,
        name: 'Fds fuera temporada',
        category: 'media',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.fds),
        start_date: `${year}-03-01`,
        end_date: `${year}-12-22`,
        applies_to_days: ['vie', 'sab', 'dom'],
        min_nights: 2,
        priority: 3,
        active: true,
      },
      {
        id: `preset-${Date.now()}-7`,
        property_id: propertyId,
        name: 'Temporada Baja',
        category: 'baja',
        price_per_night: Math.round(presetBasePrice * presetMultipliers.baja),
        start_date: `${year}-03-01`,
        end_date: `${year}-12-22`,
        applies_to_days: [],
        min_nights: 1,
        priority: 1,
        active: true,
      },
    ]

    setLocalRules(newRules)
    setHasChanges(true)
    setIsPresetModalOpen(false)
  }

  async function handleApplyToAll() {
    if (!onApplyToAll) return
    setApplyingToAll(true)
    try {
      await onApplyToAll(localRules)
      setIsApplyAllModalOpen(false)
    } catch (err) {
      console.error('Error aplicando a todas:', err)
    }
    setApplyingToAll(false)
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsPresetModalOpen(true)}>
            <Sparkles size={14} />
            Preset
          </Button>
          {onApplyToAll && localRules.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setIsApplyAllModalOpen(true)}>
              <Copy size={14} />
              Aplicar a Todas
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleSortByPriority}>
            <ArrowUpDown size={14} />
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus size={14} />
            Agregar
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
              <th className="text-center py-2 px-2 font-medium text-costa-gris">Cat.</th>
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
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`w-3 h-3 rounded-full inline-block ${colors.solid}`}
                        title={CATEGORY_LABELS[rule.category]}
                      />
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
              <label className="block text-sm text-gray-600 mb-1">Prioridad (1-5)</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Math.min(5, Math.max(1, Number(e.target.value))) })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
                min="1"
                max="5"
              />
              <p className="text-xs text-costa-gris mt-1">
                5=máxima, 4=especiales, 3=fds, 2=temporada, 1=base
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
        title="Aplicar Preset - Costa Esmeralda"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle size={14} className="inline mr-1" />
            Esto reemplazará todas las reglas actuales
          </div>

          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Precio base (USD)</label>
            <input
              type="number"
              value={presetBasePrice}
              onChange={(e) => setPresetBasePrice(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              min="100"
            />
            <p className="text-xs text-costa-gris mt-1">
              Precio de referencia para un fin de semana fuera de temporada
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-costa-navy mb-2">Multiplicadores por temporada</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'fiestas', label: 'Fiestas (23/12-02/01)', color: 'text-red-600' },
                { key: 'enero', label: 'Enero', color: 'text-orange-600' },
                { key: 'feb1', label: 'Feb 1ra quincena', color: 'text-orange-500' },
                { key: 'feb2', label: 'Feb 2da quincena', color: 'text-yellow-600' },
                { key: 'semanaSanta', label: 'Semana Santa', color: 'text-orange-600' },
                { key: 'carnaval', label: 'Carnaval', color: 'text-orange-600' },
                { key: 'fds', label: 'Fds fuera temp.', color: 'text-blue-600' },
                { key: 'baja', label: 'Temporada Baja', color: 'text-green-600' },
              ].map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                  <span className={`text-xs ${color}`}>{label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-costa-gris">x</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5"
                      value={presetMultipliers[key as keyof typeof presetMultipliers]}
                      onChange={(e) => setPresetMultipliers({
                        ...presetMultipliers,
                        [key]: Number(e.target.value)
                      })}
                      className="w-14 h-7 px-2 text-xs text-center border border-gray-200 rounded"
                    />
                    <span className="text-xs text-costa-gris w-12 text-right">
                      ${Math.round(presetBasePrice * presetMultipliers[key as keyof typeof presetMultipliers])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setIsPresetModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleApplyPreset}>
              <Sparkles size={14} />
              Aplicar Preset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal aplicar a todas las propiedades */}
      <Modal
        isOpen={isApplyAllModalOpen}
        onClose={() => setIsApplyAllModalOpen(false)}
        title="Aplicar a Todas las Propiedades"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle size={14} className="inline mr-1" />
            Esto reemplazará las reglas de precios de todas tus propiedades publicadas
          </div>

          <p className="text-sm text-costa-gris">
            Se copiarán {localRules.length} regla{localRules.length !== 1 ? 's' : ''} a todas tus propiedades.
            Luego podés modificar cada una individualmente.
          </p>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setIsApplyAllModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleApplyToAll} disabled={applyingToAll}>
              <Copy size={14} />
              {applyingToAll ? 'Aplicando...' : 'Aplicar a Todas'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
