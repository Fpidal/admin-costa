'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Download, Image as ImageIcon, Loader2, Save } from 'lucide-react'

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
  metros_lote: number
}

type Tipo = 'venta' | 'alquiler'
type Formato = 'post' | 'story'

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
  formato: Formato
  fotos: string[] // URLs elegidas, en orden (la primera es la portada)
}

/* ------------------------------------------------------------------ */
/* Paleta de la pieza                                                  */
/* ------------------------------------------------------------------ */

const INK = '#14201C'
const CREAM = '#F6F1E7'
const BRASS = '#B08D4F'
const MUT = '#6B7A72'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const money = (n: number) =>
  'US$ ' + Math.round(n || 0).toLocaleString('es-AR')

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
  return d.slice(0, 5).join(' · ')
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
  const [guardadoMsg, setGuardadoMsg] = useState('')

  const [tipo, setTipo] = useState<Tipo>('alquiler')
  const [formato, setFormato] = useState<Formato>('post')

  const [imgs, setImgs] = useState<HTMLImageElement[]>([])
  const [srcs, setSrcs] = useState<string[]>([])
  const [cargandoFotos, setCargandoFotos] = useState(false)
  const [fotosBloqueadas, setFotosBloqueadas] = useState(false)

  // Campos editables
  const [volanta, setVolanta] = useState('')
  const [titulo, setTitulo] = useState('')
  const [ficha, setFicha] = useState('')
  const [precio, setPrecio] = useState('')
  const [sufijo, setSufijo] = useState('')
  const [precio2, setPrecio2] = useState('')
  const [destacados, setDestacados] = useState('')
  const [contacto, setContacto] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sel = propiedades.find((p) => p.id === selId) || null

  /* ---------- presets y fotos (se llaman desde los handlers) ---------- */
  const aplicarTextos = useCallback((p: Propiedad, t: Tipo) => {
    const barrio = p.nombre?.split('-')[0]?.trim() || p.nombre
    setVolanta(`COSTA ESMERALDA \u00b7 ${barrio.toUpperCase()} \u00b7 PINAMAR`)
    setTitulo(p.nombre?.replace(/\s*-\s*Lote.*$/i, '').trim() || p.nombre)
    setFicha(fichaDe(p, t))
    setDestacados(destacadosDe(p, t))
    if (t === 'alquiler') {
      setPrecio(p.precio_alquiler ? money(p.precio_alquiler) : 'US$ ')
      setSufijo('/ noche')
      setPrecio2('Consult\u00e1 enero completo, febrero y fines de semana largos')
    } else {
      setPrecio('US$ ')
      setSufijo('')
      setPrecio2('Permuta y financiaci\u00f3n directa del propietario')
    }
  }, [])

  // Restaura en los inputs un aviso previamente grabado
  const aplicarGuardado = useCallback((d: DatosAviso) => {
    setVolanta(d.volanta ?? '')
    setTitulo(d.titulo ?? '')
    setFicha(d.ficha ?? '')
    setPrecio(d.precio ?? '')
    setSufijo(d.sufijo ?? '')
    setPrecio2(d.precio2 ?? '')
    setDestacados(d.destacados ?? '')
    setContacto(d.contacto ?? '')
    if (d.formato) setFormato(d.formato)
  }, [])

  // Carga en el canvas una lista explícita de URLs (usada para restaurar lo grabado)
  const cargarFotosDesde = useCallback(async (urls: string[]) => {
    const lista = (urls || []).slice(0, 4)
    setSrcs(lista)
    setImgs([])
    setFotosBloqueadas(false)
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
      ].slice(0, 4)
      return cargarFotosDesde(urls)
    },
    [cargarFotosDesde],
  )

  const elegirPropiedad = (p: Propiedad) => {
    setSelId(p.id)
    setGuardadoMsg('')
    const g = avisosGuardados[`${p.id}:${tipo}`]
    if (g) {
      aplicarGuardado(g)
      if (g.fotos?.length) void cargarFotosDesde(g.fotos)
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
        aplicarGuardado(g)
        // Si el tipo tiene fotos grabadas se restauran; si no, se dejan las actuales
        if (g.fotos?.length) void cargarFotosDesde(g.fotos)
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
    const datos: DatosAviso = {
      volanta,
      titulo,
      ficha,
      precio,
      sufijo,
      precio2,
      destacados,
      contacto,
      formato,
      fotos: srcs,
    }
    const { error } = await supabase.from('piezas_avisos').upsert(
      {
        user_id: userId,
        propiedad_id: sel.id,
        tipo,
        datos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,propiedad_id,tipo' },
    )
    setGuardando(false)
    if (error) {
      setGuardadoMsg('No se pudo guardar: ' + error.message)
      return
    }
    setAvisosGuardados((prev) => ({ ...prev, [`${sel.id}:${tipo}`]: datos }))
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
          aplicarGuardado(g)
          if (g.fotos?.length) void cargarFotosDesde(g.fotos)
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
    const H = formato === 'post' ? 1350 : 1920
    cv.width = W
    cv.height = H
    const S = 1
    const P = W * 0.078
    const barH = 118

    const ls = (px: number) => {
      try {
        ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = px + 'px'
      } catch {}
    }
    const cover = (im: HTMLImageElement, x: number, y: number, w: number, h: number) => {
      const r = Math.max(w / im.width, h / im.height)
      const nw = im.width * r
      const nh = im.height * r
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, w, h)
      ctx.clip()
      ctx.drawImage(im, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh)
      ctx.restore()
    }
    const wrap = (t: string, x: number, y: number, maxW: number, lh: number, paint: boolean) => {
      const ws = t.split(' ')
      let line = ''
      let yy = y
      for (const w of ws) {
        const s = line ? line + ' ' + w : w
        if (ctx.measureText(s).width > maxW && line) {
          if (paint) ctx.fillText(line, x, yy)
          line = w
          yy += lh
        } else line = s
      }
      if (line) {
        if (paint) ctx.fillText(line, x, yy)
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

    /* bloque de texto */
    const block = (topY: number, k: number, paint: boolean) => {
      const maxW = W - P * 2
      let y = topY
      const q = S * k

      ctx.fillStyle = MUT
      ctx.font = '600 ' + 22 * q + 'px Inter, sans-serif'
      ls(4 * q)
      if (paint) ctx.fillText(volanta.replace(/[·\s]+$/, ''), P, y)
      ls(0)
      y += 118 * q

      ctx.fillStyle = INK
      ctx.font = '600 ' + 72 * q + 'px "Playfair Display", Georgia, serif'
      y = wrap(titulo, P, y, maxW, 80 * q, paint)
      y += 24 * q

      ctx.fillStyle = MUT
      ctx.font = '400 ' + 27 * q + 'px Inter, sans-serif'
      y = wrap(ficha, P, y, maxW, 39 * q, paint)
      y += 28 * q

      if (paint) {
        ctx.strokeStyle = '#DED5C4'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(P, y)
        ctx.lineTo(W - P, y)
        ctx.stroke()
      }
      y += 90 * q

      ctx.font = '700 ' + 86 * q + 'px Inter, sans-serif'
      ls(-1.6 * q)
      if (paint) { ctx.fillStyle = INK; ctx.fillText(precio, P, y) }
      const pw = ctx.measureText(precio).width
      ls(0)
      if (sufijo.trim() && tipo !== 'venta') {
        ctx.font = '400 ' + 33 * q + 'px Inter, sans-serif'
        if (paint) { ctx.fillStyle = MUT; ctx.fillText(' ' + sufijo, P + pw + 11 * q, y) }
      }
      y += 66 * q

      if (precio2.trim()) {
        ctx.font = '500 ' + 25 * q + 'px Inter, sans-serif'
        if (paint) ctx.fillStyle = BRASS
        y = wrap(precio2, P, y, maxW, 35 * q, paint)
      }
      y += 54 * q

      const items = destacados.split('·').map((s) => s.trim()).filter(Boolean)
      ctx.font = '400 ' + 26 * q + 'px Inter, sans-serif'
      for (const it of items) {
        if (paint) {
          ctx.fillStyle = BRASS
          ctx.beginPath()
          ctx.arc(P + 7 * q, y - 9 * q, 6 * q, 0, 7)
          ctx.fill()
          ctx.fillStyle = '#3A4A43'
        }
        y = wrap(it, P + 32 * q, y, maxW - 32 * q, 38 * q, paint) + 16 * q
      }
      if (items.length) y -= 16 * q
      return y
    }

    /* encaje: primero achica la foto, después la tipografía */
    const fracMax = formato === 'post' ? 0.585 : 0.645
    const fracMin = formato === 'post' ? 0.4 : 0.47
    let frac = fracMin
    for (let f = fracMax; f >= fracMin - 0.0001; f -= 0.004) {
      const ph = H * f
      const ty = ph + 10 + P * 0.92
      const av = H - barH - ty - P * 0.5
      if (block(ty, 0.93, false) - ty <= av) { frac = f; break }
    }
    const photoH = H * frac
    const topY = photoH + 10 + P * 0.92
    const avail = H - barH - topY - P * 0.5
    let lo = 0.7
    let hi = 1.0
    for (let i = 0; i < 22; i++) {
      const m = (lo + hi) / 2
      if (block(topY, m, false) - topY > avail) hi = m
      else lo = m
    }
    const k = lo

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
      cover(imgs[0], 0, 0, W, photoH)
    } else {
      const gap = 9
      heroH = photoH * 0.635 - gap / 2
      cover(imgs[0], 0, 0, W, heroH)
      const sy = heroH + gap
      const sh = photoH - heroH - gap
      const m = n - 1
      const w = (W - gap * (m - 1)) / m
      for (let i = 0; i < m; i++) cover(imgs[i + 1], i * (w + gap), sy, w, sh)
    }

    const gv = ctx.createLinearGradient(0, 0, 0, heroH * 0.4)
    gv.addColorStop(0, 'rgba(10,18,15,.55)')
    gv.addColorStop(1, 'rgba(10,18,15,0)')
    ctx.fillStyle = gv
    ctx.fillRect(0, 0, W, heroH * 0.4)

    const chH = 62
    const chY = P * 0.82
    chip(tipo === 'venta' ? 'EN VENTA' : 'TEMPORADA 2027', P, chY, chH, BRASS, '#fff', null)
    ctx.font = '600 ' + chH * 0.4 + 'px Inter, sans-serif'
    ls(chH * 0.075)
    const t2 = 'DUEÑO DIRECTO'
    const w2 = ctx.measureText(t2).width + chH * 1.04
    ls(0)
    chip(t2, W - P - w2, chY, chH, null, '#fff', 'rgba(255,255,255,.75)')

    ctx.fillStyle = BRASS
    ctx.fillRect(0, photoH, W, 10)

    block(topY, k, true)

    ctx.fillStyle = INK
    ctx.fillRect(0, H - barH, W, barH)
    ctx.fillStyle = BRASS
    ctx.fillRect(0, H - barH, W, 7)
    ctx.fillStyle = 'rgba(246,241,231,.62)'
    ctx.font = '600 20px Inter, sans-serif'
    ls(3.6)
    ctx.fillText(tipo === 'venta' ? 'CONSULTAS Y VISITAS' : 'RESERVAS Y CONSULTAS', P, H - barH + 50)
    ls(0)
    ctx.fillStyle = CREAM
    ctx.font = '600 37px Inter, sans-serif'
    ctx.fillText(contacto || 'WhatsApp 11 0000-0000', P, H - barH + 92)
  }, [imgs, formato, tipo, volanta, titulo, ficha, precio, sufijo, precio2, destacados, contacto])

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

  const hacerPortada = (i: number) => {
    if (i === 0) return
    setImgs((prev) => { const c = [...prev]; const [m] = c.splice(i, 1); c.unshift(m); return c })
    setSrcs((prev) => { const c = [...prev]; const [m] = c.splice(i, 1); c.unshift(m); return c })
  }
  const quitar = (i: number) => {
    setImgs((prev) => prev.filter((_, j) => j !== i))
    setSrcs((prev) => prev.filter((_, j) => j !== i))
  }
  // Suma una foto de la propiedad a la selección (máximo 4)
  const agregar = async (url: string) => {
    if (srcs.length >= 4 || srcs.includes(url)) return
    const img = await cargarImagen(url)
    setSrcs((prev) => (prev.length >= 4 || prev.includes(url) ? prev : [...prev, url]))
    if (img) setImgs((prev) => [...prev, img])
    else setFotosBloqueadas(true)
  }

  /* ---------- UI ---------- */
  const seg = 'px-4 py-2 rounded-lg text-sm font-medium border transition-colors'
  const segOn = 'bg-costa-navy text-white border-costa-navy'
  const segOff = 'bg-white text-costa-gris border-costa-beige hover:border-costa-navy/40'
  const label = 'block text-[11px] font-semibold tracking-wider uppercase text-costa-gris mb-2'
  const input = 'w-full px-3 py-2 border border-costa-beige rounded-lg text-sm text-costa-navy bg-costa-beige-light focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all'

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
                  <div key={s + i} className="relative rounded-lg overflow-hidden group" style={{ paddingTop: '92%' }}>
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s})` }} />
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
                ))}
              </div>
            )}

            {fotosDisponibles.length > 0 && (
              <div className="mt-3 border-t border-costa-beige pt-3">
                <p className="text-[11px] text-costa-gris mb-2">
                  {srcs.length >= 4
                    ? 'Ya hay 4 fotos en la pieza. Quitá alguna (×) para poder sumar otra.'
                    : 'Más fotos de la propiedad — tocá para sumarlas (máximo 4):'}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {fotosDisponibles.map((u, i) => (
                    <button
                      key={u + i}
                      onClick={() => agregar(u)}
                      disabled={srcs.length >= 4}
                      title={srcs.length >= 4 ? 'Máximo 4 fotos' : 'Agregar a la pieza'}
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

          {/* Campos */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
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
              <label className={label}>Destacados (separá con · )</label>
              <textarea className={input} rows={3} value={destacados} onChange={(e) => setDestacados(e.target.value)} />
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
