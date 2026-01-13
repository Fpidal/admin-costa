'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { demoPropiedades, demoReservas } from '@/lib/demoData'
import { MapPin, Users, Bed, Bath, Waves, Snowflake, Flame, Wifi, ChevronLeft, ChevronRight, X, CheckCircle, Calendar, Shield, Flag, Trophy, Dumbbell, UtensilsCrossed, Car, ShoppingCart, TreePine, Stethoscope, Phone } from 'lucide-react'
import Link from 'next/link'

interface Propiedad {
  id: number
  nombre: string
  lote: string
  direccion: string
  referencia: string
  telefono_contacto: string
  tipo: string
  estado: string
  capacidad: number
  habitaciones: number
  banos: number
  plantas: number
  toilette: boolean
  cochera: boolean
  pileta: boolean
  pileta_climatizada: boolean
  parrilla: boolean
  wifi: boolean
  aire_acondicionado: boolean
  lavadero: boolean
  lavavajillas: boolean
  metros_cubiertos: number
  metros_lote: number
  imagenes: string[]
  imagen_url: string | null
}

interface Reserva {
  id: number
  propiedad_id: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

const barrios = [
  'Todos',
  'Deportiva 1',
  'Deportiva 2',
  'Golf 1',
  'Golf 2',
  'Bosque',
  'Senderos 1',
  'Senderos 2',
  'Senderos 3',
  'Senderos 4',
  'Residencial 1',
  'Residencial 2',
  'Maritimo 1',
  'Maritimo 2',
  'Maritimo 3',
]

// Formatear teléfono para WhatsApp (sin +, espacios ni guiones, con código de país)
const formatWhatsApp = (telefono: string | null | undefined): string => {
  if (!telefono) return '541160473922' // Default
  // Limpiar: quitar +, espacios, guiones, paréntesis
  let limpio = telefono.replace(/[\s\-\+\(\)]/g, '')
  // Si empieza con 0, quitarlo (ej: 011 -> 11)
  if (limpio.startsWith('0')) limpio = limpio.substring(1)
  // Si no empieza con 54, agregarlo
  if (!limpio.startsWith('54')) limpio = '54' + limpio
  return limpio
}

function LandingContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [imageIndexes, setImageIndexes] = useState<Record<number, number>>({})
  const [lightbox, setLightbox] = useState<{ images: string[], index: number } | null>(null)
  const [servicioModal, setServicioModal] = useState<string | null>(null)
  const [filtroBarrio, setFiltroBarrio] = useState('Todos')

  // Filtrar propiedades por barrio
  const propiedadesFiltradas = filtroBarrio === 'Todos'
    ? propiedades
    : propiedades.filter(p => p.nombre === filtroBarrio)

  // Datos de contacto para cada servicio
  const serviciosContacto: Record<string, { titulo: string, contactos: { nombre: string, telefono: string }[] }> = {
    'seguridad': {
      titulo: 'Seguridad 24 hs',
      contactos: [
        { nombre: 'Central de Seguridad', telefono: '2254-123456' },
        { nombre: 'Guardia de acceso', telefono: '2254-123457' },
      ]
    },
    'medicos': {
      titulo: 'Ambulancia y Médicos',
      contactos: [
        { nombre: 'Emergencias médicas', telefono: '2254-601696' },
        { nombre: 'Médico 24 hs', telefono: '2254-601696' },
      ]
    },
    'golf': {
      titulo: 'Campo de Golf',
      contactos: [
        { nombre: 'Pro Shop / Reservas', telefono: '2254-123460' },
      ]
    },
    'polo': {
      titulo: 'Cancha de Polo',
      contactos: [
        { nombre: 'Reservas', telefono: '2254-123461' },
      ]
    },
    'deportivo': {
      titulo: 'Centro Deportivo',
      contactos: [
        { nombre: 'Recepción', telefono: '2254-123462' },
      ]
    },
    'restaurantes': {
      titulo: 'Restaurantes y Club House',
      contactos: [
        { nombre: 'Club House', telefono: '2254-123463' },
        { nombre: 'Reservas restaurante', telefono: '2254-123464' },
      ]
    },
    'cuatriciclos': {
      titulo: 'Cuatriciclos y UTVs',
      contactos: [
        { nombre: 'Alquiler', telefono: '2254-123465' },
      ]
    },
    'cabalgatas': {
      titulo: 'Cabalgatas',
      contactos: [
        { nombre: 'Reservas paseos', telefono: '2254-123466' },
      ]
    },
    'proveeduria': {
      titulo: 'Proveeduría',
      contactos: [
        { nombre: 'Proveeduría Costa', telefono: '2254-123467' },
        { nombre: 'Carnicería', telefono: '2254-123468' },
      ]
    },
  }

  useEffect(() => {
    if (isDemo) {
      // Convertir IDs de demo a números para compatibilidad
      setPropiedades(demoPropiedades.map((p, idx) => ({
        ...p,
        id: idx + 1
      })) as unknown as Propiedad[])
      setReservas(demoReservas.map((r, idx) => ({
        id: idx + 1,
        propiedad_id: parseInt(r.propiedad_id.replace('demo-prop-', '')),
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        estado: r.estado
      })) as Reserva[])
      setLoading(false)
      return
    }
    async function fetchData() {
      const [resPropiedades, resReservas] = await Promise.all([
        supabase.from('propiedades').select('*').order('nombre'),
        supabase.from('reservas').select('id, propiedad_id, fecha_inicio, fecha_fin, estado').in('estado', ['confirmada', 'pendiente'])
      ])
      if (resPropiedades.data) setPropiedades(resPropiedades.data)
      if (resReservas.data) setReservas(resReservas.data)
      setLoading(false)
    }
    fetchData()
  }, [isDemo])

  // Bloquear scroll del body cuando lightbox está abierto
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [lightbox])

  // Check if property is currently reserved
  const estaReservada = (propiedadId: number) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return reservas.some(r => {
      if (r.propiedad_id !== propiedadId) return false
      const inicio = new Date(r.fecha_inicio)
      const fin = new Date(r.fecha_fin)
      return hoy >= inicio && hoy <= fin
    })
  }

  return (
    <div className="min-h-screen">
      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-amber-100 text-amber-800 text-center py-2 text-sm font-medium">
          🔍 Modo Demo - Datos ficticios de ejemplo
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://dpghrdgippisgzvlahwi.supabase.co/storage/v1/object/public/Imagenes/foto%20playa%20costa.JPG)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-costa-navy/60 via-costa-navy/40 to-costa-navy/70" />
        </div>

        {/* Acceso dueños - arriba derecha */}
        <Link
          href={isDemo ? "/admin?demo=true" : "/admin"}
          className="absolute top-4 right-4 z-20 px-4 py-2 text-sm text-white/80 hover:text-white border border-white/30 hover:border-white/50 rounded-lg transition-colors"
        >
          Acceso dueños
        </Link>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-semibold text-white mb-4 tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
            Tu casa en Costa Esmeralda
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
            Propiedades administradas directamente por sus dueños
          </p>
          <a
            href="#propiedades"
            className="inline-block px-8 py-3 bg-white text-costa-navy font-medium rounded-lg hover:bg-costa-beige transition-colors"
          >
            Ver propiedades
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronLeft size={24} className="text-white/70 rotate-[-90deg]" />
        </div>
      </section>

      {/* Modelo Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Nuestro modelo
          </h2>
          <p className="text-costa-gris text-center mb-12 max-w-2xl mx-auto">
            Propiedades administradas directamente por sus dueños o representantes
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-costa-beige flex items-center justify-center">
                <CheckCircle size={32} className="text-costa-olivo" />
              </div>
              <h3 className="text-lg font-semibold text-costa-navy mb-2">Sin intermediarios</h3>
              <p className="text-costa-gris text-sm">
                Trato directo con los dueños. Sin comisiones de agencias ni costos ocultos.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-costa-beige flex items-center justify-center">
                <Users size={32} className="text-costa-olivo" />
              </div>
              <h3 className="text-lg font-semibold text-costa-navy mb-2">Propietarios comprometidos</h3>
              <p className="text-costa-gris text-sm">
                Cuidamos nuestras propiedades porque son nuestras. Atención personalizada garantizada.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-costa-beige flex items-center justify-center">
                <Waves size={32} className="text-costa-olivo" />
              </div>
              <h3 className="text-lg font-semibold text-costa-navy mb-2">Estándares de calidad</h3>
              <p className="text-costa-gris text-sm">
                Propiedades seleccionadas en Costa Esmeralda. Confort y tranquilidad asegurados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Descubrí Costa Esmeralda Section */}
      <section className="py-16 bg-costa-beige/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Descubrí Costa Esmeralda
          </h2>
          <p className="text-costa-gris text-center mb-12 max-w-3xl mx-auto">
            No alquilás solo una casa. Vivís una experiencia en Costa Esmeralda: un barrio privado sobre el mar con seguridad las 24 horas, naturaleza, y una infraestructura pensada para disfrutar en cualquier época del año.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <button onClick={() => setServicioModal('seguridad')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Shield size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Seguridad 24 hs</h3>
                <p className="text-sm text-costa-gris">Seguridad privada las 24 horas</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('medicos')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Stethoscope size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Ambulancia y médicos</h3>
                <p className="text-sm text-costa-gris">Atención médica las 24 hs</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('golf')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Flag size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Campo de golf</h3>
                <p className="text-sm text-costa-gris">27 hoyos de nivel internacional</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('polo')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Trophy size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Cancha de polo</h3>
                <p className="text-sm text-costa-gris">Para aficionados y profesionales</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('deportivo')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Centro deportivo</h3>
                <p className="text-sm text-costa-gris">Gimnasio, tenis y más</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('restaurantes')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Restaurantes</h3>
                <p className="text-sm text-costa-gris">Gastronomía y club house</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('cuatriciclos')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Car size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Cuatriciclos y UTVs</h3>
                <p className="text-sm text-costa-gris">Alquiler para pasear</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('cabalgatas')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <TreePine size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Cabalgatas</h3>
                <p className="text-sm text-costa-gris">Alquiler de caballos y paseos</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('proveeduria')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">Proveeduría</h3>
                <p className="text-sm text-costa-gris">Carnicería, almacén y más</p>
              </div>
            </button>
          </div>

          {/* Mapa de ubicación */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-costa-navy text-center mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
              Ubicación
            </h3>
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d50000!2d-56.799169!3d-37.017881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMzfCsDAxJzA0LjQiUyA1NsKwNDcnNTcuMCJX!5e0!3m2!1ses-419!2sar!4v1705000000000!5m2!1ses-419!2sar"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación de Costa Esmeralda"
                className="w-full"
              />
            </div>
            <p className="text-center text-costa-gris text-sm mt-4">
              Costa Esmeralda, Partido de la Costa, Buenos Aires — <span className="text-costa-navy font-medium">A solo 10 minutos de Pinamar</span>
            </p>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="propiedades" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Nuestras propiedades
          </h2>
          <p className="text-costa-gris text-center mb-8">
            Encontrá el lugar ideal para tu estadía en Costa Esmeralda
          </p>

          {/* Filtro por barrio */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 bg-costa-beige/50 px-4 py-2 rounded-full">
              <span className="text-sm text-costa-navy font-medium">Filtrar por barrio:</span>
              <select
                value={filtroBarrio}
                onChange={(e) => setFiltroBarrio(e.target.value)}
                className="bg-white border border-costa-beige rounded-lg px-3 py-1.5 text-sm text-costa-navy focus:outline-none focus:ring-2 focus:ring-costa-navy"
              >
                {barrios.map((barrio) => (
                  <option key={barrio} value={barrio}>{barrio}</option>
                ))}
              </select>
              {filtroBarrio !== 'Todos' && (
                <span className="text-xs text-costa-gris">
                  ({propiedadesFiltradas.length} {propiedadesFiltradas.length === 1 ? 'propiedad' : 'propiedades'})
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-costa-gris py-12">Cargando propiedades...</div>
          ) : propiedadesFiltradas.length === 0 ? (
            <div className="text-center text-costa-gris py-12">No hay propiedades en este barrio</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {propiedadesFiltradas.map((propiedad) => {
                const reservada = estaReservada(propiedad.id)
                const images = propiedad.imagenes?.length > 0 ? propiedad.imagenes : (propiedad.imagen_url ? [propiedad.imagen_url] : [])
                const currentIndex = imageIndexes[propiedad.id] || 0

                return (
                  <div key={propiedad.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Image Carousel */}
                    <div
                      className="relative h-56 bg-costa-beige group"
                      onTouchStart={(e) => {
                        const touch = e.touches[0]
                        e.currentTarget.dataset.touchStartX = touch.clientX.toString()
                      }}
                      onTouchEnd={(e) => {
                        const touchStartX = parseFloat(e.currentTarget.dataset.touchStartX || '0')
                        const touchEndX = e.changedTouches[0].clientX
                        const diff = touchStartX - touchEndX
                        if (Math.abs(diff) > 50 && images.length > 1) {
                          if (diff > 0) {
                            // Swipe left - next
                            const next = currentIndex === images.length - 1 ? 0 : currentIndex + 1
                            setImageIndexes({ ...imageIndexes, [propiedad.id]: next })
                          } else {
                            // Swipe right - prev
                            const prev = currentIndex === 0 ? images.length - 1 : currentIndex - 1
                            setImageIndexes({ ...imageIndexes, [propiedad.id]: prev })
                          }
                        }
                      }}
                    >
                      {images.length > 0 ? (
                        <>
                          <img
                            src={images[currentIndex]}
                            alt={propiedad.nombre}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightbox({ images, index: currentIndex })}
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={() => {
                                  const prev = currentIndex === 0 ? images.length - 1 : currentIndex - 1
                                  setImageIndexes({ ...imageIndexes, [propiedad.id]: prev })
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <button
                                onClick={() => {
                                  const next = currentIndex === images.length - 1 ? 0 : currentIndex + 1
                                  setImageIndexes({ ...imageIndexes, [propiedad.id]: next })
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronRight size={20} />
                              </button>
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {images.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setImageIndexes({ ...imageIndexes, [propiedad.id]: idx })}
                                    className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-costa-gris">
                          Sin imagen
                        </div>
                      )}

                      </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>
                          {propiedad.nombre}{propiedad.lote ? ` - Lote ${propiedad.lote}` : ''}
                        </h3>
                        {propiedad.estado === 'alquilada' ? (
                          <span className="px-2 py-0.5 bg-costa-coral text-white text-xs rounded-full flex-shrink-0">
                            Alquilada
                          </span>
                        ) : propiedad.estado === 'mantenimiento' ? (
                          <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full flex-shrink-0">
                            Mantenimiento
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-costa-olivo text-white text-xs rounded-full flex-shrink-0">
                            Disponible
                          </span>
                        )}
                      </div>

                      {propiedad.direccion && (
                        <div className="flex items-start gap-2 text-costa-gris mb-3">
                          <MapPin size={16} className="text-costa-coral mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm">{propiedad.direccion}</p>
                            {propiedad.referencia && (
                              <p className="text-xs italic mt-0.5">{propiedad.referencia}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Capacity */}
                      {propiedad.capacidad > 0 && (
                        <div className="flex items-center gap-2 text-costa-navy font-medium mb-3">
                          <span className="text-lg">👤</span>
                          <span>{propiedad.capacidad} personas</span>
                        </div>
                      )}

                      {/* Info */}
                      {(propiedad.habitaciones > 0 || propiedad.banos > 0) && (
                        <p className="text-sm text-costa-gris mb-3">
                          {[
                            propiedad.habitaciones > 0 && `${propiedad.habitaciones} dormitorio${propiedad.habitaciones > 1 ? 's' : ''}`,
                            propiedad.banos > 0 && `${propiedad.banos} baño${propiedad.banos > 1 ? 's' : ''}`,
                            propiedad.toilette && 'Toilette',
                            propiedad.plantas > 1 && `${propiedad.plantas} plantas`,
                            propiedad.cochera && 'Cochera'
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}

                      {/* Amenities */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {propiedad.pileta && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Waves size={12} />
                            {propiedad.pileta_climatizada ? 'Pileta climat.' : 'Pileta'}
                          </span>
                        )}
                        {propiedad.aire_acondicionado && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Snowflake size={12} />
                            A/C
                          </span>
                        )}
                        {propiedad.parrilla && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Flame size={12} />
                            Parrilla
                          </span>
                        )}
                        {propiedad.wifi && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Wifi size={12} />
                            WiFi
                          </span>
                        )}
                      </div>

                      {/* WhatsApp Buttons */}
                      <div className="flex gap-2">
                        <a
                          href={`https://wa.me/${formatWhatsApp(propiedad.telefono_contacto)}?text=Hola! Me interesa la propiedad ${propiedad.nombre}${propiedad.lote ? ` - Lote ${propiedad.lote}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 flex-1 py-3 bg-costa-olivo hover:bg-costa-olivo/90 text-white rounded-lg font-medium transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Consultar
                        </a>
                        <button
                          onClick={() => {
                            const baseUrl = window.location.origin
                            const mensaje = `¡Mirá esta propiedad en Costa Esmeralda! 🏠\n\n*${propiedad.nombre}${propiedad.lote ? ` - Lote ${propiedad.lote}` : ''}*\n📍 ${propiedad.direccion || propiedad.referencia}\n👥 ${propiedad.capacidad} personas | 🛏️ ${propiedad.habitaciones} hab | 🚿 ${propiedad.banos} baños\n\n${baseUrl}/#propiedades`
                            window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank')
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-costa-navy hover:bg-costa-navy/90 text-white rounded-lg font-medium transition-colors"
                          title="Compartir por WhatsApp"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                            <polyline points="16 6 12 2 8 6"/>
                            <line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                          Compartir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-costa-navy text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Admin Costa</h3>
              <p className="text-white/70 text-sm">
                Propiedades en Costa Esmeralda administradas directamente por sus dueños.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contacto</h4>
              <p className="text-white/70 text-sm mb-2">Costa Esmeralda, Buenos Aires</p>
              <a
                href="https://wa.me/541160473922"
                target="_blank"
                rel="noopener noreferrer"
                className="text-costa-olivo hover:text-white transition-colors text-sm"
              >
                +54 11 6047-3922
              </a>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Accesos</h4>
              <Link href={isDemo ? "/admin?demo=true" : "/admin"} className="text-white/70 hover:text-white transition-colors text-sm block mb-2">
                Acceso dueños
              </Link>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/50 text-sm">
            © {new Date().getFullYear()} Admin Costa. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center touch-none"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
          >
            <X size={28} />
          </button>

          {/* Área de swipe */}
          <div
            className="w-full h-full flex items-center justify-center"
            onTouchStart={(e) => {
              e.currentTarget.dataset.touchStartX = e.touches[0].clientX.toString()
              e.currentTarget.dataset.touchStartY = e.touches[0].clientY.toString()
            }}
            onTouchMove={(e) => {
              // Prevenir scroll
              e.preventDefault()
            }}
            onTouchEnd={(e) => {
              const startX = parseFloat(e.currentTarget.dataset.touchStartX || '0')
              const startY = parseFloat(e.currentTarget.dataset.touchStartY || '0')
              const endX = e.changedTouches[0].clientX
              const endY = e.changedTouches[0].clientY
              const diffX = startX - endX
              const diffY = startY - endY

              // Solo swipe horizontal si el movimiento horizontal es mayor que el vertical
              if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40 && lightbox.images.length > 1) {
                if (diffX > 0) {
                  const next = lightbox.index === lightbox.images.length - 1 ? 0 : lightbox.index + 1
                  setLightbox({ ...lightbox, index: next })
                } else {
                  const prev = lightbox.index === 0 ? lightbox.images.length - 1 : lightbox.index - 1
                  setLightbox({ ...lightbox, index: prev })
                }
              }
            }}
            onClick={() => setLightbox(null)}
          >
            <img
              src={lightbox.images[lightbox.index]}
              alt="Foto de propiedad"
              className="max-h-[85vh] max-w-[90vw] object-contain pointer-events-none select-none"
            />
          </div>

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

              <div className="absolute bottom-6 right-6 text-white/80 text-sm">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de Servicios */}
      {servicioModal && serviciosContacto[servicioModal] && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setServicioModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-costa-navy px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">{serviciosContacto[servicioModal].titulo}</h3>
              <button
                onClick={() => setServicioModal(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-costa-gris mb-4">Teléfonos útiles:</p>
              {serviciosContacto[servicioModal].contactos.map((contacto, idx) => (
                <a
                  key={idx}
                  href={`tel:${contacto.telefono.replace(/-/g, '')}`}
                  className="flex items-center justify-between p-4 bg-costa-beige/30 rounded-xl hover:bg-costa-beige/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-costa-navy">{contacto.nombre}</p>
                    <p className="text-sm text-costa-gris">{contacto.telefono}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-costa-olivo flex items-center justify-center">
                    <Phone size={20} className="text-white" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-gray-500">Cargando...</div></div>}>
      <LandingContent />
    </Suspense>
  )
}
