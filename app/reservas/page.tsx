'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { Plus, Calendar, User, Home, Pencil, Trash2, DollarSign, Users, X } from 'lucide-react'

interface Propiedad {
  id: number
  nombre: string
}

interface Inquilino {
  id: number
  nombre: string
  documento: string
  telefono: string
  email: string
}

interface Acompanante {
  nombre: string
  apellido: string
  documento: string
  edad: number | string
}

interface Reserva {
  id: number
  propiedad_id: number
  inquilino_id: number | null
  check_in: string
  check_out: string
  cantidad_personas: number
  precio_noche: number
  sena: number
  forma_pago: string
  estado: string
  notas: string
  acompanantes: Acompanante[]
  propiedades?: Propiedad
  inquilinos?: Inquilino
}

const estadosReserva = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const formasPago = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

const estadoVariant = {
  'confirmada': 'success',
  'pendiente': 'warning',
  'cancelada': 'danger',
} as const

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto || 0)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR')
}

const calcularNoches = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0
  const inicio = new Date(checkIn)
  const fin = new Date(checkOut)
  return Math.max(0, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)))
}

const initialForm = {
  propiedad_id: '',
  inquilino_id: '',
  check_in: '',
  check_out: '',
  cantidad_personas: 1,
  precio_noche: 0,
  sena: 0,
  forma_pago: 'efectivo',
  estado: 'pendiente',
  notas: '',
}

const emptyAcompanante: Acompanante = { nombre: '', apellido: '', documento: '', edad: '' }

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [resReservas, resPropiedades, resInquilinos] = await Promise.all([
      supabase.from('reservas').select('*, acompanantes, propiedades(id, nombre), inquilinos(id, nombre, documento, telefono, email)').order('check_in', { ascending: false }),
      supabase.from('propiedades').select('id, nombre').order('nombre'),
      supabase.from('inquilinos').select('id, nombre, documento, telefono, email').order('nombre')
    ])

    if (resReservas.data) setReservas(resReservas.data)
    if (resPropiedades.data) setPropiedades(resPropiedades.data)
    if (resInquilinos.data) setInquilinos(resInquilinos.data)
    setLoading(false)
  }

  function openModal(reserva?: Reserva) {
    if (reserva) {
      setEditingId(reserva.id)
      setForm({
        propiedad_id: reserva.propiedad_id?.toString() || '',
        inquilino_id: reserva.inquilino_id?.toString() || '',
        check_in: reserva.check_in || '',
        check_out: reserva.check_out || '',
        cantidad_personas: reserva.cantidad_personas || 1,
        precio_noche: reserva.precio_noche || 0,
        sena: reserva.sena || 0,
        forma_pago: reserva.forma_pago || 'efectivo',
        estado: reserva.estado || 'pendiente',
        notas: reserva.notas || '',
      })
      setAcompanantes(reserva.acompanantes || [])
    } else {
      setEditingId(null)
      setForm(initialForm)
      setAcompanantes([])
    }
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(initialForm)
    setAcompanantes([])
  }

  function addAcompanante() {
    setAcompanantes([...acompanantes, { ...emptyAcompanante }])
  }

  function removeAcompanante(index: number) {
    setAcompanantes(acompanantes.filter((_, i) => i !== index))
  }

  function updateAcompanante(index: number, field: keyof Acompanante, value: string | number) {
    const updated = [...acompanantes]
    updated[index] = { ...updated[index], [field]: value }
    setAcompanantes(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.propiedad_id) {
      alert('Seleccioná una propiedad')
      return
    }

    setSaving(true)

    const noches = calcularNoches(form.check_in, form.check_out)
    const monto = noches * Number(form.precio_noche)

    // Filtrar acompañantes vacíos
    const acompanantesValidos = acompanantes.filter(a => a.nombre.trim() || a.apellido.trim())

    const data = {
      propiedad_id: form.propiedad_id,
      inquilino_id: form.inquilino_id || null,
      fecha_inicio: form.check_in,
      fecha_fin: form.check_out,
      cantidad_personas: 1 + acompanantesValidos.length, // Titular + acompañantes
      precio_noche: Number(form.precio_noche),
      sena: Number(form.sena),
      forma_pago: form.forma_pago,
      monto: monto,
      monto_usd: Number(form.precio_noche),
      estado: form.estado,
      notas: form.notas,
      acompanantes: acompanantesValidos,
    }

    if (editingId) {
      const { error } = await supabase.from('reservas').update(data).eq('id', editingId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('reservas').insert([data])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSaving(false)
    closeModal()
    fetchData()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return
    const { error } = await supabase.from('reservas').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  // Calcular totales
  const calcularTotal = (r: Reserva) => {
    const noches = calcularNoches(r.check_in, r.check_out)
    return noches * (r.precio_noche || 0)
  }

  const totalConfirmadas = reservas.filter(r => r.estado === 'confirmada').reduce((acc, r) => acc + calcularTotal(r), 0)
  const totalSenas = reservas.filter(r => r.estado !== 'cancelada').reduce((acc, r) => acc + (r.sena || 0), 0)
  const pendientes = reservas.filter(r => r.estado === 'pendiente').length

  // Calculos del formulario
  const formNoches = calcularNoches(form.check_in, form.check_out)
  const formTotal = formNoches * Number(form.precio_noche)
  const formSaldo = formTotal - Number(form.sena)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Reservas" description="Administra las reservas de tus propiedades">
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nueva Reserva
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total reservas</p>
            <p className="text-2xl font-bold text-gray-900">{reservas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Ingresos confirmados</p>
            <p className="text-2xl font-bold text-green-600">{formatMonto(totalConfirmadas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total señas</p>
            <p className="text-2xl font-bold text-blue-600">{formatMonto(totalSenas)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader><CardTitle>Todas las reservas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {reservas.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay reservas registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Huésped</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Personas</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Seña</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reservas.map((reserva) => {
                    const noches = calcularNoches(reserva.check_in, reserva.check_out)
                    const total = noches * (reserva.precio_noche || 0)
                    const saldo = total - (reserva.sena || 0)
                    return (
                      <tr key={reserva.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Home size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900">{reserva.propiedades?.nombre || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <div>
                              <span className="text-gray-900 font-medium">{reserva.inquilinos?.nombre || '-'}</span>
                              {reserva.inquilinos?.telefono && (
                                <p className="text-xs text-gray-500">{reserva.inquilinos.telefono}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            <div>
                              <span className="text-gray-700">{formatFecha(reserva.check_in)} → {formatFecha(reserva.check_out)}</span>
                              <p className="text-xs text-gray-500">{noches} noches · {formatMonto(reserva.precio_noche || 0)}/noche</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                          {reserva.cantidad_personas || 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                          {formatMonto(total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                          {formatMonto(reserva.sena || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={saldo > 0 ? 'font-semibold text-amber-600' : 'text-green-600'}>
                            {formatMonto(saldo)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={estadoVariant[reserva.estado as keyof typeof estadoVariant] || 'default'}>
                            {reserva.estado}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openModal(reserva)}><Pencil size={16} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(reserva.id)}><Trash2 size={16} className="text-red-500" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Reserva' : 'Nueva Reserva'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium text-gray-700 border-b pb-2">Propiedad y titular</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Propiedad"
              value={form.propiedad_id}
              onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
              options={propiedades.map(p => ({ value: p.id.toString(), label: p.nombre }))}
              required
            />
            <Select
              label="Titular de la reserva"
              value={form.inquilino_id}
              onChange={(e) => setForm({ ...form, inquilino_id: e.target.value })}
              options={inquilinos.map(i => ({ value: i.id.toString(), label: i.nombre }))}
            />
          </div>

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Fechas y tarifas</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Check-in" type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value, check_out: form.check_out && form.check_out < e.target.value ? e.target.value : form.check_out })} required />
            <Input label="Check-out" type="date" value={form.check_out} min={form.check_in || undefined} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required />
            <div className="flex items-end">
              <div className="w-full px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <span className="text-2xl font-bold text-blue-600">{formNoches}</span>
                <span className="text-sm text-blue-600 ml-1">noche{formNoches !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Precio por noche" type="number" min="0" value={form.precio_noche} onChange={(e) => setForm({ ...form, precio_noche: Number(e.target.value) })} />
            <Input label="Seña" type="number" min="0" value={form.sena} onChange={(e) => setForm({ ...form, sena: Number(e.target.value) })} />
            <Select label="Forma de pago" value={form.forma_pago} onChange={(e) => setForm({ ...form, forma_pago: e.target.value })} options={formasPago} />
          </div>

          {/* Resumen calculado */}
          {form.check_in && form.check_out && form.precio_noche > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Noches</p>
                <p className="text-xl font-bold text-gray-900">{formNoches}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{formatMonto(formTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo pendiente</p>
                <p className={`text-xl font-bold ${formSaldo > 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatMonto(formSaldo)}</p>
              </div>
            </div>
          )}

          {/* Acompañantes */}
          <div className="pt-2">
            <div className="flex items-center justify-between border-b pb-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users size={16} />
                Acompañantes ({acompanantes.length})
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={addAcompanante}>
                <Plus size={14} />
                Agregar
              </Button>
            </div>

            {acompanantes.length > 0 && (
              <div className="space-y-3 mt-3">
                {acompanantes.map((acomp, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Input
                        label="Nombre"
                        value={acomp.nombre}
                        onChange={(e) => updateAcompanante(idx, 'nombre', e.target.value)}
                        placeholder="Nombre"
                      />
                      <Input
                        label="Apellido"
                        value={acomp.apellido}
                        onChange={(e) => updateAcompanante(idx, 'apellido', e.target.value)}
                        placeholder="Apellido"
                      />
                      <Input
                        label="DNI/Pasaporte"
                        value={acomp.documento}
                        onChange={(e) => updateAcompanante(idx, 'documento', e.target.value)}
                        placeholder="Documento"
                      />
                      <Input
                        label="Edad"
                        type="number"
                        min="0"
                        value={acomp.edad}
                        onChange={(e) => updateAcompanante(idx, 'edad', e.target.value)}
                        placeholder="Edad"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAcompanante(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded mt-6"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Total personas: {1 + acompanantes.filter(a => a.nombre.trim() || a.apellido.trim()).length} (titular + {acompanantes.filter(a => a.nombre.trim() || a.apellido.trim()).length} acompañante{acompanantes.filter(a => a.nombre.trim() || a.apellido.trim()).length !== 1 ? 's' : ''})
            </p>
          </div>

          <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={estadosReserva} />
          <Textarea label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones de la reserva..." />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
