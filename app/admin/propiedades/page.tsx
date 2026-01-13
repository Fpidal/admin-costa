'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { demoPropiedades, demoReservas } from '@/lib/demoData'
import { Card, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { Plus, MapPin, Bed, Bath, Car, Pencil, Trash2, Upload, X, Star, ChevronLeft, ChevronRight, Waves, Snowflake, Flame, Zap, Ruler, ThermometerSun, LandPlot, Calendar, Search, Wifi, WashingMachine, UtensilsCrossed, Share2 } from 'lucide-react'
import Link from 'next/link'

interface Propiedad {
  id: number
  nombre: string
  direccion: string
  referencia: string
  telefono_contacto: string
  tipo: string
  capacidad: number
  habitaciones: number
  banos: number
  camas: number
  plantas: number
  cochera: boolean
  precio_alquiler: number
  estado: string
  descripcion: string
  imagen_url: string | null
  imagenes: string[]
  // Amenities
  pileta: boolean
  pileta_climatizada: boolean
  parrilla: boolean
  grupo_electrogeno: boolean
  toilette: boolean
  lavadero: boolean
  lavavajillas: boolean
  aire_acondicionado: boolean
  calefaccion: boolean
  fogonero: boolean
  wifi: boolean
  // Metros
  metros_cubiertos: number
  metros_semicubiertos: number
  metros_lote: number
}

interface Reserva {
  id: number
  propiedad_id: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

const tiposPropiedad = [
  { value: 'casa', label: 'Casa' },
  { value: 'departamento', label: 'Departamento' },
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
  referencia: '',
  telefono_contacto: '',
  tipo: '',
  capacidad: 0,
  habitaciones: 0,
  banos: 0,
  camas: 0,
  plantas: 1,
  cochera: false,
  precio_alquiler: 0,
  estado: 'disponible',
  descripcion: '',
  imagenes: [] as string[],
  // Amenities
  pileta: false,
  pileta_climatizada: false,
  parrilla: false,
  grupo_electrogeno: false,
  toilette: false,
  lavadero: false,
  lavavajillas: false,
  aire_acondicionado: false,
  calefaccion: false,
  fogonero: false,
  wifi: false,
  // Metros
  metros_cubiertos: 0,
  metros_semicubiertos: 0,
  metros_lote: 0,
}

function PropiedadesContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageIndexes, setImageIndexes] = useState<Record<number | string, number>>({})
  const [fechaBusqueda, setFechaBusqueda] = useState({ inicio: '', fin: '' })
  const [lightbox, setLightbox] = useState<{ images: string[], index: number } | null>(null)

  useEffect(() => {
    if (isDemo) {
      setPropiedades(demoPropiedades as unknown as Propiedad[])
      setReservas(demoReservas.map(r => ({
        id: r.id as unknown as number,
        propiedad_id: r.propiedad_id as unknown as number,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        estado: r.estado,
      })) as Reserva[])
      setLoading(false)
      return
    }
    fetchData()
  }, [isDemo])

  async function fetchData() {
    const [resPropiedades, resReservas] = await Promise.all([
      supabase.from('propiedades').select('*').order('created_at', { ascending: false }),
      supabase.from('reservas').select('id, propiedad_id, fecha_inicio, fecha_fin, estado').in('estado', ['confirmada', 'pendiente'])
    ])

    if (resPropiedades.data) setPropiedades(resPropiedades.data)
    if (resReservas.data) setReservas(resReservas.data)
    setLoading(false)
  }

  // Obtener reserva actual o próxima de una propiedad
  function getReservaActual(propiedadId: number): Reserva | null {
    const hoy = new Date().toISOString().split('T')[0]
    return reservas.find(r =>
      r.propiedad_id === propiedadId &&
      r.fecha_inicio <= hoy &&
      r.fecha_fin >= hoy
    ) || null
  }

  function getProximaReserva(propiedadId: number): Reserva | null {
    const hoy = new Date().toISOString().split('T')[0]
    const proximas = reservas
      .filter(r => r.propiedad_id === propiedadId && r.fecha_inicio > hoy)
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    return proximas[0] || null
  }

  // Verificar disponibilidad para fechas buscadas
  function estaDisponible(propiedadId: number): boolean {
    if (!fechaBusqueda.inicio || !fechaBusqueda.fin) return true
    return !reservas.some(r =>
      r.propiedad_id === propiedadId &&
      r.fecha_inicio < fechaBusqueda.fin &&
      r.fecha_fin > fechaBusqueda.inicio
    )
  }

  const formatFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  }

  function compartirWhatsApp(propiedad: Propiedad) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const mensaje = `¡Mirá esta propiedad en Costa Esmeralda! 🏠\n\n*${propiedad.nombre}*\n📍 ${propiedad.direccion || propiedad.referencia}\n👥 ${propiedad.capacidad} personas | 🛏️ ${propiedad.habitaciones} hab | 🚿 ${propiedad.banos} baños\n\n${baseUrl}/#propiedades`
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  function openModal(propiedad?: Propiedad) {
    if (propiedad) {
      setEditingId(propiedad.id)
      setForm({
        nombre: propiedad.nombre || '',
        direccion: propiedad.direccion || '',
        referencia: propiedad.referencia || '',
        telefono_contacto: propiedad.telefono_contacto || '',
        tipo: propiedad.tipo || '',
        capacidad: propiedad.capacidad || 0,
        habitaciones: propiedad.habitaciones || 0,
        banos: propiedad.banos || 0,
        camas: propiedad.camas || 0,
        plantas: propiedad.plantas || 1,
        cochera: propiedad.cochera || false,
        precio_alquiler: propiedad.precio_alquiler || 0,
        estado: propiedad.estado || 'disponible',
        descripcion: propiedad.descripcion || '',
        imagenes: propiedad.imagenes || (propiedad.imagen_url ? [propiedad.imagen_url] : []),
        pileta: propiedad.pileta || false,
        pileta_climatizada: propiedad.pileta_climatizada || false,
        parrilla: propiedad.parrilla || false,
        grupo_electrogeno: propiedad.grupo_electrogeno || false,
        toilette: propiedad.toilette || false,
        lavadero: propiedad.lavadero || false,
        lavavajillas: propiedad.lavavajillas || false,
        aire_acondicionado: propiedad.aire_acondicionado || false,
        calefaccion: propiedad.calefaccion || false,
        fogonero: propiedad.fogonero || false,
        wifi: propiedad.wifi || false,
        metros_cubiertos: propiedad.metros_cubiertos || 0,
        metros_semicubiertos: propiedad.metros_semicubiertos || 0,
        metros_lote: propiedad.metros_lote || 0,
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
      referencia: form.referencia,
      telefono_contacto: form.telefono_contacto,
      tipo: form.tipo,
      capacidad: Number(form.capacidad),
      habitaciones: Number(form.habitaciones),
      banos: Number(form.banos),
      camas: Number(form.camas),
      plantas: Number(form.plantas),
      cochera: form.cochera,
      precio_alquiler: Number(form.precio_alquiler),
      estado: form.estado,
      descripcion: form.descripcion,
      imagenes: form.imagenes,
      imagen_url: form.imagenes[0] || null,
      pileta: form.pileta,
      pileta_climatizada: form.pileta_climatizada,
      parrilla: form.parrilla,
      grupo_electrogeno: form.grupo_electrogeno,
      toilette: form.toilette,
      lavadero: form.lavadero,
      lavavajillas: form.lavavajillas,
      aire_acondicionado: form.aire_acondicionado,
      calefaccion: form.calefaccion,
      fogonero: form.fogonero,
      wifi: form.wifi,
      metros_cubiertos: Number(form.metros_cubiertos),
      metros_semicubiertos: Number(form.metros_semicubiertos),
      metros_lote: Number(form.metros_lote),
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
    fetchData()
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
      fetchData()
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
        description="Gestión directa de propiedades por sus propietarios o representantes"
      >
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nueva Propiedad
        </Button>
      </PageHeader>

      {/* Buscador de disponibilidad */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-costa-navy">
              <Search size={16} />
              <span className="font-medium">Buscar disponibilidad:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fechaBusqueda.inicio}
                onChange={(e) => setFechaBusqueda({ ...fechaBusqueda, inicio: e.target.value })}
                className="px-2 py-1 text-sm border border-costa-gris/30 rounded focus:outline-none focus:ring-1 focus:ring-costa-navy"
              />
              <span className="text-costa-gris">→</span>
              <input
                type="date"
                value={fechaBusqueda.fin}
                onChange={(e) => setFechaBusqueda({ ...fechaBusqueda, fin: e.target.value })}
                className="px-2 py-1 text-sm border border-costa-gris/30 rounded focus:outline-none focus:ring-1 focus:ring-costa-navy"
              />
              {(fechaBusqueda.inicio || fechaBusqueda.fin) && (
                <Button variant="ghost" size="sm" onClick={() => setFechaBusqueda({ inicio: '', fin: '' })}>
                  <X size={14} />
                </Button>
              )}
            </div>
            {fechaBusqueda.inicio && fechaBusqueda.fin && (
              <span className="text-xs text-costa-gris">
                {propiedades.filter(p => estaDisponible(p.id)).length} disponibles
              </span>
            )}
          </div>
        </CardContent>
      </Card>

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
          {propiedades.map((propiedad) => {
            const reservaActual = getReservaActual(propiedad.id)
            const proximaReserva = getProximaReserva(propiedad.id)
            const disponible = estaDisponible(propiedad.id)

            return (
            <Card key={propiedad.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
              <CardContent className="p-0 flex flex-col flex-1">
                {/* Imagen con carrusel */}
                <div className="h-40 bg-gradient-to-br from-costa-beige to-costa-beige-light rounded-t-xl flex items-center justify-center overflow-hidden relative group">
                  {(propiedad.imagenes?.length > 0 || propiedad.imagen_url) ? (
                    <>
                      <img
                        src={propiedad.imagenes?.[imageIndexes[propiedad.id] || 0] || propiedad.imagen_url || ''}
                        alt={propiedad.nombre}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          const images = propiedad.imagenes?.length > 0 ? propiedad.imagenes : (propiedad.imagen_url ? [propiedad.imagen_url] : [])
                          if (images.length > 0) {
                            setLightbox({ images, index: imageIndexes[propiedad.id] || 0 })
                          }
                        }}
                      />
                      {propiedad.imagenes?.length > 1 && (
                        <>
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
                    <span className="text-costa-gris text-sm">Sin imagen</span>
                  )}

                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>{propiedad.nombre}</h3>
                    {reservaActual ? (
                      <span className="px-2 py-0.5 bg-costa-coral text-white text-xs rounded-full">
                        Reservada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-costa-olivo text-white text-xs rounded-full">
                        Disponible
                      </span>
                    )}
                  </div>

                  {/* Ubicación */}
                  {propiedad.direccion && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin size={14} className="text-costa-coral" />
                        <span>{propiedad.direccion}</span>
                      </div>
                      {propiedad.referencia && (
                        <p className="text-xs text-costa-gris ml-5 mt-0.5 italic">{propiedad.referencia}</p>
                      )}
                    </div>
                  )}

                  {/* Capacidad destacada */}
                  {propiedad.capacidad > 0 && (
                    <div className="flex items-center gap-1.5 text-costa-navy font-medium mb-2">
                      <span className="text-base">👤</span>
                      <span>{propiedad.capacidad} personas</span>
                    </div>
                  )}

                  {/* Info descriptiva */}
                  {propiedad.tipo !== 'lote' && (propiedad.habitaciones > 0 || propiedad.banos > 0) && (
                    <p className="text-sm text-costa-gris mb-2">
                      {[
                        propiedad.habitaciones > 0 && `${propiedad.habitaciones} dormitorio${propiedad.habitaciones > 1 ? 's' : ''}`,
                        propiedad.banos > 0 && `${propiedad.banos} baño${propiedad.banos > 1 ? 's' : ''}`,
                        propiedad.toilette && 'Toilette',
                        propiedad.plantas > 1 && `${propiedad.plantas} plantas`
                      ].filter(Boolean).join(' • ')}
                      {propiedad.cochera && ' • Cochera'}
                    </p>
                  )}

                  {/* Metros */}
                  {(propiedad.metros_cubiertos > 0 || propiedad.metros_lote > 0) && (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-costa-gris mb-2">
                      {propiedad.metros_cubiertos > 0 && (
                        <div className="flex items-center gap-1">
                          <Ruler size={14} />
                          <span>{propiedad.metros_cubiertos}m² cubiertos</span>
                        </div>
                      )}
                      {propiedad.metros_lote > 0 && (
                        <div className="flex items-center gap-1">
                          <LandPlot size={14} />
                          <span>{propiedad.metros_lote}m² lote</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {propiedad.pileta && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title={propiedad.pileta_climatizada ? 'Pileta climatizada' : 'Pileta'}>
                        <Waves size={12} />
                        <span>{propiedad.pileta_climatizada ? 'Climat.' : 'Pileta'}</span>
                      </div>
                    )}
                    {propiedad.aire_acondicionado && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="Aire acondicionado">
                        <Snowflake size={12} />
                        <span>A/C</span>
                      </div>
                    )}
                    {propiedad.calefaccion && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="Calefacción">
                        <ThermometerSun size={12} />
                        <span>Calef.</span>
                      </div>
                    )}
                    {propiedad.parrilla && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="Parrilla">
                        <Flame size={12} />
                        <span>Parrilla</span>
                      </div>
                    )}
                    {propiedad.grupo_electrogeno && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="Grupo electrógeno">
                        <Zap size={12} />
                        <span>Generador</span>
                      </div>
                    )}
                    {propiedad.wifi && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="WiFi">
                        <Wifi size={12} />
                        <span>WiFi</span>
                      </div>
                    )}
                    {propiedad.lavadero && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="Lavadero">
                        <WashingMachine size={12} />
                        <span>Lavadero</span>
                      </div>
                    )}
                    {propiedad.lavavajillas && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-costa-beige text-costa-gris text-xs" title="Lavavajillas">
                        <UtensilsCrossed size={12} />
                        <span>Lavavaj.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-costa-beige flex items-center justify-end mt-auto">
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://wa.me/541160473922?text=Hola! Me interesa la propiedad ${propiedad.nombre}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-costa-olivo hover:bg-costa-olivo/80 text-white text-xs font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Contacto
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => compartirWhatsApp(propiedad)} title="Compartir por WhatsApp">
                        <Share2 size={16} className="text-green-600" />
                      </Button>
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
            )
          })}
        </div>
      )}

      {/* Modal Formulario */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Propiedad' : 'Nueva Propiedad'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Botones arriba */}
          <div className="flex justify-end gap-2 pb-2 border-b border-costa-beige">
            <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <Input
            label="Referencia (ej: A 300m del club house, cerca del mar)"
            value={form.referencia}
            onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            placeholder="Descripción corta de ubicación"
          />

          <Input
            label="Teléfono de contacto (WhatsApp)"
            value={form.telefono_contacto}
            onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
            placeholder="Ej: 541160473922"
          />

          {/* Capacidad */}
          <Input
            label="Capacidad (personas)"
            type="number"
            min="0"
            value={form.capacidad || ''}
            onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) || 0 })}
          />

          {/* Campos numéricos - ocultar si es lote */}
          {form.tipo !== 'lote' && (
            <div className="grid grid-cols-5 gap-2">
              <Input
                label="Habit."
                type="number"
                min="0"
                value={form.habitaciones || ''}
                onChange={(e) => setForm({ ...form, habitaciones: Number(e.target.value) || 0 })}
              />
              <Input
                label="Baños"
                type="number"
                min="0"
                value={form.banos || ''}
                onChange={(e) => setForm({ ...form, banos: Number(e.target.value) || 0 })}
              />
              <Input
                label="Camas"
                type="number"
                min="0"
                value={form.camas || ''}
                onChange={(e) => setForm({ ...form, camas: Number(e.target.value) || 0 })}
              />
              <Input
                label="Plantas"
                type="number"
                min="1"
                value={form.plantas || ''}
                onChange={(e) => setForm({ ...form, plantas: Number(e.target.value) || 1 })}
              />
              <Input
                label="$/mes"
                type="number"
                min="0"
                value={form.precio_alquiler || ''}
                onChange={(e) => setForm({ ...form, precio_alquiler: Number(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Estado"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              options={estadosPropiedad}
            />
            <Input
              label="M² lote"
              type="number"
              min="0"
              value={form.metros_lote || ''}
              onChange={(e) => setForm({ ...form, metros_lote: Number(e.target.value) || 0 })}
            />
          </div>

          {/* Metros cubiertos - ocultar si es lote */}
          {form.tipo !== 'lote' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="M² cubiertos"
                type="number"
                min="0"
                value={form.metros_cubiertos || ''}
                onChange={(e) => setForm({ ...form, metros_cubiertos: Number(e.target.value) || 0 })}
              />
              <Input
                label="M² semicub."
                type="number"
                min="0"
                value={form.metros_semicubiertos || ''}
                onChange={(e) => setForm({ ...form, metros_semicubiertos: Number(e.target.value) || 0 })}
              />
            </div>
          )}

          {/* Amenities - ocultar si es lote */}
          {form.tipo !== 'lote' && (
            <div className="border border-costa-beige rounded-lg p-2">
              <p className="text-xs font-medium text-costa-navy mb-1.5">Amenities</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cochera', label: 'Cochera', key: 'cochera' },
                  { id: 'pileta', label: 'Pileta', key: 'pileta' },
                  { id: 'pileta_climatizada', label: 'Pileta climat.', key: 'pileta_climatizada' },
                  { id: 'parrilla', label: 'Parrilla', key: 'parrilla' },
                  { id: 'fogonero', label: 'Fogonero', key: 'fogonero' },
                  { id: 'grupo_electrogeno', label: 'Generador', key: 'grupo_electrogeno' },
                  { id: 'toilette', label: 'Toilette', key: 'toilette' },
                  { id: 'lavadero', label: 'Lavadero', key: 'lavadero' },
                  { id: 'lavavajillas', label: 'Lavavajillas', key: 'lavavajillas' },
                  { id: 'aire_acondicionado', label: 'A/C', key: 'aire_acondicionado' },
                  { id: 'calefaccion', label: 'Calefacción', key: 'calefaccion' },
                  { id: 'wifi', label: 'WiFi', key: 'wifi' },
                ].map((amenity) => (
                  <label key={amenity.id} className="flex items-center gap-1 text-xs text-costa-navy cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[amenity.key as keyof typeof form] as boolean}
                      onChange={(e) => setForm({ ...form, [amenity.key]: e.target.checked })}
                      className="w-3 h-3 rounded border-costa-gris text-costa-navy focus:ring-costa-navy"
                    />
                    {amenity.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <Textarea
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          {/* Upload de imágenes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-costa-navy">
              Imágenes ({form.imagenes.length}/6)
            </label>

            {/* Grid de imágenes - más compacto */}
            {form.imagenes.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {form.imagenes.map((url, index) => (
                  <div key={index} className="relative aspect-video rounded overflow-hidden bg-costa-beige group">
                    <img src={url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-costa-gris/80 text-white rounded-full hover:bg-costa-navy"
                    >
                      <X size={10} />
                    </button>
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => setMainImage(index)}
                        className="absolute top-0.5 left-0.5 p-0.5 bg-black/50 text-white rounded-full hover:bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hacer principal"
                      >
                        <Star size={10} />
                      </button>
                    )}
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-yellow-500/90 text-white text-center py-0.5">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Botón de subir */}
            {form.imagenes.length < 6 && (
              <label className="flex items-center justify-center gap-2 w-full h-12 border border-dashed border-costa-gris/50 rounded cursor-pointer hover:border-costa-navy hover:bg-costa-beige/50 transition-colors">
                <Upload size={14} className="text-costa-gris" />
                <span className="text-xs text-costa-gris">
                  {uploading ? 'Subiendo...' : 'Agregar imagen'}
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
        </form>
      </Modal>

      {/* Lightbox para ver fotos grandes */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Botón cerrar */}
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={28} />
          </button>

          {/* Imagen grande */}
          <img
            src={lightbox.images[lightbox.index]}
            alt="Foto de propiedad"
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navegación */}
          {lightbox.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const prev = lightbox.index === 0 ? lightbox.images.length - 1 : lightbox.index - 1
                  setLightbox({ ...lightbox, index: prev })
                }}
                className="absolute left-4 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const next = lightbox.index === lightbox.images.length - 1 ? 0 : lightbox.index + 1
                  setLightbox({ ...lightbox, index: next })
                }}
                className="absolute right-4 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
              >
                <ChevronRight size={32} />
              </button>

              {/* Indicador de fotos */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {lightbox.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightbox({ ...lightbox, index: idx })
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === lightbox.index ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>

              {/* Contador */}
              <div className="absolute bottom-6 right-6 text-white/80 text-sm">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function PropiedadesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <PropiedadesContent />
    </Suspense>
  )
}
