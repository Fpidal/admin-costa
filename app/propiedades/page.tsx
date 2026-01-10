'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { Plus, MapPin, Bed, Bath, Car, Pencil, Trash2, Upload, X, Star, ChevronLeft, ChevronRight } from 'lucide-react'

interface Propiedad {
  id: number
  nombre: string
  direccion: string
  tipo: string
  habitaciones: number
  banos: number
  cochera: boolean
  precio_alquiler: number
  estado: string
  descripcion: string
  imagen_url: string | null
  imagenes: string[]
}

const tiposPropiedad = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'monoambiente', label: 'Monoambiente' },
  { value: 'local', label: 'Local' },
]

const estadosPropiedad = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'alquilada', label: 'Alquilada' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
]

const estadoVariant = {
  'alquilada': 'success',
  'disponible': 'info',
  'mantenimiento': 'warning',
} as const

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const initialForm = {
  nombre: '',
  direccion: '',
  tipo: '',
  habitaciones: 0,
  banos: 0,
  cochera: false,
  precio_alquiler: 0,
  estado: 'disponible',
  descripcion: '',
  imagenes: [] as string[],
}

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageIndexes, setImageIndexes] = useState<Record<number, number>>({})

  useEffect(() => {
    fetchPropiedades()
  }, [])

  async function fetchPropiedades() {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPropiedades(data)
    }
    setLoading(false)
  }

  function openModal(propiedad?: Propiedad) {
    if (propiedad) {
      setEditingId(propiedad.id)
      setForm({
        nombre: propiedad.nombre || '',
        direccion: propiedad.direccion || '',
        tipo: propiedad.tipo || '',
        habitaciones: propiedad.habitaciones || 0,
        banos: propiedad.banos || 0,
        cochera: propiedad.cochera || false,
        precio_alquiler: propiedad.precio_alquiler || 0,
        estado: propiedad.estado || 'disponible',
        descripcion: propiedad.descripcion || '',
        imagenes: propiedad.imagenes || (propiedad.imagen_url ? [propiedad.imagen_url] : []),
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (form.imagenes.length >= 6) {
      alert('Máximo 6 imágenes permitidas')
      return
    }

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('Imagenes')
      .upload(fileName, file)

    if (uploadError) {
      alert('Error al subir imagen: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('Imagenes')
      .getPublicUrl(fileName)

    setForm({ ...form, imagenes: [...form.imagenes, publicUrl] })
    setUploading(false)
  }

  function removeImage(index: number) {
    setForm({ ...form, imagenes: form.imagenes.filter((_, i) => i !== index) })
  }

  function setMainImage(index: number) {
    if (index === 0) return
    const newImagenes = [...form.imagenes]
    const [selected] = newImagenes.splice(index, 1)
    newImagenes.unshift(selected)
    setForm({ ...form, imagenes: newImagenes })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const data = {
      nombre: form.nombre,
      direccion: form.direccion,
      tipo: form.tipo,
      habitaciones: Number(form.habitaciones),
      banos: Number(form.banos),
      cochera: form.cochera,
      precio_alquiler: Number(form.precio_alquiler),
      estado: form.estado,
      descripcion: form.descripcion,
      imagenes: form.imagenes,
      imagen_url: form.imagenes[0] || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('propiedades')
        .update(data)
        .eq('id', editingId)

      if (error) {
        alert('Error al actualizar: ' + error.message)
      }
    } else {
      const { error } = await supabase
        .from('propiedades')
        .insert([data])

      if (error) {
        alert('Error al crear: ' + error.message)
      }
    }

    setSaving(false)
    closeModal()
    fetchPropiedades()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta propiedad?')) return

    const { error } = await supabase
      .from('propiedades')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      fetchPropiedades()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Propiedades"
        description="Gestiona tu cartera de propiedades"
      >
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nueva Propiedad
        </Button>
      </PageHeader>

      {propiedades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No hay propiedades registradas</p>
            <Button className="mt-4" onClick={() => openModal()}>
              <Plus size={18} />
              Agregar primera propiedad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {propiedades.map((propiedad) => (
            <Card key={propiedad.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {/* Imagen con carrusel */}
                <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-xl flex items-center justify-center overflow-hidden relative group">
                  {(propiedad.imagenes?.length > 0 || propiedad.imagen_url) ? (
                    <>
                      <img
                        src={propiedad.imagenes?.[imageIndexes[propiedad.id] || 0] || propiedad.imagen_url || ''}
                        alt={propiedad.nombre}
                        className="w-full h-full object-cover"
                      />
                      {propiedad.imagenes?.length > 1 && (
                        <>
                          {/* Flechas de navegación */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const current = imageIndexes[propiedad.id] || 0
                              const prev = current === 0 ? propiedad.imagenes.length - 1 : current - 1
                              setImageIndexes({ ...imageIndexes, [propiedad.id]: prev })
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const current = imageIndexes[propiedad.id] || 0
                              const next = current === propiedad.imagenes.length - 1 ? 0 : current + 1
                              setImageIndexes({ ...imageIndexes, [propiedad.id]: next })
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                          >
                            <ChevronRight size={20} />
                          </button>
                          {/* Indicador de posición */}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {propiedad.imagenes.map((_, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${idx === (imageIndexes[propiedad.id] || 0) ? 'bg-white' : 'bg-white/50'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-blue-400 text-sm">Sin imagen</span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>{propiedad.nombre}</h3>
                    <Badge variant={estadoVariant[propiedad.estado as keyof typeof estadoVariant] || 'default'}>
                      {propiedad.estado}
                    </Badge>
                  </div>

                  {propiedad.direccion && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                      <MapPin size={14} />
                      <span className="truncate">{propiedad.direccion}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    {propiedad.habitaciones > 0 && (
                      <div className="flex items-center gap-1">
                        <Bed size={16} />
                        <span>{propiedad.habitaciones}</span>
                      </div>
                    )}
                    {propiedad.banos > 0 && (
                      <div className="flex items-center gap-1">
                        <Bath size={16} />
                        <span>{propiedad.banos}</span>
                      </div>
                    )}
                    {propiedad.cochera && (
                      <div className="flex items-center gap-1">
                        <Car size={16} />
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-lg font-bold text-blue-600">
                      {propiedad.precio_alquiler ? `${formatMonto(propiedad.precio_alquiler)}/mes` : '-'}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openModal(propiedad)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(propiedad.id)}>
                        <Trash2 size={16} className="text-costa-gris" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Formulario */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Propiedad' : 'Nueva Propiedad'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              options={tiposPropiedad}
            />
          </div>

          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Habitaciones"
              type="number"
              min="0"
              value={form.habitaciones}
              onChange={(e) => setForm({ ...form, habitaciones: Number(e.target.value) })}
            />
            <Input
              label="Baños"
              type="number"
              min="0"
              value={form.banos}
              onChange={(e) => setForm({ ...form, banos: Number(e.target.value) })}
            />
            <Input
              label="Precio/mes"
              type="number"
              min="0"
              value={form.precio_alquiler}
              onChange={(e) => setForm({ ...form, precio_alquiler: Number(e.target.value) })}
            />
            <Select
              label="Estado"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              options={estadosPropiedad}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cochera"
              checked={form.cochera}
              onChange={(e) => setForm({ ...form, cochera: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="cochera" className="text-sm text-gray-700">Tiene cochera</label>
          </div>

          <Textarea
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          {/* Upload de imágenes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Imágenes ({form.imagenes.length}/6)
            </label>

            {/* Grid de imágenes */}
            {form.imagenes.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {form.imagenes.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                    <img src={url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-costa-gris text-white rounded-full hover:bg-costa-navy"
                    >
                      <X size={14} />
                    </button>
                    {/* Botón hacer principal */}
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => setMainImage(index)}
                        className="absolute top-1 left-1 p-1 bg-black/50 text-white rounded-full hover:bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hacer principal"
                      >
                        <Star size={14} />
                      </button>
                    )}
                    {/* Badge principal */}
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Star size={10} fill="white" />
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón de subir si hay espacio */}
            {form.imagenes.length < 6 && (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload size={20} className="text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">
                  {uploading ? 'Subiendo...' : 'Click para agregar imagen'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
