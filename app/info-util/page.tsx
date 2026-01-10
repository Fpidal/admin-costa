'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Select } from '@/components/ui'
import { Plus, Phone, Pencil, Trash2, Shield, Zap, Wrench, ExternalLink } from 'lucide-react'

interface Contacto {
  id: number
  nombre: string
  categoria: string
  telefono: string
  email: string
  descripcion: string
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

export default function InfoUtilPage() {
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchContactos()
  }, [])

  async function fetchContactos() {
    const { data, error } = await supabase.from('contactos').select('*').order('categoria, nombre')
    if (!error && data) setContactos(data)
    setLoading(false)
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
      const { error } = await supabase.from('contactos').insert([data])
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

  // Agrupar contactos por categoría
  const contactosPorCategoria = contactos.reduce((acc, c) => {
    const cat = c.categoria || 'mantenimiento'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(c)
    return acc
  }, {} as Record<string, Contacto[]>)

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

      {/* Modal */}
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
    </div>
  )
}
