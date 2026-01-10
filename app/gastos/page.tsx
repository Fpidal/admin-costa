'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select } from '@/components/ui'
import { Plus, DollarSign, TrendingDown, Calendar, Pencil, Trash2 } from 'lucide-react'

interface Propiedad {
  id: number
  nombre: string
}

interface Gasto {
  id: number
  propiedad_id: number | null
  concepto: string
  categoria: string
  monto: number
  fecha: string
  vencimiento: string | null
  estado: string
  comprobante: string | null
  propiedades?: Propiedad
}

const categoriasGasto = [
  { value: 'servicios', label: 'Servicios' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'reparaciones', label: 'Reparaciones' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

const estadosGasto = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'vencido', label: 'Vencido' },
]

const estadoVariant = {
  'pendiente': 'warning',
  'pagado': 'success',
  'vencido': 'danger',
} as const

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR')
}

const initialForm = {
  propiedad_id: '',
  concepto: '',
  categoria: '',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0],
  vencimiento: '',
  estado: 'pendiente',
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [resGastos, resPropiedades] = await Promise.all([
      supabase.from('gastos').select('*, propiedades(id, nombre)').order('fecha', { ascending: false }),
      supabase.from('propiedades').select('id, nombre').order('nombre')
    ])

    if (resGastos.data) setGastos(resGastos.data)
    if (resPropiedades.data) setPropiedades(resPropiedades.data)
    setLoading(false)
  }

  function openModal(gasto?: Gasto) {
    if (gasto) {
      setEditingId(gasto.id)
      setForm({
        propiedad_id: gasto.propiedad_id?.toString() || '',
        concepto: gasto.concepto || '',
        categoria: gasto.categoria || '',
        monto: gasto.monto || 0,
        fecha: gasto.fecha || '',
        vencimiento: gasto.vencimiento || '',
        estado: gasto.estado || 'pendiente',
      })
    } else {
      setEditingId(null)
      setForm(initialForm)
    }
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const data = {
      propiedad_id: form.propiedad_id ? Number(form.propiedad_id) : null,
      concepto: form.concepto,
      categoria: form.categoria,
      monto: Number(form.monto),
      fecha: form.fecha,
      vencimiento: form.vencimiento || null,
      estado: form.estado,
    }

    if (editingId) {
      const { error } = await supabase.from('gastos').update(data).eq('id', editingId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('gastos').insert([data])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSaving(false)
    closeModal()
    fetchData()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  async function marcarPagado(id: number) {
    const { error } = await supabase.from('gastos').update({ estado: 'pagado' }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else fetchData()
  }

  const totalPendiente = gastos.filter(g => g.estado === 'pendiente').reduce((acc, g) => acc + (g.monto || 0), 0)
  const totalMes = gastos.reduce((acc, g) => acc + (g.monto || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Gastos" description="Control de gastos y pagos de tus propiedades">
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nuevo Gasto
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="py-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-costa-coral/20">
              <TrendingDown className="w-6 h-6 text-costa-coral" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total pendiente</p>
              <p className="text-2xl font-bold text-costa-coral">{formatMonto(totalPendiente)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total gastos</p>
              <p className="text-2xl font-bold text-gray-900">{formatMonto(totalMes)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader><CardTitle>Historial de gastos</CardTitle></CardHeader>
        <CardContent className="p-0">
          {gastos.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay gastos registrados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gastos.map((gasto) => (
                    <tr key={gasto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{gasto.concepto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{gasto.propiedades?.nombre || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><Badge variant="default">{gasto.categoria}</Badge></td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {formatFecha(gasto.fecha)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">{formatMonto(gasto.monto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={estadoVariant[gasto.estado as keyof typeof estadoVariant] || 'default'}>{gasto.estado}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          {gasto.estado === 'pendiente' && (
                            <Button variant="primary" size="sm" onClick={() => marcarPagado(gasto.id)}>Pagar</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openModal(gasto)}><Pencil size={16} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(gasto.id)}><Trash2 size={16} className="text-costa-gris" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Gasto' : 'Nuevo Gasto'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Concepto" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Propiedad"
              value={form.propiedad_id}
              onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
              options={propiedades.map(p => ({ value: p.id.toString(), label: p.nombre }))}
            />
            <Select label="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} options={categoriasGasto} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Monto" type="number" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} required />
            <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            <Input label="Vencimiento" type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} />
          </div>
          <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={estadosGasto} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
