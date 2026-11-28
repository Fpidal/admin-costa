'use client'

// Página pública (sin login): presenta Costa Esmeralda y las propiedades
// publicadas. Las fechas se eligen en la sección de propiedades y cada casa
// muestra si está libre y el total con sus precios (Casas → Precios alquileres).

import MapaComoLlegar from '@/components/MapaComoLlegar'
import CalendarioRango from '@/components/CalendarioRango'
import './publica.css'
import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { datosUtiles } from '@/lib/datosUtiles'
import { supabasePublico as supabase } from '@/lib/supabase'
import { demoPropiedades, demoReservas } from '@/lib/demoData'
import { useLanguage } from '@/hooks/useLanguage'
import { precioEstadia, normalizarReglas, COLUMNAS_REGLAS, FERIADO_LARGO } from '@/lib/preciosReglas'
import type { PriceRule } from '@/lib/priceRules'

interface Propiedad {
  id: string | number
  nombre: string
  lote: string | null
  referencia: string | null
  telefono_contacto: string | null
  capacidad: number
  habitaciones: number
  banos: number
  plantas: number | null
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
  metros_cubiertos: number | null
  metros_lote: number | null
  descripcion: string | null
  imagenes: string[] | null
  imagen_url: string | null
}
interface Reserva { propiedad_id: string | number; fecha_inicio: string; fecha_fin: string; estado: string }

// ---------- Textos ES / EN ----------
const TX = {
  es: {
    marcaSub: 'Directo con los dueños', nav: ['Propiedades', 'El barrio', 'Cómo llegar', 'Cómo reservar', 'Datos útiles'], acceso: 'Acceso dueños',
    over: 'Costa Esmeralda · Buenos Aires', h1a: 'Casas para tus vacaciones, entre ', h1b: 'pinos', h1c: ' y mar.',
    sub: 'Alquileres temporarios en Costa Esmeralda, administrados directamente por sus dueños. Propiedades seleccionadas, equipadas y con atención personal de principio a fin.',
    hechos: [['Playa amplia', 'sin edificios'], ['Bosque y médanos', 'calles de arena'], ['Barrio cerrado', 'seguridad 24 h'], ['Golf y deportes', 'dentro del barrio'], ['A 380 km de CABA', 'por Ruta 2 y 11'], ['Trato directo', 'sin comisiones']],
    cta: 'Ver propiedades y precios', cta2: 'Conocer el barrio', pie: 'La playa de Costa Esmeralda',
    props: 'Propiedades', elegi: 'Elegí tu casa', llegada: 'Llegada', salida: 'Salida', personas: 'Personas', barrio: 'Barrio', todos: 'Todos',
    verPrecios: 'Ver precios', limpiar: 'Limpiar', vacio: 'No hay propiedades para esa búsqueda.',
    personasC: 'personas', dormC: 'dormitorios', banosC: 'baños', m2C: 'm² cubiertos',
    desde: 'Desde', porNoche: '/ noche', noches: (n: number) => `${n} noche${n !== 1 ? 's' : ''} en tus fechas`, consultaPrecio: 'Consultá el precio',
    libre: (a: string, b: string) => `Libre del ${a} al ${b}`, ocupada: 'Ocupada algunas noches · consultanos', elegiFechas: 'Elegí fechas para ver el total',
    capacidad: (n: number) => `Hasta ${n} personas`, consultar: 'Consultar', verFicha: 'Ver ficha completa', compartir: 'Compartir', copiado: 'Link copiado',
    lote: 'Lote', plantas: 'plantas',
    barrioTit: 'Todo lo que tiene Costa Esmeralda', barrioSub: 'Un barrio cerrado frente al mar donde las vacaciones se resuelven adentro: playa, deporte, compras y naturaleza, sin usar el auto.',
    amen: [['Playa con paradores', 'Kilómetros de costa y guardavidas'], ['Golf', 'Cancha propia dentro del barrio'], ['Club hípico', 'Cabalgatas y equitación'], ['Tenis y pádel', 'Canchas en la zona deportiva'], ['Club house', 'Restaurante y encuentro'], ['Área comercial', 'Proveeduría, cafés y servicios'], ['Bicisendas y senderos', 'Para recorrer el bosque'], ['Seguridad 24 h', 'Acceso controlado y vigilancia']],
    llegarOver: 'Cómo llegar', llegarTit: 'A unas 4 horas de Buenos Aires',
    ruta: [['Ruta 2 hacia la costa', 'Desde CABA, autopista hasta pasar Dolores.'], ['Ruta 11 (Interbalnearia)', 'Hacia el sur, pasando Mar de Ajó.'], ['Entrada a Costa Esmeralda', 'Sobre la Ruta 11, al norte de Pinamar. Al confirmar te mandamos la ubicación exacta de la casa.']],
    abrirMaps: 'Abrir en Google Maps',
    reservarOver: 'Cómo reservar', reservarTit: 'Tu reserva, paso a paso',
    pasos: [['Consultá disponibilidad', 'Elegí tu casa y escribile al propietario por WhatsApp con las fechas y la cantidad de huéspedes.'], ['Confirmá con el 50 %', 'Una vez acordadas las condiciones, abonás el 50 % por transferencia y recibís la confirmación de tu reserva por escrito.'], ['Completá el pago', 'Abonás el saldo al menos 15 días antes del ingreso y coordinás con el propietario los detalles de tu llegada.']],
    footer: 'Alquileres temporarios administrados por sus dueños — Costa Esmeralda, Buenos Aires', respondemos: 'Respondemos en el día',
  },
  en: {
    marcaSub: 'Direct with the owners', nav: ['Homes', 'The area', 'Getting there', 'How to book', 'Useful info'], acceso: 'Owners',
    over: 'Costa Esmeralda · Buenos Aires', h1a: 'Holiday homes between ', h1b: 'pines', h1c: ' and sea.',
    sub: 'Vacation rentals in Costa Esmeralda, managed directly by their owners. Selected, fully equipped homes with personal attention from start to finish.',
    hechos: [['Wide beach', 'no buildings'], ['Forest and dunes', 'sand streets'], ['Gated community', '24 h security'], ['Golf and sports', 'inside the area'], ['380 km from Buenos Aires', 'Routes 2 and 11'], ['Direct deal', 'no fees']],
    cta: 'See homes and prices', cta2: 'About the area', pie: 'The beach at Costa Esmeralda',
    props: 'Homes', elegi: 'Choose your home', llegada: 'Check-in', salida: 'Check-out', personas: 'Guests', barrio: 'Area', todos: 'All',
    verPrecios: 'See prices', limpiar: 'Clear', vacio: 'No homes match your search.',
    personasC: 'guests', dormC: 'bedrooms', banosC: 'bathrooms', m2C: 'm² built',
    desde: 'From', porNoche: '/ night', noches: (n: number) => `${n} night${n !== 1 ? 's' : ''} on your dates`, consultaPrecio: 'Ask for the price',
    libre: (a: string, b: string) => `Available ${a} – ${b}`, ocupada: 'Some nights taken · ask us', elegiFechas: 'Choose dates to see the total',
    capacidad: (n: number) => `Up to ${n} guests`, consultar: 'Ask', verFicha: 'See full details', compartir: 'Share', copiado: 'Link copied',
    lote: 'Lot', plantas: 'floors',
    barrioTit: 'Everything Costa Esmeralda offers', barrioSub: 'A gated beachfront community where holidays happen inside: beach, sports, shops and nature, no car needed.',
    amen: [['Beach clubs', 'Miles of coast and lifeguards'], ['Golf', 'Its own course'], ['Riding club', 'Horse rides and lessons'], ['Tennis and padel', 'Courts in the sports area'], ['Club house', 'Restaurant and meeting point'], ['Shopping area', 'Grocery, cafés and services'], ['Bike paths and trails', 'Through the forest'], ['24 h security', 'Controlled access']],
    llegarOver: 'Getting there', llegarTit: 'About 4 hours from Buenos Aires',
    ruta: [['Route 2 to the coast', 'From Buenos Aires, highway past Dolores.'], ['Route 11 (Interbalnearia)', 'South, past Mar de Ajó.'], ['Costa Esmeralda entrance', 'On Route 11, north of Pinamar. We send the exact location once booked.']],
    abrirMaps: 'Open in Google Maps',
    reservarOver: 'How to book', reservarTit: 'Your booking, step by step',
    pasos: [['Check availability', 'Choose your house and message the owner on WhatsApp with your dates and number of guests.'], ['Confirm with 50 %', 'Once the terms are agreed, you pay 50 % by bank transfer and receive your booking confirmation in writing.'], ['Complete the payment', 'You pay the balance at least 15 days before check-in and arrange the details of your arrival with the owner.']],
    footer: 'Vacation rentals managed by their owners — Costa Esmeralda, Buenos Aires', respondemos: 'We reply the same day',
  },
}

const fotosDe = (p: Propiedad) => (p.imagenes?.length ? p.imagenes : p.imagen_url ? [p.imagen_url] : [])
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const fmt = (n: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n))
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Teléfono para WhatsApp: solo números y con 54 adelante
function telWA(tel: string | null | undefined) {
  if (!tel) return '541160473922'
  let t = tel.replace(/[\s\-+()]/g, '')
  if (t.startsWith('0')) t = t.slice(1)
  if (!t.startsWith('54')) t = '54' + t
  return t
}

function amenitiesDe(p: Propiedad, en: boolean): [string, boolean][] {
  const L = (es: string, i: string) => (en ? i : es)
  const lista: [string, boolean][] = []
  if (p.pileta_climatizada) lista.push([L('Pileta climatizada', 'Heated pool'), true])
  else if (p.pileta) lista.push([L('Pileta', 'Pool'), true])
  if (p.aire_acondicionado) lista.push([L('Aire acondicionado', 'Air conditioning'), true])
  if (p.grupo_electrogeno) lista.push([L('Grupo electrógeno', 'Power generator'), true])
  if (p.calefaccion) lista.push([L('Calefacción', 'Heating'), false])
  if (p.parrilla) lista.push([L('Parrilla', 'Grill'), false])
  if (p.fogonero) lista.push([L('Fogonero', 'Fire pit'), false])
  if (p.wifi) lista.push(['WiFi', false])
  if (p.lavadero) lista.push([L('Lavadero', 'Laundry'), false])
  if (p.lavavajillas) lista.push([L('Lavavajillas', 'Dishwasher'), false])
  if (p.cochera) lista.push([L('Cochera', 'Garage'), false])
  if (p.metros_lote) lista.push([`${L('Lote', 'Lot')} ${fmt(p.metros_lote)} m²`, false])
  return lista
}

const IcoWA = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" /></svg>
)

const ICONOS_HECHOS = [
  'M2 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M2 21c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0',
  'M12 2 6 11h3l-4 6h14l-4-6h3zM12 17v5',
  'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zm-3 9 2 2 4-4',
  'M7 21V4l9 4-9 4',
  'M4 20 10 4l4 8 6-4-4 12z',
  'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
]
const ICONOS_BARRIO = [
  'M2 18c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M6 15V8h12v7M4 8h16L12 3z',
  'M8 21V3l9 4-9 4M5 21h14',
  'M5 20c0-6 3-9 7-10l2-5 2 3 3 1-2 3c-1 3-2 5-5 8M9 20h8',
  'M9 4a5 5 0 1 0 0 10A5 5 0 0 0 9 4zm3.5 8.5 7 7',
  'M3 21h18M5 21V10l7-6 7 6v11M10 21v-6h4v6',
  'M4 7h16l-1 13H5zM9 7a3 3 0 0 1 6 0',
  'M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 17l4-7h5l3 7M10 10 9 7H7',
  'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
]

function LandingContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { language, toggleLanguage } = useLanguage()
  const en = language === 'en'
  const t = en ? TX.en : TX.es
  const du = datosUtiles(en)

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [reglas, setReglas] = useState<PriceRule[]>([])
  const [cargando, setCargando] = useState(true)
  const [llegada, setLlegada] = useState('')
  const [salida, setSalida] = useState('')
  const [personas, setPersonas] = useState(2)
  const [barrio, setBarrio] = useState('')
  const [fotoIdx, setFotoIdx] = useState<Record<string, number>>({})
  const [ficha, setFicha] = useState<Propiedad | null>(null)
  const [fichaFoto, setFichaFoto] = useState(0)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    async function cargar() {
      if (isDemo) {
        setPropiedades(demoPropiedades as unknown as Propiedad[])
        setReservas(demoReservas as unknown as Reserva[])
        setCargando(false)
        return
      }
      const [p, r] = await Promise.all([
        supabase.from('propiedades').select('*').neq('publicada', false).is('eliminado_at', null).order('nombre'),
        // Solo casa y fechas ocupadas (función de la base, sin datos del huésped)
        supabase.rpc('ocupacion_publica'),
      ])
      const props = (p.data || []) as Propiedad[]
      setPropiedades(props)
      setReservas(((r.data || []) as Omit<Reserva, 'estado'>[]).map(x => ({ ...x, estado: 'ocupada' })))
      if (props.length) {
        const { data } = await supabase.from('price_rules').select(COLUMNAS_REGLAS).in('property_id', props.map(x => x.id)).gte('end_date', hoyISO())
        setReglas(normalizarReglas(data || []))
      }
      setCargando(false)
    }
    cargar()
  }, [isDemo])

  // Link compartido (/casa/[id] → /?casa=id): abrir la ficha de esa casa
  const casaCompartida = searchParams.get('casa')
  useEffect(() => {
    if (!casaCompartida || !propiedades.length) return
    const p = propiedades.find(x => String(x.id) === casaCompartida)
    if (p) { setFicha(p); setFichaFoto(0) }
  }, [casaCompartida, propiedades])

  useEffect(() => {
    if (!ficha) return
    const cerrar = (e: KeyboardEvent) => { if (e.key === 'Escape') setFicha(null) }
    document.addEventListener('keydown', cerrar)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', cerrar); document.body.style.overflow = '' }
  }, [ficha])

  const barrios = useMemo(() => [...new Set(propiedades.map(p => p.nombre))].sort(), [propiedades])
  const hayFechas = !!llegada && !!salida && salida > llegada

  const tarjetas = useMemo(() => propiedades
    .filter(p => !barrio || p.nombre === barrio)
    .map(p => {
      const propias = reglas.filter(r => String(r.property_id) === String(p.id))
      // "Desde": el precio más bajo cargado de acá en adelante (sin el de fines de semana largos)
      const precios = propias.filter(r => r.active && !r.applies_to_days?.includes(FERIADO_LARGO)).map(r => r.price_per_night)
      const desde = precios.length ? Math.min(...precios) : 0
      const est = hayFechas ? precioEstadia(llegada, salida, propias) : null
      const ocupada = hayFechas && reservas.some(r => String(r.propiedad_id) === String(p.id) && r.fecha_inicio < salida && r.fecha_fin > llegada)
      return { p, desde, est, ocupada, entra: (p.capacidad || 0) >= personas }
    })
    .sort((a, b) => Number(b.entra) - Number(a.entra) || Number(a.ocupada) - Number(b.ocupada)),
  [propiedades, reglas, reservas, barrio, llegada, salida, hayFechas, personas])

  const conPrecio = tarjetas.map(x => x.desde).filter(Boolean)
  const desdeGeneral = conPrecio.length ? Math.min(...conPrecio) : 0

  // "Hola, consulto por Deportiva 1 para 8 personas del 03/01 al 10/01"
  function mensaje(p: Propiedad) {
    const fechas = hayFechas ? (en ? ` from ${dm(llegada)} to ${dm(salida)}` : ` del ${dm(llegada)} al ${dm(salida)}`) : ''
    return en
      ? `Hi, I'm asking about ${p.nombre} for ${personas} ${personas !== 1 ? 'people' : 'person'}${fechas}`
      : `Hola, consulto por ${p.nombre} para ${personas} ${personas !== 1 ? 'personas' : 'persona'}${fechas}`
  }
  const linkWA = (p: Propiedad) => `https://wa.me/${telWA(p.telefono_contacto)}?text=${encodeURIComponent(mensaje(p))}`

  function moverFoto(id: string, total: number, d: number) {
    setFotoIdx(prev => ({ ...prev, [id]: ((prev[id] || 0) + d + total) % total }))
  }

  async function compartir(p: Propiedad) {
    const url = `${window.location.origin}/casa/${p.id}`
    if (navigator.share) { try { await navigator.share({ title: p.nombre, url }) } catch { /* cancelado */ } return }
    await navigator.clipboard.writeText(url)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  const primera = propiedades[0]

  return (
    <div className="pub">
      <header><div className="wrap">
        <Link className="marca" href={isDemo ? '/?demo=true' : '/'} aria-label="Costa Directo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/marca/costa-directo-horizontal-con-bajada-color.svg" alt="Costa Directo" /></Link>
        <nav className="hnav">{['#casas', '#barrio', '#llegar', '#reservar', '#datos'].map((h, i) => <a key={h} href={h}>{t.nav[i]}</a>)}</nav>
        <div className="hder">
          <button type="button" onClick={toggleLanguage} aria-label="Idioma">{en ? <>ES / <b>EN</b></> : <><b>ES</b> / EN</>}</button>
        </div>
      </div></header>

      <main>
        {/* Portada: todo a la vista sin bajar */}
        <section className="wrap hero">
          <div className="intro">
            <div className="over">{t.over}</div>
            <h1>{t.h1a}<em>{t.h1b}</em>{t.h1c}</h1>
            <p className="sub">{t.sub}</p>
            <ul className="hechos">
              {t.hechos.map(([b, s], i) => (
                <li key={b}><svg className="ico" viewBox="0 0 24 24"><path d={ICONOS_HECHOS[i]} /></svg><span><b>{b}</b>{s}</span></li>
              ))}
            </ul>
            <div className="ctas"><a className="cta" href="#casas">{t.cta}</a><a className="cta2" href="#barrio">{t.cta2}</a></div>
          </div>
          <div className="portada">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portada.jpg" alt={t.pie} />
            <div className="pie">{t.pie}</div>
          </div>
        </section>

        {/* Propiedades: fechas arriba, cada casa con su precio y disponibilidad */}
        <section className="hoja-casas" id="casas">
          <div className="wrap">
            <div className="cab-casas">
              <div><div className="over">{t.props}</div><h2>{t.elegi}</h2></div>
              <form className={`buscador ${barrios.length > 1 ? 'con-barrio' : ''}`} onSubmit={e => e.preventDefault()}>
                <CalendarioRango llegada={llegada} salida={salida} en={en} onCambio={(a, b) => { setLlegada(a); setSalida(b) }} />
                <div className="c"><label htmlFor="per">{t.personas}</label>
                  <select id="per" value={personas} onChange={e => setPersonas(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => <option key={n} value={n}>{n}</option>)}
                  </select></div>
                {barrios.length > 1 && (
                  <div className="c"><label htmlFor="bar">{t.barrio}</label>
                    <select id="bar" value={barrio} onChange={e => setBarrio(e.target.value)}>
                      <option value="">{t.todos}</option>
                      {barrios.map(b => <option key={b} value={b}>{b}</option>)}
                    </select></div>
                )}
                {(llegada || salida || barrio)
                  ? <button type="button" className="limpiar" onClick={() => { setLlegada(''); setSalida(''); setBarrio('') }}>{t.limpiar}</button>
                  : <button type="submit">{t.verPrecios}</button>}
              </form>
            </div>

            <div className="casas">
              {!cargando && tarjetas.length === 0 && <p className="vacio">{t.vacio}</p>}
              {tarjetas.map(({ p, desde, est, ocupada, entra }) => {
                const fotos = fotosDe(p)
                const id = String(p.id)
                const idx = fotoIdx[id] || 0
                const amen = amenitiesDe(p, en)
                return (
                  <article className="casa" key={id} style={entra ? undefined : { opacity: .55 }}>
                    <div className="gal">
                      {fotos.length > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="grande" src={fotos[idx]} alt={p.nombre} onClick={() => { setFicha(p); setFichaFoto(idx) }} />
                      )}
                      {p.lote && <span className="etq">{t.lote} {p.lote}</span>}
                      {fotos.length > 1 && <>
                        <button type="button" className="flecha izq" aria-label="Foto anterior" onClick={() => moverFoto(id, fotos.length, -1)}>‹</button>
                        <button type="button" className="flecha der" aria-label="Foto siguiente" onClick={() => moverFoto(id, fotos.length, 1)}>›</button>
                        <div className="puntos">{fotos.slice(0, 8).map((_, j) => <i key={j} className={j === idx ? 'on' : ''} />)}</div>
                      </>}
                    </div>
                    <div className="cuerpo">
                      <div className="fila1"><h3>{p.nombre}</h3>
                        <button type="button" className="num" style={{ border: 0, background: 'none', cursor: 'pointer' }} onClick={() => { setFicha(p); setFichaFoto(0) }}>{t.verFicha} →</button></div>
                      <p className="lead">{[p.referencia, p.plantas ? `${p.plantas} ${t.plantas}` : '', p.metros_lote ? `${t.lote} ${fmt(p.metros_lote)} m²` : ''].filter(Boolean).join(' · ')}</p>
                      <div className="cifras">
                        <div><b>{p.capacidad}</b><span>{t.personasC}</span></div>
                        <div><b>{p.habitaciones}</b><span>{t.dormC}</span></div>
                        <div><b>{p.banos}{p.toilette ? ' + 1' : ''}</b><span>{t.banosC}</span></div>
                        <div><b>{p.metros_cubiertos || '—'}</b><span>{t.m2C}</span></div>
                      </div>
                      <div className="amen">{amen.map(([txt, top]) => <span key={txt} className={top ? 'top' : ''}>{txt}</span>)}</div>
                      <div className="abajo">
                        <div className="precio">
                          <div className="m">{desde ? <><small>{t.desde}</small> U$D {fmt(desde)} <small>{t.porNoche}</small></> : <small>{t.consultaPrecio}</small>}</div>
                          {est && (est.completo || desde > 0) && <div className="t">{t.noches(est.noches)}<b>{est.completo ? `U$D ${fmt(est.total)}` : t.consultaPrecio}</b></div>}
                        </div>
                        <div className="cierre">
                          <div className={`disp ${!hayFechas ? '' : ocupada ? 'no' : 'si'}`}><i />
                            {!entra ? t.capacidad(p.capacidad) : !hayFechas ? t.elegiFechas : ocupada ? t.ocupada : t.libre(dm(llegada), dm(salida))}
                          </div>
                          <a className="wa" href={linkWA(p)} target="_blank" rel="noopener noreferrer"><IcoWA />{t.consultar}</a>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* El barrio */}
        <section className="sec barrio" id="barrio">
          <div className="wrap">
            <div className="sec-tit"><div><div className="over">{t.nav[1]}</div><h2>{t.barrioTit}</h2></div><p>{t.barrioSub}</p></div>
            <div className="amenities">
              {t.amen.map(([b, s], i) => (
                <div key={b}><svg viewBox="0 0 24 24"><path d={ICONOS_BARRIO[i]} /></svg><b>{b}</b><span>{s}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo llegar */}
        <section className="sec" id="llegar">
          <div className="wrap mapa-grid">
            <div className="mapa">
              <MapaComoLlegar en={en} />
            </div>
            <div>
              <div className="over">{t.llegarOver}</div>
              <h2 style={{ fontSize: 42, margin: '10px 0 18px' }}>{t.llegarTit}</h2>
              <ol className="ruta">{t.ruta.map(([b, s]) => <li key={b}><span><b>{b}</b>{s}</span></li>)}</ol>
              <a className="btn2" href="https://www.google.com/maps/dir/?api=1&destination=Costa+Esmeralda,+Ruta+11+km+380,+Buenos+Aires,+Argentina&travelmode=driving" target="_blank" rel="noopener noreferrer">{t.abrirMaps}</a>
            </div>
          </div>
        </section>

        {/* Cómo reservar */}
        <section className="sec" id="reservar" style={{ background: 'var(--papel2)' }}>
          <div className="wrap">
            <div className="sec-tit"><div><div className="over">{t.reservarOver}</div><h2>{t.reservarTit}</h2></div></div>
            <div className="pasos">{t.pasos.map(([b, s], i) => <div key={b}><div className="n">{i + 1}</div><h4>{b}</h4><p>{s}</p></div>)}</div>
          </div>
        </section>

        {/* Datos útiles: teléfonos del barrio y de Pinamar */}
        <section className="sec datos" id="datos">
          <div className="wrap">
            <div className="sec-tit"><div><div className="over">{du.over}</div><h2>{du.titulo}</h2></div><p>{du.sub}</p></div>
            <div className="tel-grupos">
              {du.telefonos.map(g => (
                <div key={g.titulo}>
                  <h4>{g.titulo}</h4>
                  <ul>{g.items.map(it => (
                    <li key={it.nombre}><span><b>{it.nombre}</b>{it.nota && <small>{it.nota}</small>}</span><a href={`tel:${it.tel}`}>{it.numero}</a></li>
                  ))}</ul>
                </div>
              ))}
            </div>
            <h4 className="consejos-tit">{du.consejosTit}</h4>
            <div className="consejos">{du.consejos.map(([b, s]) => <div key={b}><b>{b}</b><p>{s}</p></div>)}</div>
            <p className="fuente">{du.fuente}</p>
          </div>
        </section>
      </main>

      <footer><div className="wrap">
        <div><div className="marca-f">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/marca/costa-directo-horizontal-con-bajada-negativo.svg" alt="Costa Directo" /></div>{t.footer}</div>
        <div><Link href="/admin">{t.acceso}</Link></div>
      </div></footer>

      {/* Celular: WhatsApp siempre a mano */}
      {primera && (
        <div className="barra-wa">
          <div className="t"><b>{desdeGeneral ? `${en ? 'From' : 'Desde'} U$D ${fmt(desdeGeneral)} / ${en ? 'night' : 'noche'}` : 'Costa Esmeralda'}</b>{t.respondemos}</div>
          <a className="wa" href={linkWA(primera)} target="_blank" rel="noopener noreferrer"><IcoWA />{t.consultar}</a>
        </div>
      )}

      {/* Ficha completa de una casa */}
      {ficha && (() => {
        const fotos = fotosDe(ficha)
        const tj = tarjetas.find(x => String(x.p.id) === String(ficha.id))
        return (
          <div className="ficha-fondo" onClick={() => setFicha(null)}>
            <div className="ficha" onClick={e => e.stopPropagation()} role="dialog" aria-label={ficha.nombre} style={{ position: 'relative' }}>
              <button type="button" className="cerrar" onClick={() => setFicha(null)} aria-label="Cerrar">×</button>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="gal" style={{ flex: 1 }}>
                  {fotos.length > 0 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="grande" src={fotos[fichaFoto]} alt={ficha.nombre} />
                  )}
                  {fotos.length > 1 && <>
                    <button type="button" className="flecha izq" aria-label="Foto anterior" onClick={() => setFichaFoto((fichaFoto - 1 + fotos.length) % fotos.length)}>‹</button>
                    <button type="button" className="flecha der" aria-label="Foto siguiente" onClick={() => setFichaFoto((fichaFoto + 1) % fotos.length)}>›</button>
                  </>}
                </div>
                {fotos.length > 1 && (
                  <div className="miniaturas">
                    {fotos.map((f, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f + j} src={f} alt="" className={j === fichaFoto ? 'on' : ''} onClick={() => setFichaFoto(j)} />
                    ))}
                  </div>
                )}
              </div>
              <div className="datos">
                <div>
                  {ficha.lote && <div className="num">{t.lote} {ficha.lote}</div>}
                  <h3 style={{ fontSize: 34 }}>{ficha.nombre}</h3>
                </div>
                <div className="cifras">
                  <div><b>{ficha.capacidad}</b><span>{t.personasC}</span></div>
                  <div><b>{ficha.habitaciones}</b><span>{t.dormC}</span></div>
                  <div><b>{ficha.banos}{ficha.toilette ? ' + 1' : ''}</b><span>{t.banosC}</span></div>
                  <div><b>{ficha.metros_cubiertos || '—'}</b><span>{t.m2C}</span></div>
                </div>
                <div className="amen" style={{ margin: 0 }}>{amenitiesDe(ficha, en).map(([txt, top]) => <span key={txt} className={top ? 'top' : ''}>{txt}</span>)}</div>
                {ficha.descripcion && <div className="desc">{ficha.descripcion}</div>}
                {tj && (
                  <div className="precio">
                    <div className="m">{tj.desde ? <><small>{t.desde}</small> U$D {fmt(tj.desde)} <small>{t.porNoche}</small></> : <small>{t.consultaPrecio}</small>}</div>
                    {tj.est && <div className="t">{t.noches(tj.est.noches)}<b>{tj.est.completo ? `U$D ${fmt(tj.est.total)}` : t.consultaPrecio}</b></div>}
                  </div>
                )}
                <div className="acciones">
                  <a className="wa" style={{ flex: 1 }} href={linkWA(ficha)} target="_blank" rel="noopener noreferrer"><IcoWA />{t.consultar}</a>
                  <button type="button" onClick={() => compartir(ficha)}>{copiado ? t.copiado : t.compartir}</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#faf6ef' }} />}>
      <LandingContent />
    </Suspense>
  )
}
