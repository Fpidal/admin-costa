'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { Plus, User, Phone, Mail, Users, Calendar, Pencil, Trash2, History, FileText, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { demoInquilinos } from '@/lib/demoData'

interface Reserva {
  id: number
  check_in: string
  check_out: string
  monto: number
  precio_noche: number
  estado: string
  propiedades?: { nombre: string }
}

interface Acompanante {
  nombre: string
  apellido: string
  documento: string
  edad: number | string
}

interface Inquilino {
  id: number
  nombre: string
  email: string
  telefono: string
  documento: string
  fecha_nacimiento: string | null
  nacionalidad: string | null
  estado_civil: string | null
  domicilio: string | null
  modelo_auto: string | null
  patente: string | null
  cantidad_personas: number
  origen: string
  observaciones: string
  acompanantes: Acompanante[]
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

const nacionalidades = [
  { value: 'argentina', label: 'Argentina' },
  { value: 'brasil', label: 'Brasil' },
  { value: 'chile', label: 'Chile' },
  { value: 'uruguay', label: 'Uruguay' },
  { value: 'paraguay', label: 'Paraguay' },
  { value: 'bolivia', label: 'Bolivia' },
  { value: 'peru', label: 'Perú' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'venezuela', label: 'Venezuela' },
  { value: 'mexico', label: 'México' },
  { value: 'espana', label: 'España' },
  { value: 'italia', label: 'Italia' },
  { value: 'estados_unidos', label: 'Estados Unidos' },
  { value: 'otra', label: 'Otra' },
]

const estadosCiviles = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
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
  fecha_nacimiento: '',
  nacionalidad: 'argentina',
  estado_civil: '',
  domicilio: '',
  modelo_auto: '',
  patente: '',
  cantidad_personas: 1,
  origen: 'directo',
  observaciones: '',
}

const emptyAcompanante: Acompanante = { nombre: '', apellido: '', documento: '', edad: '' }

function InquilinosContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [selectedInquilino, setSelectedInquilino] = useState<Inquilino | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([])
  const [acompanantesExpanded, setAcompanantesExpanded] = useState(false)
  const [nuevoAcompanante, setNuevoAcompanante] = useState<Acompanante>({ nombre: '', apellido: '', documento: '', edad: '' })
  const [editingAcompIdx, setEditingAcompIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isDemo) {
      setInquilinos(demoInquilinos as unknown as Inquilino[])
      setLoading(false)
      return
    }
    fetchData()
  }, [isDemo])

  async function fetchData() {
    // Primero traemos los inquilinos
    const { data: inquilinosData, error: inquilinosError } = await supabase
      .from('inquilinos')
      .select('*')
      .order('nombre')

    if (inquilinosError) {
      console.error('Error fetching inquilinos:', inquilinosError)
      alert('Error al cargar huéspedes: ' + inquilinosError.message)
      setLoading(false)
      return
    }

    // Luego traemos las reservas por separado
    const { data: reservasData } = await supabase
      .from('reservas')
      .select('id, inquilino_id, check_in, check_out, monto, precio_noche, estado, propiedad_id, propiedades(nombre)')

    // Combinamos los datos
    const inquilinosConReservas = (inquilinosData || []).map(inquilino => ({
      ...inquilino,
      reservas: (reservasData || []).filter(r => r.inquilino_id === inquilino.id)
    }))

    setInquilinos(inquilinosConReservas)
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
        fecha_nacimiento: inquilino.fecha_nacimiento || '',
        nacionalidad: inquilino.nacionalidad || 'argentina',
        estado_civil: inquilino.estado_civil || '',
        domicilio: inquilino.domicilio || '',
        modelo_auto: inquilino.modelo_auto || '',
        patente: inquilino.patente || '',
        cantidad_personas: inquilino.cantidad_personas || 1,
        origen: inquilino.origen || 'directo',
        observaciones: inquilino.observaciones || '',
      })
      setAcompanantes(inquilino.acompanantes || [])
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
    setAcompanantesExpanded(false)
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    setEditingAcompIdx(null)
  }

  function confirmarAcompanante() {
    if (!nuevoAcompanante.nombre.trim() && !nuevoAcompanante.apellido.trim()) return

    if (editingAcompIdx !== null) {
      const updated = [...acompanantes]
      updated[editingAcompIdx] = { ...nuevoAcompanante }
      setAcompanantes(updated)
      setEditingAcompIdx(null)
    } else {
      setAcompanantes([...acompanantes, { ...nuevoAcompanante }])
    }
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
  }

  function editarAcompanante(index: number) {
    setNuevoAcompanante({ ...acompanantes[index] })
    setEditingAcompIdx(index)
  }

  function cancelarEdicion() {
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    setEditingAcompIdx(null)
  }

  function removeAcompanante(index: number) {
    setAcompanantes(acompanantes.filter((_, i) => i !== index))
    if (editingAcompIdx === index) {
      setEditingAcompIdx(null)
      setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    }
  }

  function openHistorial(inquilino: Inquilino) {
    setSelectedInquilino(inquilino)
    setHistorialOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Filtrar acompañantes vacíos
    const acompanantesValidos = acompanantes.filter(a => a.nombre.trim() || a.apellido.trim())

    const data = {
      nombre: form.nombre,
      email: form.email,
      telefono: form.telefono,
      documento: form.documento,
      fecha_nacimiento: form.fecha_nacimiento || null,
      nacionalidad: form.nacionalidad || null,
      estado_civil: form.estado_civil || null,
      domicilio: form.domicilio || null,
      modelo_auto: form.modelo_auto || null,
      patente: form.patente || null,
      cantidad_personas: 1 + acompanantesValidos.length,
      origen: form.origen,
      observaciones: form.observaciones,
      acompanantes: acompanantesValidos,
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
            <div>
              <table className="w-full text-sm">
                <thead className="bg-costa-beige/50 border-b border-costa-beige">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-costa-gris uppercase">Nombre</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-costa-gris uppercase">Contacto</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-costa-gris uppercase">Pers.</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-costa-gris uppercase">Origen</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-costa-gris uppercase">Reservas</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-costa-gris uppercase">Obs.</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-costa-gris uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-costa-beige">
                  {inquilinos.map((inquilino) => (
                    <tr key={inquilino.id} className="hover:bg-costa-beige/30">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium text-costa-navy text-sm">{inquilino.nombre}</p>
                          {inquilino.documento && <p className="text-xs text-costa-gris">DNI: {inquilino.documento}</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs">
                          {inquilino.telefono && (
                            <div className="flex items-center gap-1 text-costa-gris">
                              <Phone size={10} />
                              <span>{inquilino.telefono}</span>
                            </div>
                          )}
                          {inquilino.email && (
                            <div className="flex items-center gap-1 text-costa-gris">
                              <Mail size={10} />
                              <span className="truncate max-w-[120px]">{inquilino.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-costa-navy text-sm">{1 + (inquilino.acompanantes?.length || 0)}</span>
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant="default">{inquilino.origen || 'directo'}</Badge>
                      </td>
                      <td className="px-2 py-2">
                        {inquilino.reservas && inquilino.reservas.length > 0 ? (
                          <Button variant="ghost" size="sm" onClick={() => openHistorial(inquilino)}>
                            <History size={12} />
                            <span className="ml-1 text-xs">{inquilino.reservas.length}</span>
                          </Button>
                        ) : (
                          <span className="text-costa-gris text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {inquilino.observaciones ? (
                          <p className="text-xs text-costa-gris truncate max-w-[120px]" title={inquilino.observaciones}>
                            {inquilino.observaciones}
                          </p>
                        ) : (
                          <span className="text-costa-gris text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => openModal(inquilino)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(inquilino.id)}><Trash2 size={14} className="text-costa-gris" /></Button>
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
          <p className="text-sm font-medium text-gray-700 border-b pb-2">Datos personales</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre y apellido completo" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <Input label="DNI / Pasaporte" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
            <Select label="Nacionalidad" value={form.nacionalidad} onChange={(e) => setForm({ ...form, nacionalidad: e.target.value })} options={nacionalidades} />
            <Select label="Estado civil" value={form.estado_civil} onChange={(e) => setForm({ ...form, estado_civil: e.target.value })} options={estadosCiviles} />
          </div>

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Contacto</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono celular" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Domicilio habitual" value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })} placeholder="Calle, número, ciudad, provincia" />

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Vehículo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Modelo de auto" value={form.modelo_auto} onChange={(e) => setForm({ ...form, modelo_auto: e.target.value })} placeholder="Ej: Toyota Corolla 2020" />
            <Input label="Patente" value={form.patente} onChange={(e) => setForm({ ...form, patente: e.target.value })} placeholder="Ej: AB123CD" />
          </div>

          {/* Acompañantes - Colapsable */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setAcompanantesExpanded(!acompanantesExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users size={16} />
                Acompañantes ({acompanantes.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Total: {1 + acompanantes.length} personas
                </span>
                {acompanantesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {acompanantesExpanded && (
              <div className="p-3 pt-0 border-t space-y-3">
                {/* Lista de acompañantes registrados */}
                {acompanantes.length > 0 && (
                  <div className="space-y-2">
                    {acompanantes.map((acomp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-costa-olivo/10 border border-costa-olivo/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Check size={16} className="text-costa-olivo" />
                          <div>
                            <p className="font-medium text-gray-900">{acomp.nombre} {acomp.apellido}</p>
                            <p className="text-xs text-gray-500">
                              {acomp.documento && `DNI: ${acomp.documento}`}
                              {acomp.documento && acomp.edad && ' · '}
                              {acomp.edad && `${acomp.edad} años`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => editarAcompanante(idx)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAcompanante(idx)}
                            className="p-2 text-costa-gris hover:bg-costa-beige rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para agregar/editar */}
                <div className={`p-3 rounded-lg ${editingAcompIdx !== null ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {editingAcompIdx !== null ? 'Editando acompañante' : 'Agregar acompañante'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input
                      label="Nombre"
                      value={nuevoAcompanante.nombre}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, nombre: e.target.value })}
                      placeholder="Nombre"
                    />
                    <Input
                      label="Apellido"
                      value={nuevoAcompanante.apellido}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, apellido: e.target.value })}
                      placeholder="Apellido"
                    />
                    <Input
                      label="DNI/Pasaporte"
                      value={nuevoAcompanante.documento}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, documento: e.target.value })}
                      placeholder="Documento"
                    />
                    <Input
                      label="Edad"
                      type="number"
                      min="0"
                      value={nuevoAcompanante.edad}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, edad: e.target.value })}
                      placeholder="Edad"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    {editingAcompIdx !== null && (
                      <Button type="button" variant="secondary" size="sm" onClick={cancelarEdicion}>
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={confirmarAcompanante}
                      disabled={!nuevoAcompanante.nombre.trim() && !nuevoAcompanante.apellido.trim()}
                    >
                      <Check size={14} />
                      {editingAcompIdx !== null ? 'Actualizar' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Información adicional</p>
          <Select label="Origen de la reserva" value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })} options={origenes} />
          <Textarea label="Observaciones" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas sobre el huésped, preferencias, restricciones, etc." />
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

export default function InquilinosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <InquilinosContent />
    </Suspense>
  )
}
