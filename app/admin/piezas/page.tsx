'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Download, FileText, Image as ImageIcon, Loader2, Save } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface Propiedad {
  id: number
  nombre: string
  lote: string
  capacidad: number
  habitaciones: number
  banos: number
  plantas: number
  cochera: boolean
  precio_alquiler: number
  precio_venta: number | null
  imagen_url: string | null
  imagenes: string[] | null
  pileta: boolean
  pileta_climatizada: boolean
  parrilla: boolean
  grupo_electrogeno: boolean
  toilette: boolean
  fogonero: boolean
  aire_acondicionado: boolean
  calefaccion: boolean
  wifi: boolean
  lavadero: boolean
  lavavajillas: boolean
  metros_cubiertos: number
  metros_semicubiertos: number
  metros_lote: number
  camas: number
  descripcion: string | null
  direccion: string | null
}

type Tipo = 'venta' | 'alquiler'
type Formato = 'post' | 'story' | 'ficha'

// Icono elegido para la barra inferior: clave del set + texto editable
interface IconoElegido {
  k: string
  t: string
}

// Ficha A4: cada número de la fila de datos duros (valor + etiqueta)
interface DatoDuro {
  v: string
  l: string
}

// Ficha A4: bloque de texto a dos columnas (título + cuerpo)
interface BloqueTexto {
  t: string
  c: string
}

// Snapshot de los campos editables que se graba por (propiedad, tipo)
interface DatosAviso {
  volanta: string
  titulo: string
  ficha: string
  precio: string
  sufijo: string
  precio2: string
  destacados: string
  contacto: string
  chipIzq: string
  chipDer: string
  formato: Formato
  fotos: string[] // URLs elegidas, en orden (la primera es la portada)
  iconos?: IconoElegido[] // reemplazan a los destacados con viñetas
  encuadres?: number[] // recorte vertical de cada foto: 0 arriba, .5 centro, 1 abajo
  datos?: DatoDuro[] // solo ficha A4
  bloques?: BloqueTexto[] // solo ficha A4
  subtitulo?: string // solo ficha A4: barrio, lote y terreno bajo el título
}

/* ------------------------------------------------------------------ */
/* Paleta de la pieza                                                  */
/* ------------------------------------------------------------------ */

const INK = '#14201C'
const CREAM = '#F6F1E7'
const BRASS = '#B08D4F'
const MUT = '#6B7A72'

/* ------------------------------------------------------------------ */
/* Iconos de la barra inferior                                         */
/* ------------------------------------------------------------------ */

// Cada icono es un path SVG en un lienzo de 24x24 que se dibuja con Path2D
// sobre el canvas: así queda nítido en cualquier tamaño y no suma librerías.
const ICONOS: { k: string; nombre: string; d: string }[] = [
  { k: 'dorm', nombre: 'Dormitorios', d: 'M2 9V6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5V9M2 11v8M22 11v8M2 15h20M6 9V8.2A1.2 1.2 0 0 1 7.2 7h3.1a1.2 1.2 0 0 1 1.2 1.2V9M12.5 9V8.2A1.2 1.2 0 0 1 13.7 7h3.1A1.2 1.2 0 0 1 18 8.2V9' },
  { k: 'bano', nombre: 'Baños', d: 'M3 12.5h18V15a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6.5 12.5V5.4A2.4 2.4 0 0 1 8.9 3h.7a2.4 2.4 0 0 1 2.4 2.4M9.6 5.4h2.4M7 20.2 5.8 22.4M17 20.2l1.2 2.2' },
  { k: 'huesp', nombre: 'Huéspedes', d: 'M9 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2M2.4 20.4a6.6 6.6 0 0 1 13.2 0M16.4 6.4a3.2 3.2 0 0 1 0 5.6M18.4 20.4a5.8 5.8 0 0 0-3.2-5.2' },
  { k: 'pileta', nombre: 'Pileta', d: 'M2 16.4c1.6 0 2.2-1.1 3.7-1.1s2.1 1.1 3.7 1.1 2.2-1.1 3.7-1.1 2.1 1.1 3.7 1.1 2.2-1.1 3.2-1.1M2 20.4c1.6 0 2.2-1.1 3.7-1.1s2.1 1.1 3.7 1.1 2.2-1.1 3.7-1.1 2.1 1.1 3.7 1.1 2.2-1.1 3.2-1.1M7 15V5.2a2.2 2.2 0 0 1 4.4 0M15.4 15V5.2a2.2 2.2 0 0 1 4.4 0M7 9.4h8.4' },
  // Parrilla como grill (tapa + patas) para que no se confunda con el fogón
  { k: 'parrilla', nombre: 'Parrilla', d: 'M3.4 12.4h17.2M5 12.4a7 7 0 0 1 14 0M6.4 12.4 8 18.4h8l1.6-6M8.6 18.4 7 22M15.4 18.4 17 22M9.4 8.6c0-1.2 1.2-1.4 1.2-2.6M13.4 8.6c0-1.2 1.2-1.4 1.2-2.6' },
  { k: 'fogon', nombre: 'Fogonero', d: 'M12 2.6c0 2.6 0 5-1.2 5-.7 0-1.3-.7-1.5-1.6-.6.8-1 1.7-1 2.8a3.7 3.7 0 0 0 7.4 0c0-3.2-3.7-6.2-3.7-6.2M3.6 20.2l16.8-3.8M3.6 16.4l16.8 3.8' },
  // Cochera: auto bajo el techo del garage, como en las fichas de los portales
  { k: 'cochera', nombre: 'Cochera', d: 'M2.6 9.4 12 4.2l9.4 5.2M6 15.4h12M6.8 15.4l1.2-3.4a1.5 1.5 0 0 1 1.4-1h5.2a1.5 1.5 0 0 1 1.4 1l1.2 3.4v3h-1.8v-1.4H8.6v1.4H6.8zM8.8 15.6h.1M15.2 15.6h.1' },
  { k: 'jardin', nombre: 'Jardín', d: 'M8 21v-5.6M8 15.4 4.2 10.6h2.4L4.4 5.6h7.2L9.4 10.6h2.4zM17 21v-7.4M17 13.6a4.3 4.3 0 1 0 0-8.6 4.3 4.3 0 0 0 0 8.6' },
  { k: 'golf', nombre: 'Vista al golf', d: 'M11.4 19.6V3l7.4 3.8-7.4 3.8M8 21.6h8.6M9.4 18.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2' },
  { k: 'aire', nombre: 'Aire acondicionado', d: 'M3 6.4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6.2H3zM5 9.2h14M6.6 12.6v2.2M12 12.6v4.4M17.4 12.6v2.2' },
  { k: 'wifi', nombre: 'Wi-Fi', d: 'M5 12.6a10 10 0 0 1 14 0M8.6 16.2a5 5 0 0 1 6.8 0M2 9.2a15 15 0 0 1 20 0M12 20.4h.1' },
  { k: 'playa', nombre: 'Playa', d: 'M12 3.4c4.7 0 8.6 3.5 8.6 7.8H3.4c0-4.3 3.9-7.8 8.6-7.8M12 11.2v9.4M12 20.6a2.4 2.4 0 0 1-2.4-2.4' },
  // Superficie cubierta: el cuadrado con la diagonal, como en los portales
  { k: 'metros', nombre: 'Superficie cubierta', d: 'M4 4h16v16H4zM15.4 8.6 8.6 15.4M15.4 8.6h-4M15.4 8.6v4M8.6 15.4h4M8.6 15.4v-4' },
  // Ambientes: la puerta, igual que en las fichas de Zonaprop y Argenprop
  { k: 'ambientes', nombre: 'Ambientes', d: 'M7.4 2.8h9.2v18.4H7.4zM7.4 21.2h9.2M14 12.4v1.4' },
  // Superficie total del lote: la regla con la flecha de medición
  { k: 'terreno', nombre: 'Superficie del lote', d: 'M6.6 3.4h4.8v17.2H6.6zM6.6 7h2.4M6.6 10.4h2.4M6.6 13.8h2.4M6.6 17.2h2.4M16.4 4.6v14.8M14.4 6.6l2-2 2 2M14.4 17.4l2 2 2-2' },
  { k: 'antiguedad', nombre: 'Antigüedad', d: 'M4.4 5.6h15.2v14.8H4.4zM4.4 10h15.2M8.6 3.4v4M15.4 3.4v4' },
  { k: 'orientacion', nombre: 'Orientación', d: 'M12 21.4a9.4 9.4 0 1 0 0-18.8 9.4 9.4 0 0 0 0 18.8M15.2 8.8l-2 4.4-4.4 2 2-4.4z' },
  { k: 'luminoso', nombre: 'Luminosidad', d: 'M12 16.6a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2M12 1.8v2.6M12 19.6v2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M1.8 12h2.6M19.6 12h2.6M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8' },
  { k: 'calef', nombre: 'Calefacción', d: 'M8 21V8.6M12 21V8.6M16 21V8.6M4.6 8.6h14.8a1.6 1.6 0 0 0 0-3.2H4.6a1.6 1.6 0 0 0 0 3.2' },
  { k: 'grupo', nombre: 'Grupo electrógeno', d: 'M13.4 2.6 4.6 13.4h6.2L10.2 21.4 19 10.6h-6.2z' },
]

const ICONO_POR_K = Object.fromEntries(ICONOS.map((i) => [i.k, i]))
const MAX_ICONOS = 7

// Fotos que se pueden elegir: la ficha A4 usa portada + 6 en grilla; el post y
// el story se quedan con las primeras 4 (con más quedan estampillas ilegibles)
const MAX_FOTOS = 7
const fotosDelFormato = (f: Formato) => (f === 'ficha' ? MAX_FOTOS : 4)

// Logo de Costa Esmeralda: va en la esquina derecha de la barra de contacto.
// Es opcional — si el archivo no está, la barra se dibuja sin él.
const LOGO_CE = '/logo-costa-esmeralda.png'

// Burbuja de WhatsApp para la barra de contacto: círculo verde con la cola
// abajo a la izquierda y el tubo del teléfono calado en el color de la barra.
const WA_VERDE = '#25D366'
const WA_BURBUJA =
  'M12 1.6a10.4 10.4 0 0 0-8.9 15.8L1.6 22.4l5.2-1.4A10.4 10.4 0 1 0 12 1.6'
const WA_TUBO =
  'M17.2 14.6c-.3-.15-1.7-.83-1.96-.93-.26-.1-.45-.14-.64.15-.19.28-.73.92-.9 1.11-.16.19-.33.21-.62.07a7.9 7.9 0 0 1-2.3-1.42 8.6 8.6 0 0 1-1.6-1.98c-.16-.29-.02-.44.13-.59.13-.13.29-.34.43-.51.15-.18.19-.3.29-.49.1-.2.05-.37-.02-.51-.07-.15-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.28-1 .97-1 2.37s1.02 2.75 1.17 2.94c.14.19 2.01 3.07 4.87 4.3.68.3 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const money = (n: number) =>
  'US$ ' + Math.round(n || 0).toLocaleString('es-AR')

// La temporada de verano se nombra por el año en que cae enero:
// de marzo en adelante ya se promociona la del año siguiente.
function temporadaActual() {
  const hoy = new Date()
  return hoy.getMonth() >= 2 ? hoy.getFullYear() + 1 : hoy.getFullYear()
}

// Etiquetas por defecto de los chips sobre la foto (editables)
const chipIzqDe = (t: Tipo) =>
  t === 'venta' ? 'EN VENTA' : `TEMPORADA ${temporadaActual()}`
const CHIP_DER_DEFAULT = 'DUEÑO DIRECTO'

function fichaDe(p: Propiedad, tipo: Tipo) {
  if (tipo === 'alquiler') {
    const partes = [
      `${p.habitaciones} dorm`,
      `${p.banos} baños`,
      p.capacidad ? `Hasta ${p.capacidad} personas` : '',
    ]
    return partes.filter(Boolean).join(' · ')
  }
  const partes = [
    p.metros_cubiertos ? `${p.metros_cubiertos} m² cubiertos` : '',
    p.metros_lote ? `Lote ${p.metros_lote.toLocaleString('es-AR')} m²` : '',
    `${p.habitaciones} dorm`,
    `${p.banos} baños`,
  ]
  return partes.filter(Boolean).join(' · ')
}

function destacadosDe(p: Propiedad, tipo: Tipo) {
  const d: string[] = []
  if (p.pileta_climatizada) d.push('Pileta climatizada, uso todo el año')
  else if (p.pileta) d.push('Pileta')
  if (p.parrilla) d.push('Galería con parrilla')
  if (p.fogonero) d.push('Fogonero en el parque')
  if (p.grupo_electrogeno) d.push('Grupo electrógeno')
  if (tipo === 'alquiler') {
    if (p.aire_acondicionado) d.push('Aire acondicionado')
    d.push('Equipada: ropa blanca, toallas y sillas de playa')
  } else {
    if (p.calefaccion) d.push('Calefacción')
    d.push('Se entrega amoblada y equipada')
  }
  // Al ir a dos columnas entran más ítems sin comerse el resto de la pieza
  return d.slice(0, 10).join(' · ')
}

// Iconos sugeridos según la ficha. Se puede editar todo después, pero el orden
// arranca por lo que más se mira en un aviso: capacidad primero, extras después.
function iconosDe(p: Propiedad, tipo: Tipo): IconoElegido[] {
  const d: IconoElegido[] = []

  if (tipo === 'venta') {
    // En venta lo que se compara son las superficies y los ambientes,
    // no la capacidad de huéspedes
    if (p.metros_cubiertos) d.push({ k: 'metros', t: `${num(p.metros_cubiertos)} m² cubiertos` })
    if (p.metros_lote) d.push({ k: 'terreno', t: `${num(p.metros_lote)} m² de terreno` })
    // Convención local: los ambientes son los dormitorios más el living comedor
    if (p.habitaciones) d.push({ k: 'ambientes', t: `${p.habitaciones + 1} ambientes` })
    if (p.habitaciones) d.push({ k: 'dorm', t: `${p.habitaciones} dormitorios` })
    if (p.banos) d.push({ k: 'bano', t: `${p.banos} baños${p.toilette ? ' + toilette' : ''}` })
    if (p.cochera) d.push({ k: 'cochera', t: 'Cochera' })
    if (p.pileta || p.pileta_climatizada) {
      d.push({ k: 'pileta', t: p.pileta_climatizada ? 'Pileta climatizada' : 'Pileta' })
    }
    if (p.parrilla) d.push({ k: 'parrilla', t: 'Parrilla' })
    return d.slice(0, MAX_ICONOS)
  }

  if (p.habitaciones) d.push({ k: 'dorm', t: `${p.habitaciones} dormitorios` })
  if (p.banos) d.push({ k: 'bano', t: `${p.banos} baños${p.toilette ? ' + toilette' : ''}` })
  if (p.capacidad) d.push({ k: 'huesp', t: `Hasta ${p.capacidad} huéspedes` })
  if (p.pileta || p.pileta_climatizada) {
    d.push({ k: 'pileta', t: p.pileta_climatizada ? 'Pileta climatizada' : 'Pileta' })
  }
  if (p.cochera) d.push({ k: 'cochera', t: 'Cochera' })
  if (p.parrilla) d.push({ k: 'parrilla', t: 'Parrilla' })
  if (p.fogonero) d.push({ k: 'fogon', t: 'Fogonero' })
  if (p.aire_acondicionado) d.push({ k: 'aire', t: 'Aire acondicionado' })
  if (p.wifi) d.push({ k: 'wifi', t: 'Wi-Fi' })
  if (p.grupo_electrogeno) d.push({ k: 'grupo', t: 'Grupo electrógeno' })
  return d.slice(0, MAX_ICONOS)
}

/* ---------- presets de la ficha A4 ---------- */

const num = (n: number) => (n || 0).toLocaleString('es-AR')

// Catálogo de datos duros: cada uno sabe cómo se llama y de dónde sale su
// valor, así al sumar uno nuevo aparece completo en vez de en blanco.
const CAMPOS_DATO: { l: string; valor: (p: Propiedad) => string }[] = [
  { l: 'm² cubiertos', valor: (p) => (p.metros_cubiertos ? num(p.metros_cubiertos) : '') },
  { l: 'm² semicubiertos', valor: (p) => (p.metros_semicubiertos ? num(p.metros_semicubiertos) : '') },
  { l: 'm² de lote', valor: (p) => (p.metros_lote ? num(p.metros_lote) : '') },
  { l: 'ambientes', valor: (p) => (p.habitaciones ? String(p.habitaciones + 1) : '') },
  { l: 'dormitorios', valor: (p) => (p.habitaciones ? String(p.habitaciones) : '') },
  { l: 'baños', valor: (p) => (p.banos ? String(p.banos) + (p.toilette ? ' + 1' : '') : '') },
  { l: 'plantas', valor: (p) => (p.plantas ? String(p.plantas) : '') },
  { l: 'camas', valor: (p) => (p.camas ? String(p.camas) : '') },
  { l: 'huéspedes', valor: (p) => (p.capacidad ? String(p.capacidad) : '') },
  { l: 'cocheras', valor: (p) => (p.cochera ? '1' : '') },
  { l: 'años', valor: () => '' },
]

// La fila de números: es lo primero que mira un comprador
function datosDe(p: Propiedad): DatoDuro[] {
  const d: DatoDuro[] = []
  const tomar = (l: string) => {
    const c = CAMPOS_DATO.find((x) => x.l === l)
    const v = c?.valor(p) || ''
    if (v) d.push({ v, l: l === 'baños' && p.toilette ? 'baños y toilette' : l })
  }
  ;['m² cubiertos', 'm² semicubiertos', 'm² de lote', 'dormitorios', 'baños', 'plantas'].forEach(tomar)
  if (d.length < 6) tomar('camas')
  return d.slice(0, 6)
}

function subtituloDe(p: Propiedad) {
  const barrio = p.nombre?.split('-')[0]?.trim() || p.nombre
  return [
    p.direccion?.trim() || `Barrio ${barrio}`,
    p.lote ? `Lote ${p.lote}` : '',
    p.metros_lote ? `${num(p.metros_lote)} m² de terreno` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

// La descripción suele venir con secciones en mayúscula (FICHA TÉCNICA,
// DISTRIBUCIÓN, EXTERIOR). Se parte por esos títulos y se saltea la ficha
// técnica, porque esos números ya salen en la fila de datos duros.
function bloquesDe(p: Propiedad): BloqueTexto[] {
  const texto = (p.descripcion || '').trim()
  if (!texto) return [{ t: 'LA PROPIEDAD', c: '' }, { t: 'EXTERIOR', c: '' }]

  const lineas = texto.split('\n')
  const secciones: BloqueTexto[] = []
  let actual: BloqueTexto | null = null
  for (const raw of lineas) {
    const l = raw.trim()
    if (!l) continue
    // Título de sección: corto, sin punto final y en mayúsculas
    const esTitulo = l.length < 40 && l === l.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(l)
    if (esTitulo) {
      actual = { t: l, c: '' }
      secciones.push(actual)
    } else if (actual) {
      actual.c += (actual.c ? ' ' : '') + l.replace(/^[-·•]\s*/, '')
    }
  }

  const utiles = secciones.filter((s) => s.c && !/FICHA\s*T[EÉ]CNICA/i.test(s.t))
  if (utiles.length >= 2) return utiles.slice(0, 2)
  if (utiles.length === 1) return [utiles[0], { t: 'EXTERIOR', c: '' }]

  // Sin secciones reconocibles: se parte el texto al medio por párrafos
  const parrafos = texto.split(/\n\s*\n/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const corte = Math.ceil(parrafos.length / 2)
  return [
    { t: 'LA PROPIEDAD', c: parrafos.slice(0, corte).join(' ') },
    { t: 'EXTERIOR', c: parrafos.slice(corte).join(' ') },
  ]
}

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function PiezasPage() {
  const searchParams = useSearchParams()
  const propIdParam = searchParams.get('propiedad')

  const { userId, loading: authLoading } = useAuth()

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [cargando, setCargando] = useState(true)
  const [selId, setSelId] = useState<number | null>(null)

  // Avisos grabados: clave `${propId}:${tipo}` -> campos
  const [avisosGuardados, setAvisosGuardados] = useState<Record<string, DatosAviso>>({})
  const [guardando, setGuardando] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [guardadoMsg, setGuardadoMsg] = useState('')

  const [tipo, setTipo] = useState<Tipo>('alquiler')
  const [formato, setFormato] = useState<Formato>('post')

  const [imgs, setImgs] = useState<HTMLImageElement[]>([])
  const [srcs, setSrcs] = useState<string[]>([])
  const [cargandoFotos, setCargandoFotos] = useState(false)
  const [fotosBloqueadas, setFotosBloqueadas] = useState(false)
  // Recorte vertical de cada foto (0 arriba · .5 centro · 1 abajo)
  const [encuadres, setEncuadres] = useState<number[]>([])
  // Logo de Costa Esmeralda para la barra de contacto (opcional: si el archivo
  // no está en /public la pieza se dibuja igual, sin logo)
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)

  // Campos editables
  const [volanta, setVolanta] = useState('')
  const [titulo, setTitulo] = useState('')
  const [ficha, setFicha] = useState('')
  const [precio, setPrecio] = useState('')
  const [sufijo, setSufijo] = useState('')
  const [precio2, setPrecio2] = useState('')
  const [destacados, setDestacados] = useState('')
  const [iconos, setIconos] = useState<IconoElegido[]>([])
  const [contacto, setContacto] = useState('')
  // Campos exclusivos de la ficha A4
  const [subtitulo, setSubtitulo] = useState('')
  const [datos, setDatos] = useState<DatoDuro[]>([])
  const [bloques, setBloques] = useState<BloqueTexto[]>([])
  const [chipIzq, setChipIzq] = useState('')
  const [chipDer, setChipDer] = useState(CHIP_DER_DEFAULT)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sel = propiedades.find((p) => p.id === selId) || null

  useEffect(() => {
    void cargarImagen(LOGO_CE).then(setLogo)
  }, [])

  /* ---------- presets y fotos (se llaman desde los handlers) ---------- */
  const aplicarTextos = useCallback((p: Propiedad, t: Tipo) => {
    const barrio = p.nombre?.split('-')[0]?.trim() || p.nombre
    setVolanta(`COSTA ESMERALDA \u00b7 ${barrio.toUpperCase()} \u00b7 PINAMAR`)
    setTitulo(p.nombre?.replace(/\s*-\s*Lote.*$/i, '').trim() || p.nombre)
    setFicha(fichaDe(p, t))
    setDestacados(destacadosDe(p, t))
    setIconos(iconosDe(p, t))
    setChipIzq(chipIzqDe(t))
    setChipDer(CHIP_DER_DEFAULT)
    setSubtitulo(subtituloDe(p))
    setDatos(datosDe(p))
    setBloques(bloquesDe(p))
    if (t === 'alquiler') {
      setPrecio(p.precio_alquiler ? money(p.precio_alquiler) : 'US$ ')
      setSufijo('/ noche')
      setPrecio2('Consult\u00e1 enero completo, febrero y fines de semana largos')
    } else {
      setPrecio(p.precio_venta ? money(p.precio_venta) : 'US$ ')
      setSufijo('')
      setPrecio2('Permuta y financiaci\u00f3n directa del propietario')
    }
  }, [])

  // Restaura en los inputs un aviso previamente grabado
  const aplicarGuardado = useCallback((d: DatosAviso, t: Tipo, p?: Propiedad) => {
    setVolanta(d.volanta ?? '')
    setTitulo(d.titulo ?? '')
    setFicha(d.ficha ?? '')
    setPrecio(d.precio ?? '')
    setSufijo(d.sufijo ?? '')
    setPrecio2(d.precio2 ?? '')
    setDestacados(d.destacados ?? '')
    // Los avisos grabados antes de la barra de iconos no la traen: se sugiere
    // desde la ficha para que la pieza no salga sin la fila de amenities.
    setIconos(d.iconos?.length ? d.iconos.slice(0, MAX_ICONOS) : p ? iconosDe(p, t) : [])
    setContacto(d.contacto ?? '')
    // Ídem para los campos de la ficha A4, que no existían en avisos viejos
    setSubtitulo(d.subtitulo ?? (p ? subtituloDe(p) : ''))
    setDatos(d.datos?.length ? d.datos : p ? datosDe(p) : [])
    setBloques(d.bloques?.length ? d.bloques : p ? bloquesDe(p) : [])
    // Los avisos grabados antes de que los chips fueran editables no traen
    // estos campos: en ese caso se usan las etiquetas por defecto.
    setChipIzq(d.chipIzq ?? chipIzqDe(t))
    setChipDer(d.chipDer ?? CHIP_DER_DEFAULT)
    if (d.formato) setFormato(d.formato)
  }, [])

  // Carga en el canvas una lista explícita de URLs (usada para restaurar lo grabado)
  const cargarFotosDesde = useCallback(async (urls: string[], enc?: number[]) => {
    const lista = (urls || []).slice(0, MAX_FOTOS)
    setSrcs(lista)
    setImgs([])
    setFotosBloqueadas(false)
    setEncuadres(lista.map((_, i) => enc?.[i] ?? 0.5))
    if (!lista.length) return

    setCargandoFotos(true)
    const res = await Promise.all(lista.map(cargarImagen))
    const ok = res.filter(Boolean) as HTMLImageElement[]
    setImgs(ok)
    setFotosBloqueadas(ok.length < lista.length)
    setCargandoFotos(false)
  }, [])

  // Fotos por defecto: las de la ficha de la propiedad
  const cargarFotos = useCallback(
    (p: Propiedad) => {
      const urls = [
        ...(p.imagen_url ? [p.imagen_url] : []),
        ...((p.imagenes || []).filter((u) => u && u !== p.imagen_url)),
      ].slice(0, MAX_FOTOS)
      return cargarFotosDesde(urls)
    },
    [cargarFotosDesde],
  )

  const elegirPropiedad = (p: Propiedad) => {
    setSelId(p.id)
    setGuardadoMsg('')
    const g = avisosGuardados[`${p.id}:${tipo}`]
    if (g) {
      aplicarGuardado(g, tipo, p)
      if (g.fotos?.length) void cargarFotosDesde(g.fotos, g.encuadres)
      else void cargarFotos(p)
    } else {
      aplicarTextos(p, tipo)
      void cargarFotos(p)
    }
  }

  const elegirTipo = (t: Tipo) => {
    setTipo(t)
    setGuardadoMsg('')
    if (sel) {
      const g = avisosGuardados[`${sel.id}:${t}`]
      if (g) {
        aplicarGuardado(g, t, sel)
        // Si el tipo tiene fotos grabadas se restauran; si no, se dejan las actuales
        if (g.fotos?.length) void cargarFotosDesde(g.fotos, g.encuadres)
      } else {
        aplicarTextos(sel, t)
      }
    }
  }

  // Graba el aviso actual (propiedad + tipo) en Supabase
  const grabar = async () => {
    if (!sel || !userId) return
    setGuardando(true)
    setGuardadoMsg('')
    const aviso: DatosAviso = {
      volanta,
      titulo,
      ficha,
      precio,
      sufijo,
      precio2,
      destacados,
      contacto,
      chipIzq,
      chipDer,
      formato,
      fotos: srcs,
      iconos,
      encuadres,
      datos,
      bloques,
      subtitulo,
    }
    const { error } = await supabase.from('piezas_avisos').upsert(
      {
        user_id: userId,
        propiedad_id: sel.id,
        tipo,
        datos: aviso,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,propiedad_id,tipo' },
    )
    setGuardando(false)
    if (error) {
      setGuardadoMsg('No se pudo guardar: ' + error.message)
      return
    }
    setAvisosGuardados((prev) => ({ ...prev, [`${sel.id}:${tipo}`]: aviso }))
    setGuardadoMsg(`Cambios de ${tipo} guardados ✓`)
  }

  // Vuelve a generar los textos desde la ficha, descartando lo editado
  const restaurarDesdeFicha = () => {
    if (!sel) return
    setGuardadoMsg('')
    aplicarTextos(sel, tipo)
  }

  /* ---------- cargar propiedades ---------- */
  useEffect(() => {
    // Esperar a que resuelva la sesión antes de consultar
    if (authLoading) return
    ;(async () => {
      if (!userId) {
        setPropiedades([])
        setSelId(null)
        setCargando(false)
        return
      }
      const [propsRes, avisosRes] = await Promise.all([
        supabase
          .from('propiedades')
          .select('*')
          .eq('user_id', userId)
          .is('eliminado_at', null)
          .order('nombre'),
        // Si la tabla aún no existe (migración sin correr) el error se ignora
        supabase
          .from('piezas_avisos')
          .select('propiedad_id, tipo, datos')
          .eq('user_id', userId),
      ])
      const lista = (propsRes.data as Propiedad[]) || []
      setPropiedades(lista)

      const mapa: Record<string, DatosAviso> = {}
      for (const a of avisosRes.data || []) {
        mapa[`${a.propiedad_id}:${a.tipo}`] = a.datos as DatosAviso
      }
      setAvisosGuardados(mapa)

      const inicial =
        (propIdParam && lista.find((p) => String(p.id) === propIdParam)?.id) ||
        lista[0]?.id ||
        null
      setSelId(inicial)
      const p0 = lista.find((x) => x.id === inicial)
      if (p0) {
        const g = mapa[`${p0.id}:alquiler`]
        if (g) {
          aplicarGuardado(g, 'alquiler', p0)
          if (g.fotos?.length) void cargarFotosDesde(g.fotos, g.encuadres)
          else void cargarFotos(p0)
        } else {
          aplicarTextos(p0, 'alquiler')
          void cargarFotos(p0)
        }
      }
      setCargando(false)
    })()
  }, [authLoading, userId, propIdParam, aplicarTextos, aplicarGuardado, cargarFotos, cargarFotosDesde])

  /* ---------- dibujar ---------- */
  const dibujar = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const W = 1080
    // La ficha usa proporción A4 (1:1,414) para que imprima y exporte a PDF
    const H = formato === 'post' ? 1350 : formato === 'story' ? 1920 : 1527
    cv.width = W
    cv.height = H
    const S = 1
    const P = W * 0.078
    const barH = formato === 'post' ? 104 : formato === 'story' ? 118 : 104
    // Alto de la barra de amenities (0 si no hay iconos elegidos)
    const iconH = iconos.length ? (formato === 'post' ? 134 : formato === 'story' ? 152 : 118) : 0

    const ls = (px: number) => {
      try {
        ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = px + 'px'
      } catch {}
    }
    // pos: recorte vertical cuando la foto sobra de alto (0 arriba, .5 centro, 1 abajo)
    const cover = (im: HTMLImageElement, x: number, y: number, w: number, h: number, pos = 0.5) => {
      const r = Math.max(w / im.width, h / im.height)
      const nw = im.width * r
      const nh = im.height * r
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()
      ctx.drawImage(im, x + (w - nw) / 2, y + (h - nh) * pos, nw, nh)
      ctx.restore()
    }
    const wrap = (t: string, x: number, y: number, maxW: number, lh: number, paint: boolean, maxLineas = 0) => {
      const ws = t.split(' ')
      const lineas: string[] = []
      let line = ''
      for (const w of ws) {
        const s = line ? line + ' ' + w : w
        if (ctx.measureText(s).width > maxW && line) {
          lineas.push(line)
          line = w
        } else line = s
      }
      if (line) lineas.push(line)

      // Con tope de líneas la última se recorta con puntos suspensivos
      let salida = lineas
      if (maxLineas && lineas.length > maxLineas) {
        salida = lineas.slice(0, maxLineas)
        let ult = salida[maxLineas - 1]
        while (ult && ctx.measureText(ult + '…').width > maxW) ult = ult.slice(0, -1).trimEnd()
        salida[maxLineas - 1] = ult + '…'
      }

      let yy = y
      for (const l of salida) {
        if (paint) ctx.fillText(l, x, yy)
        yy += lh
      }
      return yy
    }
    const chip = (t: string, x: number, y: number, h: number, bg: string | null, fg: string, bd: string | null) => {
      ctx.font = '600 ' + h * 0.4 + 'px Inter, sans-serif'
      ls(h * 0.075)
      const pad = h * 0.52
      const w = ctx.measureText(t).width + pad * 2
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2)
      else ctx.rect(x, y, w, h)
      if (bg) { ctx.fillStyle = bg; ctx.fill() }
      if (bd) { ctx.strokeStyle = bd; ctx.lineWidth = h * 0.045; ctx.stroke() }
      ctx.fillStyle = fg
      ctx.textBaseline = 'middle'
      ctx.fillText(t, x + pad, y + h * 0.54)
      ls(0)
      ctx.textBaseline = 'alphabetic'
      return w
    }

    /* bloque de texto: título a la izquierda, precio a la derecha.
       En dos columnas entra en la mitad de alto que apilado, que es lo que
       deja libre el 70% para las fotos. */
    const block = (topY: number, k: number, paint: boolean) => {
      const maxW = W - P * 2
      const q = S * k
      const hayPrecio = !!precio.trim()
      const gapCol = 40 * q
      // El story es más angosto de columna: se le da menos lugar al precio para
      // que al título no le queden cuatro renglones
      const colPrecio = hayPrecio ? maxW * (formato === 'post' ? 0.38 : 0.34) : 0
      const colTexto = hayPrecio ? maxW - colPrecio - gapCol : maxW

      /* columna izquierda */
      let yl = topY
      if (volanta.trim()) {
        ctx.fillStyle = MUT
        ctx.font = '600 ' + 21 * q + 'px Inter, sans-serif'
        ls(4 * q)
        // Acotada a su columna: si se dibujara a todo el ancho se metería
        // por debajo del precio
        yl = wrap(volanta.replace(/[·\s]+$/, ''), P, yl, colTexto, 27 * q, paint, 2)
        ls(0)
        yl += 34 * q
      }

      ctx.fillStyle = INK
      ctx.font = '600 ' + 44 * q + 'px "Playfair Display", Georgia, serif'
      yl = wrap(titulo, P, yl, colTexto, 50 * q, paint)

      // La ficha repite lo que ya dicen los iconos: solo se dibuja si no hay
      if (!iconos.length && ficha.trim()) {
        yl += 16 * q
        ctx.fillStyle = MUT
        ctx.font = '400 ' + 26 * q + 'px Inter, sans-serif'
        yl = wrap(ficha, P, yl, colTexto, 37 * q, paint)
      }

      /* columna derecha */
      let yr = topY
      if (hayPrecio) {
        ctx.textAlign = 'right'
        yr += 14 * q
        // El símbolo de moneda va más chico que la cifra: si va al mismo cuerpo
        // se come la mitad del ancho de la columna
        const m = precio.trim().match(/^(US\$|USD|AR\$|\$)\s*(.+)$/)
        const moneda = m ? m[1] : ''
        const cifra = m ? m[2] : precio

        ctx.font = '700 ' + 53 * q + 'px Inter, sans-serif'
        ls(-1.6 * q)
        if (paint) { ctx.fillStyle = INK; ctx.fillText(cifra, W - P, yr) }
        const anchoCifra = ctx.measureText(cifra).width
        ls(0)
        if (moneda) {
          ctx.font = '700 ' + 30 * q + 'px Inter, sans-serif'
          if (paint) ctx.fillText(moneda, W - P - anchoCifra - 10 * q, yr)
        }
        yr += 32 * q

        if (sufijo.trim() && tipo !== 'venta') {
          ctx.font = '400 ' + 26 * q + 'px Inter, sans-serif'
          if (paint) { ctx.fillStyle = MUT; ctx.fillText(sufijo, W - P, yr) }
          yr += 34 * q
        }

        if (precio2.trim()) {
          ctx.font = '500 ' + 21 * q + 'px Inter, sans-serif'
          if (paint) ctx.fillStyle = BRASS
          yr = wrap(precio2, W - P, yr, colPrecio, 29 * q, paint)
        }
        ctx.textAlign = 'left'
      }

      return Math.max(yl, yr)
    }

    /* barra de amenities: reemplaza a los destacados con viñetas */
    const barraAmenities = () => {
      if (!iconH) return
      const barY = H - barH - iconH
      ctx.strokeStyle = '#E3DACA'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, barY)
      ctx.lineTo(W, barY)
      ctx.stroke()

      const n = iconos.length
      const zona = W - P * 1.2
      const colW = zona / n
      const size = formato === 'story' ? 54 : formato === 'post' ? 48 : 44
      const fs = formato === 'story' ? 22 : formato === 'post' ? 19.5 : 17.5
      const iy = barY + (formato === 'story' ? 23 : formato === 'post' ? 18 : 16)

      ctx.textAlign = 'center'
      for (let i = 0; i < n; i++) {
        const def = ICONO_POR_K[iconos[i].k]
        const cx = P * 0.6 + colW * (i + 0.5)

        if (def) {
          ctx.save()
          ctx.translate(cx - size / 2, iy)
          ctx.scale(size / 24, size / 24)
          ctx.strokeStyle = BRASS
          ctx.lineWidth = (2.3 * 24) / size
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke(new Path2D(def.d))
          ctx.restore()
        }

        // El texto va a dos líneas como máximo para que no se pisen las columnas
        ctx.fillStyle = '#3A4A43'
        ctx.font = '500 ' + fs + 'px Inter, sans-serif'
        const palabras = iconos[i].t.trim().split(' ')
        const lineas: string[] = []
        let ln = ''
        for (const p2 of palabras) {
          const s = ln ? ln + ' ' + p2 : p2
          if (ctx.measureText(s).width > colW - 12 && ln) {
            lineas.push(ln)
            ln = p2
          } else ln = s
        }
        if (ln) lineas.push(ln)
        const ty = iy + size + fs + 6
        for (let l = 0; l < Math.min(lineas.length, 2); l++) {
          ctx.fillText(lineas[l], cx, ty + l * (fs + 5))
        }
      }
      ctx.textAlign = 'left'
    }

    /* barra de contacto: WhatsApp + teléfono a la izquierda, logo a la derecha */
    const barraContacto = () => {
    ctx.fillStyle = INK
    ctx.fillRect(0, H - barH, W, barH)
    ctx.fillStyle = BRASS
    ctx.fillRect(0, H - barH, W, 7)

    // Logo de WhatsApp a la izquierda, con el texto corrido a su derecha
    const wa = formato === 'story' ? 60 : 54
    const waY = H - barH + (barH - wa) / 2 + 3
    ctx.save()
    ctx.translate(P, waY)
    ctx.scale(wa / 24, wa / 24)
    ctx.fillStyle = WA_VERDE
    ctx.fill(new Path2D(WA_BURBUJA))
    ctx.fillStyle = INK
    ctx.fill(new Path2D(WA_TUBO))
    ctx.restore()

    const tx = P + wa + 22
    ctx.fillStyle = 'rgba(246,241,231,.62)'
    ctx.font = '600 19px Inter, sans-serif'
    ls(3.6)
    ctx.fillText(tipo === 'venta' ? 'CONSULTAS Y VISITAS' : 'RESERVAS Y CONSULTAS', tx, H - barH + 48)
    ls(0)
    ctx.fillStyle = CREAM
    ctx.font = '600 35px Inter, sans-serif'
    ctx.fillText(contacto || 'WhatsApp 11 0000-0000', tx, H - barH + 88)

    // Logo en la esquina opuesta al teléfono, escalado a lo alto de la barra
    if (logo && logo.width && logo.height) {
      const maxAlto = barH - 42
      const maxAncho = 230
      const r = Math.min(maxAlto / logo.height, maxAncho / logo.width)
      const lw = logo.width * r
      const lh = logo.height * r
      ctx.drawImage(logo, W - P - lw, H - barH + 7 + (barH - 7 - lh) / 2, lw, lh)
    }
    }

    /* ---------------- Ficha A4 de venta ----------------
       Otra estructura: la portada pesa menos y mandan los datos duros, la
       grilla de fotos parejas y el texto de distribución. */
    if (formato === 'ficha') {
      ctx.fillStyle = CREAM
      ctx.fillRect(0, 0, W, H)

      const usadas = imgs.slice(0, MAX_FOTOS)
      const portadaH = 418

      if (usadas.length) {
        cover(usadas[0], 0, 0, W, portadaH, encuadres[0] ?? 0.5)
      } else {
        const g = ctx.createLinearGradient(0, 0, W, portadaH)
        g.addColorStop(0, '#243330')
        g.addColorStop(1, '#3E524B')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, portadaH)
        ctx.fillStyle = 'rgba(246,241,231,.55)'
        ctx.textAlign = 'center'
        ctx.font = '400 32px Inter, sans-serif'
        ctx.fillText('Sin fotos cargadas en la propiedad', W / 2, portadaH / 2)
        ctx.textAlign = 'left'
      }

      const gv = ctx.createLinearGradient(0, 0, 0, 200)
      gv.addColorStop(0, 'rgba(10,18,15,.6)')
      gv.addColorStop(1, 'rgba(10,18,15,0)')
      ctx.fillStyle = gv
      ctx.fillRect(0, 0, W, 200)

      const chH = 58
      if (chipIzq.trim()) chip(chipIzq.trim(), P, 52, chH, BRASS, '#fff', null)
      if (chipDer.trim()) {
        ctx.font = '600 ' + chH * 0.4 + 'px Inter, sans-serif'
        ls(chH * 0.075)
        const w2 = ctx.measureText(chipDer.trim()).width + chH * 1.04
        ls(0)
        chip(chipDer.trim(), W - P - w2, 52, chH, null, '#fff', 'rgba(255,255,255,.75)')
      }

      ctx.fillStyle = BRASS
      ctx.fillRect(0, portadaH, W, 9)

      /* cabecera: título y ubicación a la izquierda, precio a la derecha */
      const colPrecio = 330
      const colTexto = W - P * 2 - colPrecio - 26
      let y = portadaH + 9 + 44

      if (volanta.trim()) {
        ctx.fillStyle = MUT
        ctx.font = '600 19px Inter, sans-serif'
        ls(3.2)
        ctx.fillText(volanta.replace(/[·\s]+$/, ''), P, y)
        ls(0)
        // El título es de 43px: con menos aire su ascendente casi toca la volanta
        y += 50
      }

      ctx.fillStyle = INK
      ctx.font = '600 43px "Playfair Display", Georgia, serif'
      y = wrap(titulo, P, y, colTexto, 49, true, 2)

      if (subtitulo.trim()) {
        y += 2
        ctx.fillStyle = MUT
        ctx.font = '400 21px Inter, sans-serif'
        y = wrap(subtitulo, P, y, colTexto, 29, true, 1)
      }

      // Precio, alineado al margen derecho
      if (precio.trim()) {
        ctx.textAlign = 'right'
        let yp = portadaH + 9 + 62
        const m = precio.trim().match(/^(US\$|USD|AR\$|\$)\s*(.+)$/)
        const moneda = m ? m[1] : ''
        const cifra = m ? m[2] : precio
        ctx.font = '700 52px Inter, sans-serif'
        ls(-1.4)
        ctx.fillStyle = INK
        ctx.fillText(cifra, W - P, yp)
        const anchoCifra = ctx.measureText(cifra).width
        ls(0)
        if (moneda) {
          ctx.font = '700 28px Inter, sans-serif'
          ctx.fillText(moneda, W - P - anchoCifra - 9, yp)
        }
        yp += 32
        if (precio2.trim()) {
          ctx.font = '500 19px Inter, sans-serif'
          ctx.fillStyle = BRASS
          yp = wrap(precio2, W - P, yp, colPrecio, 26, true, 2)
        }
        ctx.textAlign = 'left'
        if (yp > y) y = yp
      }

      /* fila de datos duros */
      if (datos.length) {
        y += 12
        ctx.strokeStyle = '#DED5C4'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(P, y)
        ctx.lineTo(W - P, y)
        ctx.stroke()

        const colW = (W - P * 2) / datos.length
        ctx.textAlign = 'center'
        for (let i = 0; i < datos.length; i++) {
          const cx = P + colW * (i + 0.5)
          ctx.fillStyle = INK
          ctx.font = '700 31px Inter, sans-serif'
          ctx.fillText(datos[i].v, cx, y + 48)
          ctx.fillStyle = MUT
          ctx.font = '400 16px Inter, sans-serif'
          ctx.fillText(datos[i].l, cx, y + 72)
          if (i < datos.length - 1) {
            ctx.strokeStyle = '#E3DACA'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(P + colW * (i + 1), y + 16)
            ctx.lineTo(P + colW * (i + 1), y + 74)
            ctx.stroke()
          }
        }
        ctx.textAlign = 'left'
        y += 84
        ctx.strokeStyle = '#DED5C4'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(P, y)
        ctx.lineTo(W - P, y)
        ctx.stroke()
      }

      /* grilla de fotos parejas: acá no hay jerarquía, es un recorrido */
      const resto = usadas.slice(1)
      if (resto.length) {
        y += 18
        const gap = 8
        const cols = 3
        const filas = Math.ceil(resto.length / cols)
        const gw = (W - P * 2 - gap * (cols - 1)) / cols
        const gh = filas >= 2 ? 168 : 210
        for (let i = 0; i < resto.length; i++) {
          const cx = P + (i % cols) * (gw + gap)
          const cy = y + Math.floor(i / cols) * (gh + gap)
          cover(resto[i], cx, cy, gw, gh, encuadres[i + 1] ?? 0.5)
        }
        y += filas * gh + (filas - 1) * gap
      }

      /* dos columnas de texto: lo que el comprador pregunta por WhatsApp */
      const conTexto = bloques.filter((b) => b.c.trim())
      if (conTexto.length) {
        y += 18
        const gapCol = 34
        const cw = (W - P * 2 - gapCol) / Math.min(conTexto.length, 2)
        const tope = H - barH - iconH - 14
        for (let i = 0; i < Math.min(conTexto.length, 2); i++) {
          const cx = P + i * (cw + gapCol)
          let cy = y
          ctx.fillStyle = BRASS
          ctx.font = '600 16px Inter, sans-serif'
          ls(3)
          ctx.fillText(conTexto[i].t.toUpperCase(), cx, cy)
          ls(0)
          cy += 27
          ctx.fillStyle = '#3A4A43'
          ctx.font = '400 16.5px Inter, sans-serif'
          // Se corta en la línea que llegaría a la barra de amenities
          const maxLineas = Math.max(1, Math.floor((tope - cy) / 23))
          wrap(conTexto[i].c, cx, cy, cw, 23, true, maxLineas)
        }
      }

      barraAmenities()
      barraContacto()
      return
    }

    /* encaje: la foto apunta al 70%, y solo cede si el texto queda ilegible */
    // zonaY es la base de la volanta, así que el padding arriba la incluye.
    // El +22 compensa que block() mide hasta la línea siguiente, no hasta el
    // borde visual del último renglón.
    const padTop = formato === 'post' ? 36 : 44
    const kMax = formato === 'post' ? 1.0 : 1.18
    const encajar = (f: number) => {
      const zy = H * f + 10 + padTop
      const av = H - barH - iconH - zy + 22
      let lo = 0.5
      let hi = kMax
      for (let i = 0; i < 22; i++) {
        const m = (lo + hi) / 2
        if (block(zy, m, false) - zy > av) hi = m
        else lo = m
      }
      return { zonaY: zy, avail: av, k: lo }
    }

    // Con títulos o volantas largas el 70% deja el texto muy chico: ahí se le
    // devuelven unos puntos a la tipografía, hasta un piso del 64% de foto.
    let enc = encajar(0.7)
    let frac = 0.7
    while (enc.k < 0.82 && frac > 0.641) {
      frac -= 0.01
      enc = encajar(frac)
    }
    const photoH = H * frac
    const { zonaY, avail, k } = enc
    // Si el texto no llena la franja, se centra en vez de quedar pegado arriba
    const topY = zonaY + Math.max(0, (avail - (block(zonaY, k, false) - zonaY)) / 2)

    /* fondo + fotos */
    ctx.fillStyle = CREAM
    ctx.fillRect(0, 0, W, H)

    const n = Math.min(imgs.length, 4)
    let heroH = photoH
    if (n === 0) {
      const g = ctx.createLinearGradient(0, 0, W, photoH)
      g.addColorStop(0, '#243330')
      g.addColorStop(1, '#3E524B')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, photoH)
      ctx.fillStyle = 'rgba(246,241,231,.55)'
      ctx.textAlign = 'center'
      ctx.font = '400 34px Inter, sans-serif'
      ctx.fillText('Sin fotos cargadas en la propiedad', W / 2, photoH / 2)
      ctx.textAlign = 'left'
    } else if (n === 1) {
      cover(imgs[0], 0, 0, W, photoH, encuadres[0] ?? 0.5)
    } else {
      // La portada se lleva 3/4 del bloque: con esa proporción (~1,5:1) una foto
      // de celular entra casi entera en vez de quedar en franja panorámica.
      const gap = 9
      heroH = photoH * 0.75 - gap / 2
      cover(imgs[0], 0, 0, W, heroH, encuadres[0] ?? 0.5)
      const sy = heroH + gap
      const sh = photoH - heroH - gap
      const m = n - 1
      const w = (W - gap * (m - 1)) / m
      for (let i = 0; i < m; i++) {
        cover(imgs[i + 1], i * (w + gap), sy, w, sh, encuadres[i + 1] ?? 0.5)
      }
    }

    const gv = ctx.createLinearGradient(0, 0, 0, heroH * 0.4)
    gv.addColorStop(0, 'rgba(10,18,15,.55)')
    gv.addColorStop(1, 'rgba(10,18,15,0)')
    ctx.fillStyle = gv
    ctx.fillRect(0, 0, W, heroH * 0.4)

    const chH = 62
    const chY = P * 0.82
    const t1 = chipIzq.trim()
    if (t1) chip(t1, P, chY, chH, BRASS, '#fff', null)

    const t2 = chipDer.trim()
    if (t2) {
      // Se mide antes para poder alinearlo contra el margen derecho
      ctx.font = '600 ' + chH * 0.4 + 'px Inter, sans-serif'
      ls(chH * 0.075)
      const w2 = ctx.measureText(t2).width + chH * 1.04
      ls(0)
      chip(t2, W - P - w2, chY, chH, null, '#fff', 'rgba(255,255,255,.75)')
    }

    ctx.fillStyle = BRASS
    ctx.fillRect(0, photoH, W, 10)

    block(topY, k, true)

    barraAmenities()
    barraContacto()
  }, [imgs, encuadres, logo, formato, tipo, volanta, titulo, ficha, precio, sufijo, precio2, iconos, contacto, chipIzq, chipDer, subtitulo, datos, bloques])

  useEffect(() => { dibujar() }, [dibujar])

  /* ---------- acciones ---------- */
  const descargar = () => {
    const cv = canvasRef.current
    if (!cv) return
    const tmp = document.createElement('canvas')
    tmp.width = cv.width * 2
    tmp.height = cv.height * 2
    const c = tmp.getContext('2d')
    if (!c) return
    c.imageSmoothingQuality = 'high'
    c.drawImage(cv, 0, 0, tmp.width, tmp.height)
    try {
      const a = document.createElement('a')
      a.download = `${(sel?.nombre || 'pieza').replace(/\s+/g, '-').toLowerCase()}-${tipo}-${formato}.png`
      a.href = tmp.toDataURL('image/png')
      a.click()
    } catch {
      alert('No se pudo exportar: alguna foto no permite descarga por CORS. Probá con otra imagen.')
    }
  }

  // La ficha se manda por mail o se imprime, así que además del PNG va en PDF.
  // jsPDF se importa acá para no cargarlo en quienes solo bajan el PNG.
  const descargarPDF = async () => {
    const cv = canvasRef.current
    if (!cv) return
    setExportandoPDF(true)
    try {
      const { jsPDF } = await import('jspdf')
      const tmp = document.createElement('canvas')
      tmp.width = cv.width * 2
      tmp.height = cv.height * 2
      const c = tmp.getContext('2d')
      if (!c) return
      c.imageSmoothingQuality = 'high'
      c.drawImage(cv, 0, 0, tmp.width, tmp.height)

      // La pieza se centra en la hoja respetando su proporción
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const hojaW = 210
      const hojaH = 297
      const r = Math.min(hojaW / cv.width, hojaH / cv.height)
      const w = cv.width * r
      const h = cv.height * r
      pdf.addImage(tmp.toDataURL('image/jpeg', 0.92), 'JPEG', (hojaW - w) / 2, (hojaH - h) / 2, w, h)
      pdf.save(`${(sel?.nombre || 'ficha').replace(/\s+/g, '-').toLowerCase()}-${tipo}.pdf`)
    } catch {
      alert('No se pudo exportar el PDF: alguna foto no permite descarga por CORS. Probá con otra imagen.')
    } finally {
      setExportandoPDF(false)
    }
  }

  const hacerPortada = (i: number) => {
    if (i === 0) return
    const alFrente = <T,>(c: T[]) => { const x = [...c]; const [m] = x.splice(i, 1); x.unshift(m); return x }
    setImgs(alFrente)
    setSrcs(alFrente)
    setEncuadres(alFrente)
  }
  const quitar = (i: number) => {
    const sinEl = <T,>(c: T[]) => c.filter((_, j) => j !== i)
    setImgs(sinEl)
    setSrcs(sinEl)
    setEncuadres(sinEl)
  }
  // Suma una foto de la propiedad a la selección
  const agregar = async (url: string) => {
    if (srcs.length >= MAX_FOTOS || srcs.includes(url)) return
    const img = await cargarImagen(url)
    setSrcs((prev) => (prev.length >= MAX_FOTOS || prev.includes(url) ? prev : [...prev, url]))
    setEncuadres((prev) => (prev.length >= MAX_FOTOS ? prev : [...prev, 0.5]))
    if (img) setImgs((prev) => [...prev, img])
    else setFotosBloqueadas(true)
  }
  // Mueve el recorte de una foto: útil cuando el cover corta el techo o la pileta
  const moverEncuadre = (i: number, pos: number) => {
    setEncuadres((prev) => prev.map((v, j) => (j === i ? pos : v)))
  }

  /* ---------- iconos ---------- */
  const toggleIcono = (k: string) => {
    setIconos((prev) => {
      if (prev.some((x) => x.k === k)) return prev.filter((x) => x.k !== k)
      if (prev.length >= MAX_ICONOS) return prev
      return [...prev, { k, t: ICONO_POR_K[k]?.nombre || k }]
    })
  }
  const editarIcono = (k: string, t: string) => {
    setIconos((prev) => prev.map((x) => (x.k === k ? { ...x, t } : x)))
  }
  const moverIcono = (i: number, dir: -1 | 1) => {
    setIconos((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const c = [...prev]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })
  }

  /* ---------- UI ---------- */
  const seg = 'px-4 py-2 rounded-lg text-sm font-medium border transition-colors'
  const segOn = 'bg-costa-navy text-white border-costa-navy'
  const segOff = 'bg-white text-costa-gris border-costa-beige hover:border-costa-navy/40'
  const label = 'block text-[11px] font-semibold tracking-wider uppercase text-costa-gris mb-2'
  const inputBase = 'px-3 py-2 border border-costa-beige rounded-lg text-sm text-costa-navy bg-costa-beige-light focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all'
  const input = 'w-full ' + inputBase

  // Todas las fotos de la propiedad, y las que todavía no están en la selección
  const fotosPropiedad = sel
    ? [
        ...(sel.imagen_url ? [sel.imagen_url] : []),
        ...((sel.imagenes || []).filter((u) => u && u !== sel.imagen_url)),
      ]
    : []
  const fotosDisponibles = fotosPropiedad.filter((u) => !srcs.includes(u))

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-costa-gris">
        <Loader2 className="animate-spin mr-2" size={18} /> Cargando propiedades...
      </div>
    )
  }

  if (!propiedades.length) {
    return (
      <div>
        <PageHeader
          title="Piezas gráficas"
          description="Generá el aviso de venta o alquiler de tus propiedades, listo para WhatsApp, Instagram o imprimir."
        />
        <div className="flex flex-col items-center justify-center py-20 text-center text-costa-gris">
          <ImageIcon size={40} className="mb-4 opacity-40" />
          <p className="font-medium text-costa-navy mb-1">Todavía no tenés propiedades cargadas</p>
          <p className="text-sm">Agregá una propiedad desde la sección Propiedades para poder generar su pieza gráfica.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Piezas gráficas"
        description="Generá el aviso de venta o alquiler de tus propiedades, listo para WhatsApp, Instagram o imprimir."
      />

      {/* Selector de propiedad */}
      <p className={label}>1 · Propiedad</p>
      <div className="flex gap-3 flex-wrap mb-6">
        {propiedades.map((p) => (
          <button
            key={p.id}
            onClick={() => elegirPropiedad(p)}
            className={`flex items-center gap-3 p-2 pr-4 rounded-xl bg-white shadow-sm border-2 transition-colors text-left ${
              p.id === selId ? 'border-costa-coral' : 'border-transparent hover:border-costa-beige'
            }`}
          >
            <div
              className="w-16 h-12 rounded-lg bg-costa-beige bg-cover bg-center flex-shrink-0"
              style={{ backgroundImage: p.imagen_url ? `url(${p.imagen_url})` : undefined }}
            />
            <div className="min-w-0">
              <div className="font-semibold text-sm text-costa-navy truncate" style={{ fontFamily: 'var(--font-playfair)' }}>
                {p.nombre}
              </div>
              <div className="text-xs text-costa-gris">
                {p.metros_cubiertos ? `${p.metros_cubiertos} m²` : ''}
                {p.metros_lote ? ` · lote ${p.metros_lote} m²` : ''}
                {p.capacidad ? ` · ${p.capacidad} personas` : ''}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tipo y formato */}
      <div className="flex gap-8 flex-wrap mb-6">
        <div>
          <p className={label}>2 · Tipo de aviso</p>
          <div className="flex gap-2">
            <button onClick={() => elegirTipo('venta')} className={`${seg} ${tipo === 'venta' ? segOn : segOff}`}>
              Venta{sel && avisosGuardados[`${sel.id}:venta`] ? ' ✓' : ''}
            </button>
            <button onClick={() => elegirTipo('alquiler')} className={`${seg} ${tipo === 'alquiler' ? segOn : segOff}`}>
              Alquiler{sel && avisosGuardados[`${sel.id}:alquiler`] ? ' ✓' : ''}
            </button>
          </div>
        </div>
        <div>
          <p className={label}>3 · Formato</p>
          <div className="flex gap-2">
            <button onClick={() => setFormato('post')} className={`${seg} ${formato === 'post' ? segOn : segOff}`}>Post 4:5</button>
            <button onClick={() => setFormato('story')} className={`${seg} ${formato === 'story' ? segOn : segOff}`}>Story 9:16</button>
            <button onClick={() => setFormato('ficha')} className={`${seg} ${formato === 'ficha' ? segOn : segOff}`} title="Ficha A4 para mandar por WhatsApp o imprimir">
              Ficha A4
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start flex-col lg:flex-row">
        {/* Controles */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex gap-2 items-start bg-costa-olivo/10 rounded-lg p-3 text-[13px] text-costa-olivo mb-4">
            <span className="mt-0.5">✓</span>
            <div>
              <b>Los datos salen de la ficha de la propiedad</b> — metros, lote, dormitorios, baños,
              capacidad, amenities y fotos. Editá abajo solo lo que quieras cambiar.
            </div>
          </div>

          {/* Fotos */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <p className={label}>
              <ImageIcon size={12} className="inline mr-1 -mt-0.5" /> Fotos de la propiedad
            </p>
            {srcs.length > fotosDelFormato(formato) && (
              <p className="text-[11px] text-costa-gris mb-2 -mt-1">
                {formato === 'ficha'
                  ? `La ficha usa las primeras ${MAX_FOTOS}: portada + 6 en grilla.`
                  : `Este formato usa las primeras 4 — las atenuadas solo salen en la Ficha A4.`}
              </p>
            )}
            {cargandoFotos ? (
              <div className="text-sm text-costa-gris flex items-center gap-2 py-4">
                <Loader2 className="animate-spin" size={15} /> Cargando fotos...
              </div>
            ) : srcs.length === 0 ? (
              <p className="text-sm text-costa-gris py-2">
                Esta propiedad todavía no tiene fotos cargadas. Subilas desde Propiedades y volvé acá.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {srcs.map((s, i) => (
                  <div key={s + i} className={i >= fotosDelFormato(formato) ? 'opacity-40' : ''}>
                    <div className="relative rounded-lg overflow-hidden group" style={{ paddingTop: '92%' }}>
                      <div
                        className="absolute inset-0 bg-cover"
                        style={{
                          backgroundImage: `url(${s})`,
                          backgroundPosition: `center ${(encuadres[i] ?? 0.5) * 100}%`,
                        }}
                      />
                      <button
                        onClick={() => hacerPortada(i)}
                        className={`absolute bottom-0 inset-x-0 text-[9px] font-bold tracking-wider py-1 ${
                          i === 0 ? 'bg-costa-coral text-white' : 'bg-costa-navy/75 text-white/85 hover:bg-costa-coral'
                        }`}
                      >
                        {i === 0 ? 'PORTADA' : 'USAR'}
                      </button>
                      <button
                        onClick={() => quitar(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-costa-navy/75 text-white text-xs leading-none hover:bg-costa-coral"
                      >
                        ×
                      </button>
                    </div>
                    {/* Encuadre: qué parte de la foto se conserva al recortarla */}
                    <div className="flex mt-1 rounded-md overflow-hidden border border-costa-beige">
                      {([['↑', 0], ['•', 0.5], ['↓', 1]] as const).map(([txt, pos]) => (
                        <button
                          key={pos}
                          onClick={() => moverEncuadre(i, pos)}
                          title={pos === 0 ? 'Encuadrar arriba' : pos === 1 ? 'Encuadrar abajo' : 'Centrar'}
                          className={`flex-1 text-[11px] leading-none py-1 transition-colors ${
                            (encuadres[i] ?? 0.5) === pos
                              ? 'bg-costa-navy text-white'
                              : 'bg-white text-costa-gris hover:bg-costa-beige-light'
                          }`}
                        >
                          {txt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fotosDisponibles.length > 0 && (
              <div className="mt-3 border-t border-costa-beige pt-3">
                <p className="text-[11px] text-costa-gris mb-2">
                  {srcs.length >= MAX_FOTOS
                    ? `Ya hay ${MAX_FOTOS} fotos elegidas. Quitá alguna (×) para poder sumar otra.`
                    : `Más fotos de la propiedad — tocá para sumarlas (máximo ${MAX_FOTOS}):`}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {fotosDisponibles.map((u, i) => (
                    <button
                      key={u + i}
                      onClick={() => agregar(u)}
                      disabled={srcs.length >= MAX_FOTOS}
                      title={srcs.length >= MAX_FOTOS ? `Máximo ${MAX_FOTOS} fotos` : 'Agregar a la pieza'}
                      className="relative rounded-lg overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ paddingTop: '92%' }}
                    >
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${u})` }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-costa-navy/0 group-hover:bg-costa-navy/40 transition-colors">
                        <span className="text-white text-xl font-bold opacity-0 group-hover:opacity-100">+</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fotosBloqueadas && (
              <p className="text-xs text-costa-coral mt-2">
                Algunas fotos no se pudieron cargar para la pieza. Verificá que el bucket de Supabase sea público.
              </p>
            )}
          </div>

          {/* Campos exclusivos de la ficha A4 */}
          {formato === 'ficha' && (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-4">
              <div className="flex gap-2 items-start bg-costa-olivo/10 rounded-lg p-3 text-[13px] text-costa-olivo">
                <span className="mt-0.5">✓</span>
                <div>
                  <b>Los datos y el texto salen de la ficha de la propiedad.</b> La descripción se parte
                  en dos columnas por sus títulos en mayúscula, salteando la ficha técnica porque esos
                  números ya van en la fila de arriba.
                </div>
              </div>

              <div>
                <label className={label}>Ubicación (debajo del título)</label>
                <input className={input} value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
              </div>

              <div>
                <p className={label}>Datos duros — {datos.length} de 6</p>
                <div className="flex gap-2 mb-1 text-[10px] font-semibold tracking-wider uppercase text-costa-gris">
                  <span className="w-24 flex-shrink-0 text-center">Valor</span>
                  <span className="flex-1">Qué es (sale debajo del número)</span>
                  <span className="w-7" />
                </div>
                <div className="space-y-2">
                  {datos.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* El valor va angosto y la etiqueta se lleva el resto:
                          sin w-full en la clase base, que si no compite con w-28 */}
                      <input
                        className={`${inputBase} w-24 flex-shrink-0 font-semibold text-center`}
                        value={d.v}
                        placeholder="200"
                        onChange={(e) => setDatos((prev) => prev.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
                      />
                      <input
                        className={`${inputBase} flex-1 min-w-0`}
                        value={d.l}
                        placeholder="m² cubiertos"
                        onChange={(e) => setDatos((prev) => prev.map((x, j) => (j === i ? { ...x, l: e.target.value } : x)))}
                      />
                      <button
                        onClick={() => setDatos((prev) => prev.filter((_, j) => j !== i))}
                        className="px-2 py-1 text-costa-gris hover:text-costa-coral"
                        title="Quitar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {datos.length < 6 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-costa-gris">Agregar:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        const c = CAMPOS_DATO.find((x) => x.l === e.target.value)
                        if (!c) return
                        // Se suma con su valor ya tomado de la ficha, no en blanco
                        setDatos((prev) => [...prev, { v: sel ? c.valor(sel) : '', l: c.l }])
                      }}
                      className={`${inputBase} w-56`}
                    >
                      <option value="">Elegí un dato...</option>
                      {CAMPOS_DATO.filter((c) => !datos.some((d) => d.l.startsWith(c.l))).map((c) => (
                        <option key={c.l} value={c.l}>
                          {c.l}
                          {sel && c.valor(sel) ? ` (${c.valor(sel)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {bloques.slice(0, 2).map((b, i) => (
                <div key={i}>
                  <label className={label}>Columna {i + 1}</label>
                  <input
                    className={`${input} mb-2`}
                    value={b.t}
                    placeholder="Título de la columna"
                    onChange={(e) => setBloques((prev) => prev.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))}
                  />
                  <textarea
                    className={input}
                    rows={4}
                    value={b.c}
                    placeholder="Vacío = no se dibuja esta columna"
                    onChange={(e) => setBloques((prev) => prev.map((x, j) => (j === i ? { ...x, c: e.target.value } : x)))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Iconos de amenities */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <p className={label}>
              Iconos de la pieza — {iconos.length} de {MAX_ICONOS}
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {ICONOS.map((ic) => {
                const on = iconos.some((x) => x.k === ic.k)
                const lleno = iconos.length >= MAX_ICONOS
                return (
                  <button
                    key={ic.k}
                    onClick={() => toggleIcono(ic.k)}
                    disabled={!on && lleno}
                    title={!on && lleno ? `Máximo ${MAX_ICONOS} iconos` : ic.nombre}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
                      on
                        ? 'bg-costa-navy text-white border-costa-navy'
                        : 'bg-white text-costa-gris border-costa-beige hover:border-costa-navy/40'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d={ic.d} />
                    </svg>
                    {ic.nombre}
                  </button>
                )
              })}
            </div>

            {iconos.length === 0 ? (
              <p className="text-[11px] text-costa-gris">
                Sin iconos la pieza muestra la ficha debajo del título, como antes.
              </p>
            ) : (
              <div className="space-y-2 border-t border-costa-beige pt-3">
                <p className="text-[11px] text-costa-gris">
                  Editá el texto de cada uno y ordenalos como van a salir en la pieza:
                </p>
                {iconos.map((it, i) => (
                  <div key={it.k} className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={BRASS} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d={ICONO_POR_K[it.k]?.d} />
                    </svg>
                    <input
                      className={`${inputBase} flex-1 min-w-0`}
                      value={it.t}
                      onChange={(e) => editarIcono(it.k, e.target.value)}
                    />
                    <button
                      onClick={() => moverIcono(i, -1)}
                      disabled={i === 0}
                      className="px-2 py-1 flex-shrink-0 text-costa-gris hover:text-costa-navy disabled:opacity-25"
                      title="Mover a la izquierda"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => moverIcono(i, 1)}
                      disabled={i === iconos.length - 1}
                      className="px-2 py-1 flex-shrink-0 text-costa-gris hover:text-costa-navy disabled:opacity-25"
                      title="Mover a la derecha"
                    >
                      →
                    </button>
                    <button
                      onClick={() => toggleIcono(it.k)}
                      className="px-2 py-1 flex-shrink-0 text-costa-gris hover:text-costa-coral"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campos */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={label}>Etiqueta izquierda</label>
                <input
                  className={input}
                  value={chipIzq}
                  onChange={(e) => setChipIzq(e.target.value)}
                  placeholder="Vacío = sin etiqueta"
                />
              </div>
              <div className="flex-1">
                <label className={label}>Etiqueta derecha</label>
                <input
                  className={input}
                  value={chipDer}
                  onChange={(e) => setChipDer(e.target.value)}
                  placeholder="Vacío = sin etiqueta"
                />
              </div>
            </div>
            <div>
              <label className={label}>Volanta</label>
              <input className={input} value={volanta} onChange={(e) => setVolanta(e.target.value)} />
            </div>
            <div>
              <label className={label}>Título</label>
              <input className={input} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <label className={label}>Ficha (separá con · )</label>
              <textarea className={input} rows={2} value={ficha} onChange={(e) => setFicha(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={label}>Precio</label>
                <input className={input} value={precio} onChange={(e) => setPrecio(e.target.value)} />
              </div>
              {tipo === 'alquiler' && (
                <div className="w-32">
                  <label className={label}>Sufijo</label>
                  <input className={input} value={sufijo} onChange={(e) => setSufijo(e.target.value)} />
                </div>
              )}
            </div>
            <div>
              <label className={label}>Línea secundaria</label>
              <input className={input} value={precio2} onChange={(e) => setPrecio2(e.target.value)} />
            </div>
            <div>
              <label className={label}>Contacto</label>
              <input
                className={input}
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="WhatsApp 11 0000-0000"
              />
            </div>
          </div>

          <button
            onClick={grabar}
            disabled={guardando}
            className="w-full py-3 mb-2 bg-costa-navy text-white rounded-lg font-semibold hover:bg-costa-navy/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {guardando ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Grabar cambios de {tipo}
          </button>
          {guardadoMsg && (
            <p
              className={`text-xs mb-2 text-center ${
                guardadoMsg.startsWith('No se pudo') ? 'text-costa-coral' : 'text-costa-olivo'
              }`}
            >
              {guardadoMsg}
            </p>
          )}

          <button
            onClick={descargar}
            className="w-full py-3 bg-costa-coral text-white rounded-lg font-semibold hover:bg-costa-coral-dark transition-colors flex items-center justify-center gap-2"
          >
            <Download size={17} /> Descargar PNG
          </button>

          {formato === 'ficha' && (
            <button
              onClick={descargarPDF}
              disabled={exportandoPDF}
              className="w-full py-3 mt-2 bg-white border-2 border-costa-navy text-costa-navy rounded-lg font-semibold hover:bg-costa-beige-light transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {exportandoPDF ? <Loader2 className="animate-spin" size={17} /> : <FileText size={17} />}
              Descargar PDF (A4)
            </button>
          )}

          <p className="text-xs text-costa-gris mt-2 text-center">
            Se descarga a 2× de resolución. El bloque de texto se ajusta solo al espacio disponible.
          </p>
          <button
            onClick={restaurarDesdeFicha}
            className="w-full mt-3 text-xs text-costa-gris hover:text-costa-navy underline"
          >
            Restaurar textos desde la ficha de la propiedad
          </button>
        </div>

        {/* Preview */}
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <p className={label}>Vista previa</p>
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg shadow-xl"
            style={{ maxHeight: '78vh', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  )
}
