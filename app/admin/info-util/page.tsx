'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Select } from '@/components/ui'
import { Plus, Phone, Pencil, Trash2, Shield, Zap, Wrench, ExternalLink, Users, AlertTriangle, Search } from 'lucide-react'

interface Contacto {
  id: number
  nombre: string
  categoria: string
  telefono: string
  email: string
  descripcion: string
}

interface Proveedor {
  id: number
  nombre: string
  apellido: string | null
  rubro: string | null
  telefono: string | null
}

interface ListaNegra {
  id: number
  documento: string
  nombre: string
  telefono: string | null
  email: string | null
  motivo: string
  fecha: string
  notas: string | null
}

const categoriasContacto = [
  { value: 'emergencias', label: 'Emergencias' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
]

const categoriaConfig = {
  emergencias: { icon: Shield, color: 'text-costa-coral', bg: 'bg-costa-coral/20' },
  servicios: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  mantenimiento: { icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-100' },
} as const

const linksUtiles = [
  { nombre: 'AFIP', url: 'https://www.afip.gob.ar', descripcion: 'Administración Federal de Ingresos Públicos' },
  { nombre: 'ARBA', url: 'https://www.arba.gov.ar', descripcion: 'Agencia de Recaudación Buenos Aires' },
  { nombre: 'Registro de la Propiedad', url: '#', descripcion: 'Consulta de titularidad' },
  { nombre: 'Municipalidad', url: '#', descripcion: 'Trámites municipales' },
]

const initialForm = {
  nombre: '',
  categoria: 'mantenimiento',
  telefono: '',
  email: '',
  descripcion: '',
}

const rubrosProveedor = [
  { value: 'plomero', label: 'Plomero' },
  { value: 'electricista', label: 'Electricista' },
  { value: 'pintor', label: 'Pintor' },
  { value: 'jardinero', label: 'Jardinero' },
  { value: 'piletero', label: 'Piletero' },
  { value: 'arreglos_varios', label: 'Arreglos Varios' },
  { value: 'constructor', label: 'Constructor' },
]

const rubroConfig: Record<string, { color: string; bg: string }> = {
  plomero: { color: 'text-blue-600', bg: 'bg-blue-100' },
  electricista: { color: 'text-amber-600', bg: 'bg-amber-100' },
  pintor: { color: 'text-costa-coral', bg: 'bg-costa-coral/20' },
  jardinero: { color: 'text-costa-olivo', bg: 'bg-costa-olivo/20' },
  piletero: { color: 'text-cyan-600', bg: 'bg-cyan-100' },
  arreglos_varios: { color: 'text-costa-gris', bg: 'bg-costa-beige' },
  constructor: { color: 'text-costa-navy', bg: 'bg-costa-navy/20' },
}

const initialProveedorForm = {
  nombre: '',
  apellido: '',
  rubro: 'arreglos_varios',
  telefono: '',
}

const initialListaNegraForm = {
  documento: '',
  nombre: '',
  telefono: '',
  email: '',
  motivo: '',
  fecha: new Date().toISOString().split('T')[0],
  notas: '',
}

export default function InfoUtilPage() {
  const { userId } = useAuth()
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  // Estado para proveedores
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false)
  const [editingProveedorId, setEditingProveedorId] = useState<number | null>(null)
  const [proveedorForm, setProveedorForm] = useState(initialProveedorForm)
  const [savingProveedor, setSavingProveedor] = useState(false)

  // Estado para lista negra
  const [listaNegra, setListaNegra] = useState<ListaNegra[]>([])
  const [listaNegraModalOpen, setListaNegraModalOpen] = useState(false)
  const [editingListaNegraId, setEditingListaNegraId] = useState<number | null>(null)
  const [listaNegraForm, setListaNegraForm] = useState(initialListaNegraForm)
  const [savingListaNegra, setSavingListaNegra] = useState(false)
  const [busquedaListaNegra, setBusquedaListaNegra] = useState('')

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  async function fetchData() {
    const [resContactos, resProveedores, resListaNegra] = await Promise.all([
      supabase.from('contactos').select('*').order('categoria, nombre'),
      supabase.from('proveedores_servicios').select('*').order('nombre'),
      supabase.from('lista_negra').select('*').order('fecha', { ascending: false })
    ])
    if (resContactos.data) setContactos(resContactos.data)
    if (resProveedores.data) setProveedores(resProveedores.data)
    if (resListaNegra.data) setListaNegra(resListaNegra.data)
    setLoading(false)
  }

  async function fetchContactos() {
    const { data, error } = await supabase.from('contactos').select('*').order('categoria, nombre')
    if (!error && data) setContactos(data)
  }

  function openModal(contacto?: Contacto) {
    if (contacto) {
      setEditingId(contacto.id)
      setForm({
        nombre: contacto.nombre || '',
        categoria: contacto.categoria || 'mantenimiento',
        telefono: contacto.telefono || '',
        email: contacto.email || '',
        descripcion: contacto.descripcion || '',
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
      nombre: form.nombre,
      categoria: form.categoria,
      telefono: form.telefono,
      email: form.email,
      descripcion: form.descripcion,
    }

    if (editingId) {
      const { error } = await supabase.from('contactos').update(data).eq('id', editingId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('contactos').insert([{ ...data, user_id: userId }])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSaving(false)
    closeModal()
    fetchContactos()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return
    const { error } = await supabase.from('contactos').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchContactos()
  }

  // Funciones para proveedores
  function openProveedorModal(proveedor?: Proveedor) {
    if (proveedor) {
      setEditingProveedorId(proveedor.id)
      // Verificar si el rubro existe en la lista, sino usar 'arreglos_varios'
      const rubroValido = rubrosProveedor.some(r => r.value === proveedor.rubro)
      setProveedorForm({
        nombre: proveedor.nombre || '',
        apellido: proveedor.apellido || '',
        rubro: rubroValido ? (proveedor.rubro || 'arreglos_varios') : 'arreglos_varios',
        telefono: proveedor.telefono || '',
      })
    } else {
      setEditingProveedorId(null)
      setProveedorForm(initialProveedorForm)
    }
    setProveedorModalOpen(true)
  }

  function closeProveedorModal() {
    setProveedorModalOpen(false)
    setEditingProveedorId(null)
    setProveedorForm(initialProveedorForm)
  }

  async function handleProveedorSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingProveedor(true)

    const data = {
      nombre: proveedorForm.nombre,
      apellido: proveedorForm.apellido || null,
      rubro: proveedorForm.rubro || null,
      telefono: proveedorForm.telefono || null,
    }

    if (editingProveedorId) {
      const { error } = await supabase.from('proveedores_servicios').update(data).eq('id', editingProveedorId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('proveedores_servicios').insert([{ ...data, user_id: userId }])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSavingProveedor(false)
    closeProveedorModal()
    fetchData()
  }

  async function handleProveedorDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return
    const { error } = await supabase.from('proveedores_servicios').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  // Funciones para lista negra
  function openListaNegraModal(item?: ListaNegra) {
    if (item) {
      setEditingListaNegraId(item.id)
      setListaNegraForm({
        documento: item.documento || '',
        nombre: item.nombre || '',
        telefono: item.telefono || '',
        email: item.email || '',
        motivo: item.motivo || '',
        fecha: item.fecha || new Date().toISOString().split('T')[0],
        notas: item.notas || '',
      })
    } else {
      setEditingListaNegraId(null)
      setListaNegraForm(initialListaNegraForm)
    }
    setListaNegraModalOpen(true)
  }

  function closeListaNegraModal() {
    setListaNegraModalOpen(false)
    setEditingListaNegraId(null)
    setListaNegraForm(initialListaNegraForm)
  }

  async function handleListaNegraSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingListaNegra(true)

    const data = {
      documento: listaNegraForm.documento,
      nombre: listaNegraForm.nombre,
      telefono: listaNegraForm.telefono || null,
      email: listaNegraForm.email || null,
      motivo: listaNegraForm.motivo,
      fecha: listaNegraForm.fecha,
      notas: listaNegraForm.notas || null,
    }

    if (editingListaNegraId) {
      const { error } = await supabase.from('lista_negra').update(data).eq('id', editingListaNegraId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('lista_negra').insert([{ ...data, user_id: userId }])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSavingListaNegra(false)
    closeListaNegraModal()
    fetchData()
  }

  async function handleListaNegraDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este registro de la lista negra?')) return
    const { error } = await supabase.from('lista_negra').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  // Filtrar lista negra por búsqueda
  const listaNegraFiltrada = listaNegra.filter(item => {
    const busqueda = busquedaListaNegra.toLowerCase()
    return (
      item.documento.toLowerCase().includes(busqueda) ||
      item.nombre.toLowerCase().includes(busqueda) ||
      item.motivo.toLowerCase().includes(busqueda)
    )
  })

  // Agrupar contactos por categoría
  const contactosPorCategoria = contactos.reduce((acc, c) => {
    const cat = c.categoria || 'mantenimiento'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {} as Record<string, Contacto[]>)

  // Normalizar rubro (convertir a minúsculas, quitar acentos, reemplazar espacios)
  const normalizarRubro = (rubro: string | null): string => {
    if (!rubro) return 'arreglos_varios'
    const normalizado = rubro.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
      .replace(/\s+/g, '_') // espacios a guiones bajos
    // Verificar si existe en la lista de rubros válidos
    const rubroValido = rubrosProveedor.find(r => r.value === normalizado)
    return rubroValido ? normalizado : 'arreglos_varios'
  }

  // Agrupar proveedores por rubro
  const proveedoresPorRubro = proveedores.reduce((acc, p) => {
    const rubro = normalizarRubro(p.rubro)
    if (!acc[rubro]) acc[rubro] = []
    acc[rubro].push(p)
    return acc
  }, {} as Record<string, Proveedor[]>)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Info Útil" description="Contactos y recursos importantes para la gestión de propiedades">
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Agregar Contacto
        </Button>
      </PageHeader>

      {/* Categorías de contactos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {categoriasContacto.map(({ value, label }) => {
          const config = categoriaConfig[value as keyof typeof categoriaConfig]
          const Icon = config.icon
          const contactosCat = contactosPorCategoria[value] || []

          return (
            <Card key={value}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contactosCat.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay contactos en esta categoría</p>
                ) : (
                  <div className="space-y-4">
                    {contactosCat.map((contacto) => (
                      <div key={contacto.id} className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{contacto.nombre}</p>
                          {contacto.descripcion && (
                            <p className="text-sm text-gray-500">{contacto.descripcion}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {contacto.telefono && (
                            <a href={`tel:${contacto.telefono}`} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                              <Phone size={14} />
                              {contacto.telefono}
                            </a>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openModal(contacto)}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(contacto.id)}><Trash2 size={14} className="text-costa-gris" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Proveedores de Servicios */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-costa-navy flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            Proveedores de Servicios
          </h2>
          <Button onClick={() => openProveedorModal()}>
            <Plus size={16} />
            Agregar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rubrosProveedor.map(({ value, label }) => {
            const config = rubroConfig[value] || { color: 'text-gray-600', bg: 'bg-gray-100' }
            const listaProveedores = Array.isArray(proveedoresPorRubro[value]) ? proveedoresPorRubro[value] : []

            return (
              <Card key={value} className="overflow-hidden">
                <div className={`px-4 py-3 ${config.bg} border-b`}>
                  <h3 className={`font-semibold ${config.color}`}>{label}</h3>
                </div>
                <CardContent className="p-3">
                  {listaProveedores.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Sin proveedores</p>
                  ) : (
                    <div className="space-y-3">
                      {listaProveedores.map((prov) => (
                        <div key={prov.id} className="flex items-start justify-between group">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-costa-navy text-sm truncate">
                              {prov.apellido ? `${prov.nombre} ${prov.apellido}` : prov.nombre}
                            </p>
                            {prov.telefono && (
                              <a
                                href={`tel:${prov.telefono}`}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-0.5"
                              >
                                <Phone size={12} />
                                {prov.telefono}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openProveedorModal(prov)}>
                              <Pencil size={12} />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleProveedorDelete(prov.id)}>
                              <Trash2 size={12} className="text-costa-gris" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Lista Negra */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-costa-coral flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            Lista Negra de Inquilinos
          </h2>
          <Button onClick={() => openListaNegraModal()} className="bg-costa-coral hover:bg-costa-coral/90">
            <Plus size={16} />
            Agregar
          </Button>
        </div>

        {/* Buscador */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por documento, nombre o motivo..."
              value={busquedaListaNegra}
              onChange={(e) => setBusquedaListaNegra(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-costa-coral/50"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {listaNegraFiltrada.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                {listaNegra.length === 0 ? 'No hay registros en la lista negra' : 'No se encontraron coincidencias'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {listaNegraFiltrada.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-red-50/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-costa-navy">{item.nombre}</span>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          DNI: {item.documento}
                        </span>
                      </div>
                      <p className="text-sm text-red-600 font-medium mt-1">
                        <AlertTriangle size={14} className="inline mr-1" />
                        {item.motivo}
                      </p>
                      {item.notas && (
                        <p className="text-xs text-gray-500 mt-1">{item.notas}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        {item.telefono && <span>Tel: {item.telefono}</span>}
                        {item.email && <span>{item.email}</span>}
                        <span>Agregado: {new Date(item.fecha).toLocaleDateString('es-AR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openListaNegraModal(item)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleListaNegraDelete(item.id)}>
                        <Trash2 size={14} className="text-costa-gris" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Links útiles */}
      <Card>
        <CardHeader>
          <CardTitle>Enlaces Útiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {linksUtiles.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{link.nombre}</p>
                  <p className="text-sm text-gray-500">{link.descripcion}</p>
                </div>
                <ExternalLink size={18} className="text-gray-400" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Contacto */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Contacto' : 'Nuevo Contacto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <Select label="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} options={categoriasContacto} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Proveedor */}
      <Modal isOpen={proveedorModalOpen} onClose={closeProveedorModal} title={editingProveedorId ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
        <form onSubmit={handleProveedorSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={proveedorForm.nombre}
              onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
              required
            />
            <Input
              label="Apellido"
              value={proveedorForm.apellido}
              onChange={(e) => setProveedorForm({ ...proveedorForm, apellido: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Rubro"
              value={proveedorForm.rubro}
              onChange={(e) => setProveedorForm({ ...proveedorForm, rubro: e.target.value })}
              options={rubrosProveedor}
            />
            <Input
              label="Teléfono"
              value={proveedorForm.telefono}
              onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeProveedorModal}>Cancelar</Button>
            <Button type="submit" disabled={savingProveedor}>
              {savingProveedor ? 'Guardando...' : editingProveedorId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Lista Negra */}
      <Modal isOpen={listaNegraModalOpen} onClose={closeListaNegraModal} title={editingListaNegraId ? 'Editar Registro' : 'Agregar a Lista Negra'}>
        <form onSubmit={handleListaNegraSubmit} className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} />
              Los inquilinos en esta lista serán alertados al cargar una reserva.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Documento (DNI/Pasaporte)"
              value={listaNegraForm.documento}
              onChange={(e) => setListaNegraForm({ ...listaNegraForm, documento: e.target.value })}
              required
            />
            <Input
              label="Nombre completo"
              value={listaNegraForm.nombre}
              onChange={(e) => setListaNegraForm({ ...listaNegraForm, nombre: e.target.value })}
              required
            />
          </div>
          <Input
            label="Motivo"
            value={listaNegraForm.motivo}
            onChange={(e) => setListaNegraForm({ ...listaNegraForm, motivo: e.target.value })}
            placeholder="Ej: Daños a la propiedad, impago, mal comportamiento..."
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              value={listaNegraForm.telefono}
              onChange={(e) => setListaNegraForm({ ...listaNegraForm, telefono: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={listaNegraForm.email}
              onChange={(e) => setListaNegraForm({ ...listaNegraForm, email: e.target.value })}
            />
          </div>
          <Input
            label="Fecha del incidente"
            type="date"
            value={listaNegraForm.fecha}
            onChange={(e) => setListaNegraForm({ ...listaNegraForm, fecha: e.target.value })}
          />
          <Input
            label="Notas adicionales"
            value={listaNegraForm.notas}
            onChange={(e) => setListaNegraForm({ ...listaNegraForm, notas: e.target.value })}
            placeholder="Detalles adicionales..."
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeListaNegraModal}>Cancelar</Button>
            <Button type="submit" disabled={savingListaNegra} className="bg-costa-coral hover:bg-costa-coral/90">
              {savingListaNegra ? 'Guardando...' : editingListaNegraId ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
