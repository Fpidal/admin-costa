'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { Plus, User, Phone, Mail, Users, Calendar, Pencil, Trash2, History, FileText } from 'lucide-react'

interface Reserva {
  id: number
  check_in: string
  check_out: string
  monto: number
  precio_noche: number
  estado: string
  propiedades?: { nombre: string }
}

interface Inquilino {
  id: number
  nombre: string
  email: string
  telefono: string
  documento: string
  cantidad_personas: number
  origen: string
  observaciones: string
  reservas?: Reserva[]
}

const origenes = [
  { value: 'directo', label: 'Directo' },
  { value: 'booking', label: 'Booking' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'mercadolibre', label: 'MercadoLibre' },
  { value: 'referido', label: 'Referido' },
  { value: 'otro', label: 'Otro' },
]

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto || 0)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR')
}

const initialForm = {
  nombre: '',
  email: '',
  telefono: '',
  documento: '',
  cantidad_personas: 1,
  origen: 'directo',
  observaciones: '',
}

export default function InquilinosPage() {
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [selectedInquilino, setSelectedInquilino] = useState<Inquilino | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data, error } = await supabase
      .from('inquilinos')
      .select('*, reservas(id, check_in, check_out, monto, precio_noche, estado, propiedades(nombre))')
      .order('nombre')

    if (!error && data) setInquilinos(data)
    setLoading(false)
  }

  function openModal(inquilino?: Inquilino) {
    if (inquilino) {
      setEditingId(inquilino.id)
      setForm({
        nombre: inquilino.nombre || '',
        email: inquilino.email || '',
        telefono: inquilino.telefono || '',
        documento: inquilino.documento || '',
        cantidad_personas: inquilino.cantidad_personas || 1,
        origen: inquilino.origen || 'directo',
        observaciones: inquilino.observaciones || '',
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

  function openHistorial(inquilino: Inquilino) {
    setSelectedInquilino(inquilino)
    setHistorialOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const data = {
      nombre: form.nombre,
      email: form.email,
      telefono: form.telefono,
      documento: form.documento,
      cantidad_personas: Number(form.cantidad_personas),
      origen: form.origen,
      observaciones: form.observaciones,
    }

    if (editingId) {
      const { error } = await supabase.from('inquilinos').update(data).eq('id', editingId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('inquilinos').insert([data])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSaving(false)
    closeModal()
    fetchData()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este huésped?')) return
    const { error } = await supabase.from('inquilinos').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Inquilinos" description="Base de datos de huéspedes">
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nuevo Huésped
        </Button>
      </PageHeader>

      {inquilinos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No hay huéspedes registrados</p>
            <Button className="mt-4" onClick={() => openModal()}>
              <Plus size={18} />
              Agregar primer huésped
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reservas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inquilinos.map((inquilino) => (
                    <tr key={inquilino.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{inquilino.nombre}</p>
                            {inquilino.documento && <p className="text-xs text-gray-500">DNI: {inquilino.documento}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {inquilino.telefono && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Phone size={12} />
                              <span>{inquilino.telefono}</span>
                            </div>
                          )}
                          {inquilino.email && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Mail size={12} />
                              <span className="truncate max-w-[150px]">{inquilino.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Users size={14} />
                          <span>{inquilino.cantidad_personas || 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default">{inquilino.origen || 'directo'}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {inquilino.reservas && inquilino.reservas.length > 0 ? (
                          <Button variant="ghost" size="sm" onClick={() => openHistorial(inquilino)}>
                            <History size={14} />
                            <span className="ml-1">{inquilino.reservas.length} reserva{inquilino.reservas.length > 1 ? 's' : ''}</span>
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin reservas</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {inquilino.observaciones ? (
                          <p className="text-sm text-gray-600 truncate max-w-[200px]" title={inquilino.observaciones}>
                            {inquilino.observaciones}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openModal(inquilino)}><Pencil size={16} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(inquilino.id)}><Trash2 size={16} className="text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Formulario */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Huésped' : 'Nuevo Huésped'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre completo" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <Input label="Documento (DNI)" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Cantidad de personas" type="number" min="1" value={form.cantidad_personas} onChange={(e) => setForm({ ...form, cantidad_personas: Number(e.target.value) })} />
            <Select label="Origen" value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })} options={origenes} />
          </div>
          <Textarea label="Observaciones" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas sobre el huésped, preferencias, etc." />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial */}
      <Modal isOpen={historialOpen} onClose={() => setHistorialOpen(false)} title={`Historial de ${selectedInquilino?.nombre}`} size="lg">
        {selectedInquilino?.reservas && selectedInquilino.reservas.length > 0 ? (
          <div className="space-y-3">
            {selectedInquilino.reservas.map((reserva) => (
              <div key={reserva.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{reserva.propiedades?.nombre || 'Propiedad'}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Calendar size={14} />
                    <span>{formatFecha(reserva.check_in)} → {formatFecha(reserva.check_out)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatMonto(reserva.monto)}</p>
                  <Badge variant={reserva.estado === 'confirmada' ? 'success' : reserva.estado === 'cancelada' ? 'danger' : 'warning'}>
                    {reserva.estado}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay reservas registradas</p>
        )}
      </Modal>
    </div>
  )
}
