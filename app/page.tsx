'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { demoPropiedades, demoReservas } from '@/lib/demoData'
import { MapPin, Users, Bed, Bath, Waves, Snowflake, Flame, Wifi, ChevronLeft, ChevronRight, X, CheckCircle, Calendar, Shield, Flag, Trophy, Dumbbell, UtensilsCrossed, Car, ShoppingCart, TreePine, Stethoscope, Phone, ThermometerSun, Zap, WashingMachine, Ruler, LandPlot, Eye, Globe } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import Link from 'next/link'
import { SelectorFechasPublico } from '@/components/SelectorFechasPublico'
import { calcularPrecioReserva, formatPrecio, PrecioCalendario } from '@/lib/calcularPrecio'

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
  calefaccion: boolean
  lavadero: boolean
  lavavajillas: boolean
  grupo_electrogeno: boolean
  fogonero: boolean
  metros_cubiertos: number
  metros_semicubiertos: number
  metros_lote: number
  descripcion: string
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
  const { language, toggleLanguage, t } = useLanguage()

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [imageIndexes, setImageIndexes] = useState<Record<number, number>>({})
  const [lightbox, setLightbox] = useState<{ images: string[], index: number } | null>(null)
  const [servicioModal, setServicioModal] = useState<string | null>(null)
  const [filtroBarrio, setFiltroBarrio] = useState('Todos')
  const [propiedadModal, setPropiedadModal] = useState<Propiedad | null>(null)
  const [modalImageIndex, setModalImageIndex] = useState(0)

  // Hero slideshow
  const [heroImageIndex, setHeroImageIndex] = useState(0)
  const heroImages = [
    'https://dpghrdgippisgzvlahwi.supabase.co/storage/v1/object/public/Imagenes/foto%20playa%20costa.JPG',
    'https://costa-esmeralda.com.ar/wp-content/uploads/2021/06/naturaleza.jpg',
    'https://costa-esmeralda.com.ar/wp-content/uploads/2024/04/Cancha-de-Polo-02-scaled.jpg',
  ]

  // Sticky header
  const [showStickyHeader, setShowStickyHeader] = useState(false)

  // Estado para búsqueda de fechas y precios
  const [fechasBusqueda, setFechasBusqueda] = useState<{ checkIn: string; checkOut: string } | null>(null)
  const [preciosCalendario, setPreciosCalendario] = useState<Record<number, PrecioCalendario[]>>({})
  const [preciosCalculados, setPreciosCalculados] = useState<Record<number, { total: number; noches: number; promedio: number; disponible: boolean }>>({})
  const [loadingPrecios, setLoadingPrecios] = useState(false)

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
        supabase.from('propiedades').select('*').neq('publicada', false).order('nombre'),
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

  // Hero slideshow automático
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000) // Cambiar cada 5 segundos
    return () => clearInterval(interval)
  }, [heroImages.length])

  // Sticky header al scrollear
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Buscar precios cuando se seleccionan fechas
  useEffect(() => {
    if (!fechasBusqueda || propiedades.length === 0) return
    if (isDemo) {
      // En modo demo, generar precios ficticios
      const calculados: Record<number, { total: number; noches: number; promedio: number; disponible: boolean }> = {}
      const checkIn = new Date(fechasBusqueda.checkIn)
      const checkOut = new Date(fechasBusqueda.checkOut)
      const noches = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

      propiedades.forEach(p => {
        // Precio demo aleatorio entre 150 y 300 USD
        const precioNoche = 150 + Math.floor(Math.random() * 150)
        calculados[p.id] = {
          total: precioNoche * noches,
          noches,
          promedio: precioNoche,
          disponible: Math.random() > 0.2 // 80% disponible
        }
      })
      setPreciosCalculados(calculados)
      return
    }

    async function fetchPreciosYCalcular() {
      setLoadingPrecios(true)
      try {
        // Obtener precios de todas las propiedades
        const { data: precios } = await supabase
          .from('precios_calendario')
          .select('*')
          .gte('fecha_fin', fechasBusqueda!.checkIn)
          .lte('fecha_inicio', fechasBusqueda!.checkOut)

        if (precios) {
          // Agrupar precios por propiedad
          const preciosPorPropiedad: Record<number, PrecioCalendario[]> = {}
          precios.forEach(p => {
            if (!preciosPorPropiedad[p.propiedad_id]) {
              preciosPorPropiedad[p.propiedad_id] = []
            }
            preciosPorPropiedad[p.propiedad_id].push(p)
          })
          setPreciosCalendario(preciosPorPropiedad)

          // Calcular precio total para cada propiedad
          const calculados: Record<number, { total: number; noches: number; promedio: number; disponible: boolean }> = {}

          propiedades.forEach(prop => {
            const preciosProp = preciosPorPropiedad[prop.id] || []
            if (preciosProp.length > 0) {
              const resultado = calcularPrecioReserva(
                new Date(fechasBusqueda!.checkIn),
                new Date(fechasBusqueda!.checkOut),
                preciosProp
              )
              calculados[prop.id] = {
                total: resultado.total,
                noches: resultado.noches,
                promedio: resultado.precioPromedio,
                disponible: resultado.disponible
              }
            }
          })
          setPreciosCalculados(calculados)
        }
      } catch (error) {
        console.error('Error al cargar precios:', error)
      }
      setLoadingPrecios(false)
    }

    fetchPreciosYCalcular()
  }, [fechasBusqueda, propiedades, isDemo])

  // Handlers para el selector de fechas
  const handleBuscarFechas = (checkIn: string, checkOut: string) => {
    setFechasBusqueda({ checkIn, checkOut })
  }

  const handleLimpiarFechas = () => {
    setFechasBusqueda(null)
    setPreciosCalculados({})
    setPreciosCalendario({})
  }

  // Check if property is currently reserved (today)
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

  // Check if property is reserved for specific dates (overlapping)
  const estaReservadaEnFechas = (propiedadId: number, checkIn: string, checkOut: string) => {
    const busquedaInicio = new Date(checkIn)
    const busquedaFin = new Date(checkOut)

    return reservas.some(r => {
      if (r.propiedad_id !== propiedadId) return false
      if (r.estado !== 'confirmada' && r.estado !== 'pendiente') return false

      const reservaInicio = new Date(r.fecha_inicio)
      const reservaFin = new Date(r.fecha_fin)

      // Check for overlap: reservation overlaps if it starts before search ends AND ends after search starts
      return reservaInicio <= busquedaFin && reservaFin >= busquedaInicio
    })
  }

  // Filter properties by availability for selected dates
  const propiedadesDisponibles = fechasBusqueda
    ? propiedadesFiltradas.filter(p => !estaReservadaEnFechas(p.id, fechasBusqueda.checkIn, fechasBusqueda.checkOut))
    : propiedadesFiltradas

  return (
    <div className="min-h-screen">
      {/* Sticky Header - siempre visible en móvil, aparece al scroll en desktop */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 translate-y-0 opacity-100 ${!showStickyHeader && 'md:-translate-y-full md:opacity-0'}`}>
        <div className="bg-white/95 backdrop-blur-sm shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-xl font-semibold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>
              Admin Costa
            </span>
            <div className="flex items-center gap-4">
              {/* Selector de idioma */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-costa-gris hover:text-costa-navy transition-colors"
                title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              >
                <Globe size={16} />
                {language === 'es' ? 'EN' : 'ES'}
              </button>
              <a
                href="#propiedades"
                className="px-4 py-2 bg-costa-navy text-white text-sm font-medium rounded-lg hover:bg-costa-navy/90 transition-colors"
              >
                {t('viewProperties')}
              </a>
              <Link
                href={isDemo ? "/admin?demo=true" : "/admin"}
                className="px-4 py-2 text-sm text-costa-navy hover:text-costa-navy/70 transition-colors"
              >
                {t('accessOwners')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      {isDemo && (
        <div className="bg-amber-100 text-amber-800 text-center py-2 text-sm font-medium">
          🔍 Modo Demo - Datos ficticios de ejemplo
        </div>
      )}

      {/* Hero Section con Slideshow */}
      <section className="relative h-[60vh] md:h-[70vh] min-h-[400px] md:min-h-[500px] flex items-center justify-center overflow-hidden pt-60 md:pt-0">
        {/* Background Slideshow */}
        {heroImages.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${idx === heroImageIndex ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${img})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-costa-navy/60 via-costa-navy/40 to-costa-navy/70" />
          </div>
        ))}

        {/* Indicadores del slideshow */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setHeroImageIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${idx === heroImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'}`}
            />
          ))}
        </div>

        {/* Acceso dueños y selector idioma - arriba derecha */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/80 hover:text-white border border-white/30 hover:border-white/50 rounded-lg transition-colors"
            title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <Globe size={16} />
            {language === 'es' ? 'EN' : 'ES'}
          </button>
          <Link
            href={isDemo ? "/admin?demo=true" : "/admin"}
            className="px-4 py-2 text-sm text-white/80 hover:text-white border border-white/30 hover:border-white/50 rounded-lg transition-colors"
          >
            {t('accessOwners')}
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-semibold text-white mb-4 tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('heroTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-6 font-light">
            {t('heroSubtitle')}
          </p>

          {/* Badges de confianza */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
              <CheckCircle size={16} className="text-costa-olivo" />
              {t('verifiedOwners')}
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
              <Shield size={16} className="text-costa-olivo" />
              {t('secureBooking')}
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
              <Users size={16} className="text-costa-olivo" />
              {t('directContact')}
            </span>
          </div>

          <a
            href="#propiedades"
            className="inline-block px-8 py-3 bg-white text-costa-navy font-medium rounded-lg hover:bg-costa-beige transition-colors"
          >
            {t('viewProperties')}
          </a>

          {/* Contador */}
          <div className="flex justify-center gap-8 mt-10">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">{propiedades.length || '10'}+</p>
              <p className="text-white/70 text-sm">{t('properties')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">200+</p>
              <p className="text-white/70 text-sm">{t('happyFamilies')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white">5</p>
              <p className="text-white/70 text-sm">{t('yearsExperience')}</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronLeft size={24} className="text-white/70 rotate-[-90deg]" />
        </div>
      </section>

      {/* Modelo Section */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('ourModel')}
          </h2>
          <p className="text-costa-gris text-center mb-12 max-w-2xl mx-auto">
            {t('ourModelSubtitle')}
          </p>

          <div className="grid grid-cols-3 gap-2 md:gap-8">
            <div className="text-center p-2 md:p-6">
              <div className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full bg-costa-beige flex items-center justify-center">
                <CheckCircle size={20} className="md:hidden text-costa-olivo" />
                <CheckCircle size={32} className="hidden md:block text-costa-olivo" />
              </div>
              <h3 className="text-xs md:text-lg font-semibold text-costa-navy mb-1 md:mb-2">{t('noIntermediaries')}</h3>
              <p className="text-costa-gris text-[10px] md:text-sm hidden md:block">
                {t('noIntermediariesDesc')}
              </p>
            </div>

            <div className="text-center p-2 md:p-6">
              <div className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full bg-costa-beige flex items-center justify-center">
                <Users size={20} className="md:hidden text-costa-olivo" />
                <Users size={32} className="hidden md:block text-costa-olivo" />
              </div>
              <h3 className="text-xs md:text-lg font-semibold text-costa-navy mb-1 md:mb-2">{t('committedOwners')}</h3>
              <p className="text-costa-gris text-[10px] md:text-sm hidden md:block">
                {t('committedOwnersDesc')}
              </p>
            </div>

            <div className="text-center p-2 md:p-6">
              <div className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full bg-costa-beige flex items-center justify-center">
                <Waves size={20} className="md:hidden text-costa-olivo" />
                <Waves size={32} className="hidden md:block text-costa-olivo" />
              </div>
              <h3 className="text-xs md:text-lg font-semibold text-costa-navy mb-1 md:mb-2">{t('qualityStandards')}</h3>
              <p className="text-costa-gris text-[10px] md:text-sm hidden md:block">
                {t('qualityStandardsDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios Section */}
      <section className="py-8 md:py-16 bg-costa-beige/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('testimonialsTitle')}
          </h2>
          <p className="text-costa-gris text-center mb-12 max-w-2xl mx-auto">
            {t('testimonialsSubtitle')}
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-costa-gris mb-4 italic">
                "{t('testimonial1')}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-costa-navy text-white flex items-center justify-center font-semibold">
                  MG
                </div>
                <div>
                  <p className="font-medium text-costa-navy">María García</p>
                  <p className="text-xs text-costa-gris">Enero 2026 • Golf 2</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-costa-gris mb-4 italic">
                "{t('testimonial2')}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-costa-olivo text-white flex items-center justify-center font-semibold">
                  PL
                </div>
                <div>
                  <p className="font-medium text-costa-navy">Pablo López</p>
                  <p className="text-xs text-costa-gris">Febrero 2026 • Senderos 3</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-costa-gris mb-4 italic">
                "{t('testimonial3')}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-costa-coral text-white flex items-center justify-center font-semibold">
                  CF
                </div>
                <div>
                  <p className="font-medium text-costa-navy">Carolina Fernández</p>
                  <p className="text-xs text-costa-gris">Diciembre 2025 • Marítimo 1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Descubrí Costa Esmeralda Section */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('discoverTitle')}
          </h2>
          <p className="text-costa-gris text-center mb-12 max-w-3xl mx-auto">
            {t('discoverSubtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <button onClick={() => setServicioModal('seguridad')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Shield size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('security24h')}</h3>
                <p className="text-sm text-costa-gris">{t('security24hDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('medicos')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Stethoscope size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('ambulanceDoctors')}</h3>
                <p className="text-sm text-costa-gris">{t('ambulanceDoctorsDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('golf')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Flag size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('golfCourse')}</h3>
                <p className="text-sm text-costa-gris">{t('golfCourseDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('polo')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Trophy size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('poloCourt')}</h3>
                <p className="text-sm text-costa-gris">{t('poloCourtDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('deportivo')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('sportsCenter')}</h3>
                <p className="text-sm text-costa-gris">{t('sportsCenterDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('restaurantes')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('restaurants')}</h3>
                <p className="text-sm text-costa-gris">{t('restaurantsDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('cuatriciclos')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <Car size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('atvs')}</h3>
                <p className="text-sm text-costa-gris">{t('atvsDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('cabalgatas')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <TreePine size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('horseRiding')}</h3>
                <p className="text-sm text-costa-gris">{t('horseRidingDesc')}</p>
              </div>
            </button>

            <button onClick={() => setServicioModal('proveeduria')} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-costa-beige/20 transition-all text-left cursor-pointer sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 rounded-full bg-costa-navy/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={24} className="text-costa-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-costa-navy">{t('grocery')}</h3>
                <p className="text-sm text-costa-gris">{t('groceryDesc')}</p>
              </div>
            </button>
          </div>

          {/* Mapa de ubicación */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-costa-navy text-center mb-6" style={{ fontFamily: 'var(--font-playfair)' }}>
              {t('location')}
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
              {t('locationDesc')} — <span className="text-costa-navy font-medium">{t('nearPinamar')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Galería del Barrio */}
      <section className="py-8 md:py-16 bg-costa-beige/30">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('galleryTitle')}
          </h2>
          <p className="text-costa-gris text-center mb-12 max-w-2xl mx-auto">
            {t('gallerySubtitle')}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Foto grande - Playa */}
            <div className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer h-[400px]">
              <img
                src="https://dpghrdgippisgzvlahwi.supabase.co/storage/v1/object/public/Imagenes/foto%20playa%20costa.JPG"
                alt="Playa Costa Esmeralda"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-semibold">{t('privateBeach')}</h3>
                <p className="text-sm text-white/80">{t('beachAccess')}</p>
              </div>
            </div>

            {/* Golf */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer h-[190px]">
              <img
                src="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=300&fit=crop"
                alt="Campo de Golf"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="font-semibold">{t('golf')}</h3>
                <p className="text-xs text-white/80">{t('golf27holes')}</p>
              </div>
            </div>

            {/* Polo */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer h-[190px]">
              <img
                src="https://costa-esmeralda.com.ar/wp-content/uploads/2024/04/Cancha-de-Polo-02-scaled.jpg"
                alt="Cancha de Polo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="font-semibold">{t('polo')}</h3>
                <p className="text-xs text-white/80">{t('professionalCourts')}</p>
              </div>
            </div>

            {/* Naturaleza */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer h-[190px]">
              <img
                src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=300&fit=crop"
                alt="Bosque y naturaleza"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="font-semibold">{t('nature')}</h3>
                <p className="text-xs text-white/80">{t('forestsTrails')}</p>
              </div>
            </div>

            {/* Club House */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer h-[190px]">
              <img
                src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop"
                alt="Club House y restaurante"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="font-semibold">{t('gastronomy')}</h3>
                <p className="text-xs text-white/80">{t('clubHouse')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="propiedades" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('propertiesTitle')}
          </h2>
          <p className="text-costa-gris text-center mb-8">
            {t('propertiesSubtitle')}
          </p>

          {/* Selector de fechas */}
          <div className="max-w-2xl mx-auto mb-8">
            <SelectorFechasPublico
              onBuscar={handleBuscarFechas}
              onLimpiar={handleLimpiarFechas}
              fechasActivas={fechasBusqueda}
            />
            {loadingPrecios && (
              <p className="text-center text-costa-gris text-sm mt-2">{t('calculatingPrices')}</p>
            )}
          </div>

          {/* Filtro por barrio */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 bg-costa-beige/50 px-4 py-2 rounded-full">
              <span className="text-sm text-costa-navy font-medium">{t('filterByNeighborhood')}</span>
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
                  ({propiedadesFiltradas.length} {propiedadesFiltradas.length === 1 ? t('propertiesAvailable') : t('propertiesAvailablePlural')})
                </span>
              )}
            </div>
          </div>

          {/* Mensaje de disponibilidad */}
          {fechasBusqueda && !loadingPrecios && (
            <div className="text-center mb-6">
              <p className="text-costa-navy font-medium">
                {propiedadesDisponibles.length > 0 ? (
                  <>
                    <span className="text-costa-olivo">{propiedadesDisponibles.length}</span> {propiedadesDisponibles.length === 1 ? t('propertiesAvailable') : t('propertiesAvailablePlural')} {t('fromDate')}{' '}
                    <span className="font-semibold">{new Date(fechasBusqueda.checkIn + 'T12:00:00').toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US', { day: 'numeric', month: 'short' })}</span> {t('toDate')}{' '}
                    <span className="font-semibold">{new Date(fechasBusqueda.checkOut + 'T12:00:00').toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                  </>
                ) : (
                  <span className="text-costa-coral">{t('noPropertiesDates')}</span>
                )}
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center text-costa-gris py-12">{t('loadingProperties')}</div>
          ) : propiedadesDisponibles.length === 0 && fechasBusqueda ? (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-costa-gris mb-4" />
              <p className="text-costa-gris mb-2">{t('noPropertiesDates')}</p>
              <button
                onClick={handleLimpiarFechas}
                className="text-costa-navy underline hover:text-costa-coral transition-colors"
              >
                {t('viewAllProperties')}
              </button>
            </div>
          ) : propiedadesDisponibles.length === 0 ? (
            <div className="text-center text-costa-gris py-12">{t('noPropertiesNeighborhood')}</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {propiedadesDisponibles.map((propiedad) => {
                const reservada = estaReservada(propiedad.id)
                const images = propiedad.imagenes?.length > 0 ? propiedad.imagenes : (propiedad.imagen_url ? [propiedad.imagen_url] : [])
                const currentIndex = imageIndexes[propiedad.id] || 0

                return (
                  <div key={propiedad.id} className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
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
                          {t('noImage')}
                        </div>
                      )}

                      </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>
                          {propiedad.nombre}{propiedad.lote ? ` - Lote ${propiedad.lote}` : ''}
                        </h3>
                        {propiedad.estado === 'alquilada' ? (
                          <span className="px-2 py-0.5 bg-costa-coral text-white text-xs rounded-full flex-shrink-0">
                            {t('rented')}
                          </span>
                        ) : propiedad.estado === 'mantenimiento' ? (
                          <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full flex-shrink-0">
                            {t('maintenance')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-costa-olivo text-white text-xs rounded-full flex-shrink-0">
                            {t('available')}
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
                          <span>{propiedad.capacidad} {t('people')}</span>
                        </div>
                      )}

                      {/* Info */}
                      {(propiedad.habitaciones > 0 || propiedad.banos > 0) && (
                        <p className="text-sm text-costa-gris mb-3">
                          {[
                            propiedad.habitaciones > 0 && `${propiedad.habitaciones} ${propiedad.habitaciones > 1 ? t('bedroomss') : t('bedrooms')}`,
                            propiedad.banos > 0 && `${propiedad.banos} ${propiedad.banos > 1 ? t('bathrooms') : t('bathroom')}`,
                            propiedad.toilette && t('toilette'),
                            propiedad.plantas > 1 && `${propiedad.plantas} ${t('floors')}`,
                            propiedad.cochera && t('garage')
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}

                      {/* Amenities */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {propiedad.pileta && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Waves size={12} />
                            {propiedad.pileta_climatizada ? t('heatedPool') : t('pool')}
                          </span>
                        )}
                        {propiedad.aire_acondicionado && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Snowflake size={12} />
                            {t('ac')}
                          </span>
                        )}
                        {propiedad.parrilla && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Flame size={12} />
                            {t('grill')}
                          </span>
                        )}
                        {propiedad.wifi && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-costa-beige rounded-full text-xs text-costa-gris">
                            <Wifi size={12} />
                            {t('wifi')}
                          </span>
                        )}
                      </div>

                      {/* Precio calculado */}
                      {fechasBusqueda && preciosCalculados[propiedad.id] && (
                        <div className={`mb-4 p-3 rounded-lg ${preciosCalculados[propiedad.id].disponible ? 'bg-costa-olivo/10' : 'bg-red-50'}`}>
                          {preciosCalculados[propiedad.id].disponible ? (
                            <>
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-costa-navy">
                                  {formatPrecio(preciosCalculados[propiedad.id].total)}
                                </span>
                                <span className="text-xs text-costa-gris">{t('total')}</span>
                              </div>
                              <p className="text-xs text-costa-gris">
                                {preciosCalculados[propiedad.id].noches} {preciosCalculados[propiedad.id].noches > 1 ? t('nights') : t('night')} × {formatPrecio(preciosCalculados[propiedad.id].promedio)}/{t('night')}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-red-600 font-medium">{t('notAvailable')}</p>
                          )}
                        </div>
                      )}

                      {/* Buttons - todos en una fila, siempre al final */}
                      <div className="grid grid-cols-3 gap-2 mt-auto">
                        <button
                          onClick={() => {
                            setPropiedadModal(propiedad)
                            setModalImageIndex(0)
                          }}
                          className="flex items-center justify-center gap-1 py-2.5 bg-costa-beige hover:bg-costa-beige/80 text-costa-navy rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                          <Eye size={14} />
                          {t('view')}
                        </button>
                        <a
                          href={`https://wa.me/${formatWhatsApp(propiedad.telefono_contacto)}?text=Hola! Me interesa la propiedad ${propiedad.nombre}${propiedad.lote ? ` - Lote ${propiedad.lote}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 py-2.5 bg-costa-olivo hover:bg-costa-olivo/90 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          {t('inquire')}
                        </a>
                        <button
                          onClick={() => {
                            const baseUrl = window.location.origin
                            const mensaje = language === 'es'
                              ? `¡Mirá esta propiedad en Costa Esmeralda! 🏠\n\n*${propiedad.nombre}${propiedad.lote ? ` - Lote ${propiedad.lote}` : ''}*\n📍 ${propiedad.direccion || propiedad.referencia}\n👥 ${propiedad.capacidad} ${t('people')} | 🛏️ ${propiedad.habitaciones} hab | 🚿 ${propiedad.banos} baños\n\n${baseUrl}/#propiedades`
                              : `Check out this property in Costa Esmeralda! 🏠\n\n*${propiedad.nombre}${propiedad.lote ? ` - Lot ${propiedad.lote}` : ''}*\n📍 ${propiedad.direccion || propiedad.referencia}\n👥 ${propiedad.capacidad} ${t('people')} | 🛏️ ${propiedad.habitaciones} bed | 🚿 ${propiedad.banos} bath\n\n${baseUrl}/#propiedades`
                            window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank')
                          }}
                          className="flex items-center justify-center gap-1 py-2.5 bg-costa-navy hover:bg-costa-navy/90 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
                          title={language === 'es' ? 'Compartir por WhatsApp' : 'Share via WhatsApp'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                            <polyline points="16 6 12 2 8 6"/>
                            <line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                          {t('share')}
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

      {/* FAQ Section */}
      <section className="py-8 md:py-16 bg-costa-beige/30">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-semibold text-costa-navy text-center mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            {t('faqTitle')}
          </h2>
          <p className="text-costa-gris text-center mb-12">
            {t('faqSubtitle')}
          </p>

          <div className="space-y-4">
            <details className="bg-white rounded-xl shadow-sm group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-costa-navy">{t('faq1Question')}</span>
                <ChevronRight size={20} className="text-costa-gris group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-costa-gris">
                <p>{t('faq1Answer')}</p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-costa-navy">{t('faq2Question')}</span>
                <ChevronRight size={20} className="text-costa-gris group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-costa-gris">
                <p>{t('faq2Answer')}</p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-costa-navy">{t('faq3Question')}</span>
                <ChevronRight size={20} className="text-costa-gris group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-costa-gris">
                <p>{t('faq3Answer')}</p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-costa-navy">{t('faq4Question')}</span>
                <ChevronRight size={20} className="text-costa-gris group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-costa-gris">
                <p>{t('faq4Answer')}</p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-costa-navy">{t('faq5Question')}</span>
                <ChevronRight size={20} className="text-costa-gris group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-costa-gris">
                <p>{t('faq5Answer')}</p>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                <span className="font-medium text-costa-navy">{t('faq6Question')}</span>
                <ChevronRight size={20} className="text-costa-gris group-open:rotate-90 transition-transform" />
              </summary>
              <div className="px-5 pb-5 text-costa-gris">
                <p>{t('faq6Answer')}</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-costa-navy text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Admin Costa</h3>
              <p className="text-white/70 text-sm">
                {t('footerDesc')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('contact')}</h4>
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
              <h4 className="font-semibold mb-4">{t('access')}</h4>
              <Link href={isDemo ? "/admin?demo=true" : "/admin"} className="text-white/70 hover:text-white transition-colors text-sm block mb-2">
                {t('accessOwners')}
              </Link>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/50 text-sm">
            © {new Date().getFullYear()} Admin Costa. {t('allRightsReserved')}
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
              <p className="text-sm text-costa-gris mb-4">{t('usefulPhones')}</p>
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

      {/* Modal de Detalle de Propiedad */}
      {propiedadModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPropiedadModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con imagen */}
            <div className="relative h-64 md:h-80 bg-costa-beige group">
              {(() => {
                const images = propiedadModal.imagenes?.length > 0 ? propiedadModal.imagenes : (propiedadModal.imagen_url ? [propiedadModal.imagen_url] : [])
                return images.length > 0 ? (
                  <>
                    <img
                      src={images[modalImageIndex]}
                      alt={propiedadModal.nombre}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setModalImageIndex(modalImageIndex === 0 ? images.length - 1 : modalImageIndex - 1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={() => setModalImageIndex(modalImageIndex === images.length - 1 ? 0 : modalImageIndex + 1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight size={24} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setModalImageIndex(idx)}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === modalImageIndex ? 'bg-white' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                        <div className="absolute bottom-4 right-4 text-white/80 text-sm bg-black/40 px-2 py-1 rounded">
                          {modalImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-costa-gris">
                    Sin imagen
                  </div>
                )
              })()}

              {/* Botón cerrar */}
              <button
                onClick={() => setPropiedadModal(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={24} />
              </button>

              {/* Badge estado */}
              <div className="absolute top-4 left-4">
                {propiedadModal.estado === 'alquilada' ? (
                  <span className="px-3 py-1 bg-costa-coral text-white text-sm rounded-full font-medium">
                    {t('rented')}
                  </span>
                ) : propiedadModal.estado === 'mantenimiento' ? (
                  <span className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-full font-medium">
                    {t('maintenance')}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-costa-olivo text-white text-sm rounded-full font-medium">
                    {t('available')}
                  </span>
                )}
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {/* Título y ubicación */}
              <h2 className="text-2xl font-semibold text-costa-navy mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                {propiedadModal.nombre}{propiedadModal.lote ? ` - Lote ${propiedadModal.lote}` : ''}
              </h2>

              {propiedadModal.direccion && (
                <div className="flex items-start gap-2 text-costa-gris mb-4">
                  <MapPin size={18} className="text-costa-coral mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{propiedadModal.direccion}</p>
                    {propiedadModal.referencia && (
                      <p className="text-sm italic mt-0.5">{propiedadModal.referencia}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Info principal */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-costa-beige mb-4">
                {propiedadModal.capacidad > 0 && (
                  <div className="text-center">
                    <div className="text-2xl mb-1">👤</div>
                    <p className="text-lg font-semibold text-costa-navy">{propiedadModal.capacidad}</p>
                    <p className="text-xs text-costa-gris">{t('people')}</p>
                  </div>
                )}
                {propiedadModal.habitaciones > 0 && (
                  <div className="text-center">
                    <Bed size={24} className="mx-auto mb-1 text-costa-navy" />
                    <p className="text-lg font-semibold text-costa-navy">{propiedadModal.habitaciones}</p>
                    <p className="text-xs text-costa-gris">{propiedadModal.habitaciones > 1 ? t('bedroomss') : t('bedrooms')}</p>
                  </div>
                )}
                {propiedadModal.banos > 0 && (
                  <div className="text-center">
                    <Bath size={24} className="mx-auto mb-1 text-costa-navy" />
                    <p className="text-lg font-semibold text-costa-navy">{propiedadModal.banos}</p>
                    <p className="text-xs text-costa-gris">{propiedadModal.banos > 1 ? t('bathrooms') : t('bathroom')}</p>
                  </div>
                )}
                {propiedadModal.plantas > 1 && (
                  <div className="text-center">
                    <div className="text-2xl mb-1">🏠</div>
                    <p className="text-lg font-semibold text-costa-navy">{propiedadModal.plantas}</p>
                    <p className="text-xs text-costa-gris">{t('floors')}</p>
                  </div>
                )}
              </div>

              {/* Metros */}
              {(propiedadModal.metros_cubiertos > 0 || propiedadModal.metros_lote > 0) && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {propiedadModal.metros_cubiertos > 0 && (
                    <div className="flex items-center gap-2 text-costa-gris">
                      <Ruler size={18} />
                      <span>{propiedadModal.metros_cubiertos} {t('sqmCovered')}</span>
                    </div>
                  )}
                  {propiedadModal.metros_semicubiertos > 0 && (
                    <div className="flex items-center gap-2 text-costa-gris">
                      <Ruler size={18} />
                      <span>{propiedadModal.metros_semicubiertos} {t('sqmSemiCovered')}</span>
                    </div>
                  )}
                  {propiedadModal.metros_lote > 0 && (
                    <div className="flex items-center gap-2 text-costa-gris">
                      <LandPlot size={18} />
                      <span>{propiedadModal.metros_lote} {t('sqmLot')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amenities */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-costa-navy mb-3">{t('amenities')}</h3>
                <div className="flex flex-wrap gap-2">
                  {propiedadModal.pileta && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Waves size={16} />
                      {propiedadModal.pileta_climatizada ? t('heatedPoolFull') : t('pool')}
                    </span>
                  )}
                  {propiedadModal.aire_acondicionado && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Snowflake size={16} />
                      {t('airConditioning')}
                    </span>
                  )}
                  {propiedadModal.calefaccion && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <ThermometerSun size={16} />
                      {t('heating')}
                    </span>
                  )}
                  {propiedadModal.parrilla && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Flame size={16} />
                      {t('grill')}
                    </span>
                  )}
                  {propiedadModal.fogonero && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Flame size={16} />
                      {t('firepit')}
                    </span>
                  )}
                  {propiedadModal.wifi && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Wifi size={16} />
                      {t('wifi')}
                    </span>
                  )}
                  {propiedadModal.grupo_electrogeno && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Zap size={16} />
                      {t('generator')}
                    </span>
                  )}
                  {propiedadModal.lavadero && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <WashingMachine size={16} />
                      {t('laundry')}
                    </span>
                  )}
                  {propiedadModal.lavavajillas && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <UtensilsCrossed size={16} />
                      {t('dishwasher')}
                    </span>
                  )}
                  {propiedadModal.cochera && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Car size={16} />
                      {t('garage')}
                    </span>
                  )}
                  {propiedadModal.toilette && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-costa-beige rounded-full text-sm text-costa-navy">
                      <Bath size={16} />
                      {t('toilette')}
                    </span>
                  )}
                </div>
              </div>

              {/* Descripción */}
              {propiedadModal.descripcion && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-costa-navy mb-2">{t('description')}</h3>
                  <p className="text-costa-gris whitespace-pre-line">{propiedadModal.descripcion}</p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3">
                <a
                  href={`https://wa.me/${formatWhatsApp(propiedadModal.telefono_contacto)}?text=${language === 'es' ? 'Hola! Me interesa la propiedad' : 'Hi! I\'m interested in the property'} ${propiedadModal.nombre}${propiedadModal.lote ? ` - ${language === 'es' ? 'Lote' : 'Lot'} ${propiedadModal.lote}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-costa-olivo hover:bg-costa-olivo/90 text-white rounded-lg font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t('checkAvailability')}
                </a>
                <button
                  onClick={() => {
                    const baseUrl = window.location.origin
                    const mensaje = language === 'es'
                      ? `¡Mirá esta propiedad en Costa Esmeralda! 🏠\n\n*${propiedadModal.nombre}${propiedadModal.lote ? ` - Lote ${propiedadModal.lote}` : ''}*\n📍 ${propiedadModal.direccion || propiedadModal.referencia}\n👥 ${propiedadModal.capacidad} ${t('people')} | 🛏️ ${propiedadModal.habitaciones} hab | 🚿 ${propiedadModal.banos} baños\n\n${baseUrl}/#propiedades`
                      : `Check out this property in Costa Esmeralda! 🏠\n\n*${propiedadModal.nombre}${propiedadModal.lote ? ` - Lot ${propiedadModal.lote}` : ''}*\n📍 ${propiedadModal.direccion || propiedadModal.referencia}\n👥 ${propiedadModal.capacidad} ${t('people')} | 🛏️ ${propiedadModal.habitaciones} bed | 🚿 ${propiedadModal.banos} bath\n\n${baseUrl}/#propiedades`
                    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank')
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-costa-navy hover:bg-costa-navy/90 text-white rounded-lg font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  {t('share')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-gray-500">Loading...</div></div>}>
      <LandingContent />
    </Suspense>
  )
}
