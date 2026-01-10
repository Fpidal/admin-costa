'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select } from '@/components/ui'
import { Plus, DollarSign, TrendingDown, TrendingUp, Calendar, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

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

interface Reserva {
  id: number
  propiedad_id: number
  inquilino_id: number | null
  fecha_inicio: string
  fecha_fin: string
  precio_noche: number
  sena: number
  estado: string
  moneda: string
  propiedades?: Propiedad
  inquilinos?: { nombre: string }
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
  'confirmada': 'success',
  'cancelada': 'danger',
} as const

const formatMonto = (monto: number, moneda: string = 'ARS') => {
  if (moneda === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(monto)
  }
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR')
}

const calcularNoches = (inicio: string, fin: string) => {
  const start = new Date(inicio)
  const end = new Date(fin)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
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

export default function AdministracionPage() {
  const [activeTab, setActiveTab] = useState<'gastos' | 'ingresos'>('gastos')
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
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
    const [resGastos, resReservas, resPropiedades] = await Promise.all([
      supabase.from('gastos').select('*, propiedades(id, nombre)').order('fecha', { ascending: false }),
      supabase.from('reservas').select('*, propiedades(id, nombre), inquilinos(nombre)').eq('estado', 'confirmada').order('fecha_inicio', { ascending: false }),
      supabase.from('propiedades').select('id, nombre').order('nombre')
    ])

    if (resGastos.data) setGastos(resGastos.data)
    if (resReservas.data) setReservas(resReservas.data)
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

  // Cálculos
  const totalGastos = gastos.reduce((acc, g) => acc + (g.monto || 0), 0)
  const totalGastosPendientes = gastos.filter(g => g.estado === 'pendiente').reduce((acc, g) => acc + (g.monto || 0), 0)

  const totalIngresos = reservas.reduce((acc, r) => {
    const noches = calcularNoches(r.fecha_inicio, r.fecha_fin)
    return acc + (noches * (r.precio_noche || 0))
  }, 0)

  const totalSenas = reservas.reduce((acc, r) => acc + (r.sena || 0), 0)
  const balance = totalIngresos - totalGastos

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-costa-gris">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Administración" description="Control de gastos e ingresos por alquileres">
        {activeTab === 'gastos' && (
          <Button onClick={() => openModal()}>
            <Plus size={16} />
            Nuevo Gasto
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-costa-beige">
              <ArrowUpCircle className="w-5 h-5 text-costa-olivo" />
            </div>
            <div>
              <p className="text-xs text-costa-gris">Ingresos</p>
              <p className="text-lg font-bold text-costa-olivo">{formatMonto(totalIngresos)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-costa-beige">
              <ArrowDownCircle className="w-5 h-5 text-costa-coral" />
            </div>
            <div>
              <p className="text-xs text-costa-gris">Gastos</p>
              <p className="text-lg font-bold text-costa-coral">{formatMonto(totalGastos)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-costa-beige">
              <DollarSign className="w-5 h-5 text-costa-navy" />
            </div>
            <div>
              <p className="text-xs text-costa-gris">Balance</p>
              <p className={`text-lg font-bold ${balance >= 0 ? 'text-costa-olivo' : 'text-costa-coral'}`}>
                {formatMonto(balance)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-costa-beige">
              <TrendingDown className="w-5 h-5 text-costa-coral" />
            </div>
            <div>
              <p className="text-xs text-costa-gris">Pendiente</p>
              <p className="text-lg font-bold text-costa-coral">{formatMonto(totalGastosPendientes)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-costa-beige">
        <button
          onClick={() => setActiveTab('gastos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gastos'
              ? 'border-costa-navy text-costa-navy'
              : 'border-transparent text-costa-gris hover:text-costa-navy'
          }`}
        >
          Gastos ({gastos.length})
        </button>
        <button
          onClick={() => setActiveTab('ingresos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ingresos'
              ? 'border-costa-navy text-costa-navy'
              : 'border-transparent text-costa-gris hover:text-costa-navy'
          }`}
        >
          Ingresos ({reservas.length})
        </button>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'gastos' ? (
        <Card>
          <CardHeader><CardTitle>Historial de gastos</CardTitle></CardHeader>
          <CardContent className="p-0">
            {gastos.length === 0 ? (
              <div className="py-8 text-center text-costa-gris">No hay gastos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-costa-beige/50 border-b border-costa-beige">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Concepto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Propiedad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Categoría</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Fecha</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Estado</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-costa-beige">
                    {gastos.map((gasto) => (
                      <tr key={gasto.id} className="hover:bg-costa-beige/30">
                        <td className="px-4 py-3 font-medium text-costa-navy">{gasto.concepto}</td>
                        <td className="px-4 py-3 text-costa-gris">{gasto.propiedades?.nombre || '-'}</td>
                        <td className="px-4 py-3"><Badge variant="default">{gasto.categoria}</Badge></td>
                        <td className="px-4 py-3 text-costa-gris">{formatFecha(gasto.fecha)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-costa-navy">{formatMonto(gasto.monto)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={estadoVariant[gasto.estado as keyof typeof estadoVariant] || 'default'}>{gasto.estado}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {gasto.estado === 'pendiente' && (
                              <Button variant="primary" size="sm" onClick={() => marcarPagado(gasto.id)}>Pagar</Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openModal(gasto)}><Pencil size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(gasto.id)}><Trash2 size={14} className="text-costa-gris" /></Button>
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
      ) : (
        <Card>
          <CardHeader><CardTitle>Ingresos por alquileres</CardTitle></CardHeader>
          <CardContent className="p-0">
            {reservas.length === 0 ? (
              <div className="py-8 text-center text-costa-gris">No hay ingresos registrados</div>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <thead className="bg-costa-beige/50 border-b border-costa-beige">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Propiedad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Inquilino</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Período</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-costa-gris uppercase">Noches</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Precio/noche</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Seña</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-costa-beige">
                    {reservas.map((reserva) => {
                      const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
                      const total = noches * (reserva.precio_noche || 0)
                      return (
                        <tr key={reserva.id} className="hover:bg-costa-beige/30">
                          <td className="px-4 py-3 font-medium text-costa-navy">{reserva.propiedades?.nombre || '-'}</td>
                          <td className="px-4 py-3 text-costa-gris">{reserva.inquilinos?.nombre || '-'}</td>
                          <td className="px-4 py-3 text-costa-gris">
                            {formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)}
                          </td>
                          <td className="px-4 py-3 text-center text-costa-navy">{noches}</td>
                          <td className="px-4 py-3 text-right text-costa-gris">
                            {formatMonto(reserva.precio_noche, reserva.moneda)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-costa-olivo">
                            {formatMonto(total, reserva.moneda)}
                          </td>
                          <td className="px-4 py-3 text-right text-costa-navy">
                            {formatMonto(reserva.sena || 0, reserva.moneda)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-costa-beige/30 border-t border-costa-beige">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right font-medium text-costa-navy">Total Ingresos:</td>
                      <td className="px-4 py-3 text-right font-bold text-costa-olivo">{formatMonto(totalIngresos)}</td>
                      <td className="px-4 py-3 text-right font-bold text-costa-navy">{formatMonto(totalSenas)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Gasto' : 'Nuevo Gasto'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Concepto" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Propiedad"
              value={form.propiedad_id}
              onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
              options={propiedades.map(p => ({ value: p.id.toString(), label: p.nombre }))}
            />
            <Select label="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} options={categoriasGasto} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Monto" type="number" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} required />
            <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            <Input label="Vencimiento" type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} />
          </div>
          <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={estadosGasto} />
          <div className="flex justify-end gap-2 pt-3 border-t border-costa-beige">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
