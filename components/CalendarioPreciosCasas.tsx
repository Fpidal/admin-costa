'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generarFeriadosAnio } from '@/lib/calendarioArgentina'
import { FERIADO_LARGO, precioDelDia, diasFeriadoLargo } from '@/lib/preciosReglas'
import type { PriceRule } from '@/lib/priceRules'
import { demoReservas } from '@/lib/demoData'

// Calendario de precios de todas las casas a la vez (o de una sola): cada día
// muestra el precio por noche que sale de las reglas de precios, o si ya está
// reservado. A la derecha, los tramos con su precio por casa (editables) y un
// atajo para ponerle precio especial a un rango de días.

interface Casa { id: string | number; nombre: string; lote?: string | null }
interface ReservaCal { propiedad_id: string | number; fecha_inicio: string; fecha_fin: string; estado: string; precio_noche?: number | null; moneda?: string | null }

interface Props {
  casas: Casa[]
  userId?: string | null
  isDemo: boolean
  casaInicial?: string | null
  /** Se llama después de guardar algo, para que la página recargue lo suyo */
  onCambio?: () => void
  /** Cambia cuando otra parte de la página guardó reglas: fuerza recarga */
  version?: number
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
// Escala de un solo verde: más oscuro, más caro
const NIVELES = ['bg-[#f3f8f6]', 'bg-[#dcebe6]', 'bg-[#b9d7ce]', 'bg-[#8fbfb1]']

const pad = (n: number) => String(n).padStart(2, '0')
const isoDe = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const hoyISO = () => { const h = new Date(); return isoDe(h.getFullYear(), h.getMonth(), h.getDate()) }
const corto = (c: Casa) => { const w = c.nombre.trim().split(/\s+/)[0]; return w.length <= 5 ? w : w.slice(0, 3) + '.' }

// Orden fijo de la tabla de tramos, según el nombre
function ordenTramo(nombre: string): number {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('fiesta')) return 0
  if (n.includes('alta') || n.includes('enero')) return 1
  if (n.includes('feb') && /(1|primera)/.test(n)) return 2
  if (n.includes('feb') && /(2|segunda)/.test(n)) return 3
  if (n.includes('feb')) return 3.5
  if (n.includes('santa')) return 4
  if (n.includes('carnaval')) return 5
  if (n.includes('baja')) return 7
  if (n.includes('feriado') || n.includes('fds') || n.includes('finde') || n.includes('fin de semana') || n.includes('largo')) return 6
  return 6.5
}

export function CalendarioPreciosCasas({ casas, userId, isDemo, casaInicial, onCambio, version = 0 }: Props) {
  const hoy = hoyISO()
  const [verCasa, setVerCasa] = useState<string>(casaInicial || 'todas')
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)))
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)) - 1)
  const [marcado, setMarcado] = useState<string | null>(null)
  const [reglas, setReglas] = useState<PriceRule[]>([])
  const [reservas, setReservas] = useState<ReservaCal[]>([])
  const [cargando, setCargando] = useState(true)
  const [selA, setSelA] = useState<string | null>(null)
  const [selB, setSelB] = useState<string | null>(null)
  const [preciosRango, setPreciosRango] = useState<Record<string, string>>({})
  const [nombreTramo, setNombreTramo] = useState('')
  const [soloFeriados, setSoloFeriados] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')

  const ids = useMemo(() => casas.map(c => String(c.id)), [casas])

  const cargar = useCallback(async () => {
    if (ids.length === 0) { setCargando(false); return }
    if (isDemo) {
      // Precios de ejemplo para que la demo muestre el calendario lleno
      const y = Number(hoy.slice(0, 4))
      const tramosDemo: [string, string, string, number][] = [
        ['Fuera de temporada', `${y}-01-01`, `${y + 1}-12-31`, 0.5], ['Fiestas', `${y}-12-23`, `${y + 1}-01-02`, 1.2],
        ['Enero', `${y + 1}-01-03`, `${y + 1}-01-31`, 1], ['Febrero', `${y + 1}-02-01`, `${y + 1}-02-20`, 0.85],
      ]
      setReglas(ids.flatMap((id, i) => tramosDemo.map(([name, d, h, f], k) => ({
        id: `demo-${i}-${k}`, property_id: id, name, category: 'alta' as const, price_per_night: Math.round((400 - i * 90) * f),
        start_date: d, end_date: h, applies_to_days: [], min_nights: null, priority: k === 0 ? 1 : 3, active: true,
      }))))
      setReservas(demoReservas as ReservaCal[])
      setCargando(false)
      return
    }
    setCargando(true)
    const desde = `${Number(hoy.slice(0, 4)) - 2}-01-01`
    const [rr, rs] = await Promise.all([
      supabase.from('price_rules').select('*').in('property_id', ids),
      supabase.from('reservas').select('propiedad_id, fecha_inicio, fecha_fin, estado, precio_noche, moneda')
        .in('propiedad_id', ids).in('estado', ['confirmada', 'pendiente', 'cerrada'])
        .is('eliminado_at', null).gte('fecha_fin', desde),
    ])
    setReglas(((rr.data || []) as PriceRule[]).map(r => ({ ...r, price_per_night: Number(r.price_per_night), applies_to_days: r.applies_to_days || [] })))
    setReservas((rs.data || []) as ReservaCal[])
    setCargando(false)
  }, [ids, isDemo, hoy])

  useEffect(() => { cargar() }, [cargar, version])

  const casasVisibles = verCasa === 'todas' ? casas : casas.filter(c => String(c.id) === verCasa)
  const una = casasVisibles.length === 1

  // Escala de precios: de lo más barato a lo más caro de las casas visibles
  const [pMin, pMax] = useMemo(() => {
    const ps = reglas.filter(r => r.active && casasVisibles.some(c => String(c.id) === r.property_id)).map(r => r.price_per_night)
    return ps.length ? [Math.min(...ps), Math.max(...ps)] : [0, 0]
  }, [reglas, casasVisibles])
  const nivel = (p: number) => (pMax === pMin ? 1 : Math.min(3, Math.floor(((p - pMin) / (pMax - pMin)) * 4)))

  const feriados = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const y of [anio - 1, anio, anio + 1]) generarFeriadosAnio(y).forEach(f => mapa.set(f.fecha, f.nombre))
    return mapa
  }, [anio])

  const feriadosLargos = useMemo(() => diasFeriadoLargo([anio - 1, anio, anio + 1]), [anio])

  const estadoDe = (casaId: string, iso: string) => {
    const r = reservas.find(x => String(x.propiedad_id) === casaId && iso >= x.fecha_inicio && iso < x.fecha_fin)
    return r ? (r.estado === 'pendiente' ? 'pend' : 'res') : null
  }

  // Tabla de tramos fija: no depende del mes que se mira. Una fila por tipo de
  // tramo (Fiestas, Enero, Carnaval…) y, por casa, el precio vigente o el próximo.
  const tramos = useMemo(() => {
    const claveDe = (r: PriceRule) => {
      if (r.applies_to_days?.includes(FERIADO_LARGO)) return 'feriado_largo'
      const o = ordenTramo(r.name)
      const dias = [...(r.applies_to_days || [])].sort().join(',')
      return o === 6.5 ? `otro:${r.name.toLowerCase().trim()}|${dias}` : `cat:${o}|${dias}`
    }
    const grupos = new Map<string, PriceRule[]>()
    reglas.forEach(r => { const k = claveDe(r); grupos.set(k, [...(grupos.get(k) || []), r]) })
    const elegir = (rs: PriceRule[]) => {
      const vigentes = rs.filter(r => r.end_date >= hoy).sort((a, b) => a.start_date.localeCompare(b.start_date))
      return vigentes[0] || [...rs].sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
    }
    return [...grupos.values()].map(rs => {
      const porCasa: Record<string, PriceRule> = {}
      casas.forEach(c => {
        const propias = rs.filter(r => r.property_id === String(c.id))
        if (propias.length) porCasa[String(c.id)] = elegir(propias)
      })
      const ref = elegir(Object.values(porCasa))
      const nombre = Object.values(porCasa).map(r => r.name).sort((a, b) => a.length - b.length)[0]
      return { nombre, desde: ref.start_date, hasta: ref.end_date, dias: ref.applies_to_days || [], porCasa }
    }).sort((a, b) => ordenTramo(a.nombre) - ordenTramo(b.nombre) || a.desde.localeCompare(b.desde))
  }, [reglas, casas, hoy])

  // Temporada de una fecha: del 1/12 al 15/03 (incluye Carnaval); fuera de eso, null
  const temporadaDeFecha = (iso: string) => {
    const md = iso.slice(5)
    const y = Number(iso.slice(0, 4))
    if (md >= '12-01') return y
    if (md <= '03-15') return y - 1
    return null
  }
  const porTemporada = useMemo(() => {
    const temps = new Set<number>()
    const filas = new Map<string, { nombre: string; orden: number; valores: Record<string, PriceRule> }>()
    reglas.forEach(r => {
      if (r.applies_to_days?.length) return
      // Solo tramos de verano: los que duran todo el año (temporada baja) no van
      if ((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000 > 100) return
      const t = temporadaDeFecha(r.start_date)
      if (t === null) return
      temps.add(t)
      const orden = ordenTramo(r.name)
      const k = orden === 6.5 ? r.name : String(orden)
      if (!filas.has(k)) filas.set(k, { nombre: r.name, orden, valores: {} })
      const f = filas.get(k)!
      if (r.name.length < f.nombre.length) f.nombre = r.name
      f.valores[`${t}|${r.property_id}`] = r
    })
    // Lo cobrado: promedio por noche de las reservas en dólares de cada temporada
    const suma: Record<string, { total: number; noches: number }> = {}
    reservas.forEach(rv => {
      if (rv.moneda !== 'USD' || !rv.precio_noche) return
      const t = temporadaDeFecha(rv.fecha_inicio)
      if (t === null) return
      temps.add(t)
      const noches = Math.max(1, Math.round((new Date(rv.fecha_fin).getTime() - new Date(rv.fecha_inicio).getTime()) / 86400000))
      const k = `${t}|${rv.propiedad_id}`
      suma[k] = { total: (suma[k]?.total || 0) + Number(rv.precio_noche) * noches, noches: (suma[k]?.noches || 0) + noches }
    })
    const cobrado: Record<string, number> = {}
    Object.entries(suma).forEach(([k, v]) => { cobrado[k] = Math.round(v.total / v.noches) })
    return {
      temporadas: [...temps].sort((a, b) => a - b).slice(-3),
      filas: [...filas.values()].sort((a, b) => a.orden - b.orden),
      cobrado,
    }
  }, [reglas, reservas])

  function irA(iso: string) {
    setAnio(Number(iso.slice(0, 4)))
    setMes(Number(iso.slice(5, 7)) - 1)
    setMarcado(iso)
  }
  function mover(delta: number) {
    const m = mes + delta
    setAnio(anio + Math.floor(m / 12))
    setMes(((m % 12) + 12) % 12)
  }
  function tocarDia(iso: string) {
    if (!selA || selB) { setSelA(iso); setSelB(null) }
    else if (iso < selA) { setSelB(selA); setSelA(iso) }
    else setSelB(iso)
  }

  async function cambiarPrecio(regla: PriceRule, valor: string) {
    const precio = Number(valor)
    if (!regla.id || !precio || precio === regla.price_per_night) return
    setReglas(prev => prev.map(r => (r.id === regla.id ? { ...r, price_per_night: precio } : r)))
    const { error } = await supabase.from('price_rules').update({ price_per_night: precio }).eq('id', regla.id)
    if (error) { setAviso('No se pudo guardar: ' + error.message); cargar() } else { setAviso('Precio guardado'); onCambio?.() }
  }

  // Casillero vacío de un tramo: crea la regla para esa casa copiando el tramo de la otra
  async function agregarPrecio(base: PriceRule, casaId: string, valor: string) {
    const precio = Number(valor)
    if (!precio || !userId) return
    const fila = {
      property_id: casaId, name: base.name, category: base.category, price_per_night: precio,
      start_date: base.start_date, end_date: base.end_date, applies_to_days: base.applies_to_days || [],
      min_nights: base.min_nights, priority: base.priority, active: true, user_id: userId,
    }
    const { error } = await supabase.from('price_rules').insert(fila)
    if (error) { setAviso('No se pudo guardar: ' + error.message); return }
    setAviso('Precio guardado')
    await cargar(); onCambio?.()
  }

  async function quitarTramo(t: { nombre: string; desde: string; hasta: string; porCasa: Record<string, PriceRule> }) {
    const ids = casas.map(c => t.porCasa[String(c.id)]?.id).filter((x): x is string => !!x)
    if (!ids.length) return
    if (!window.confirm(`¿Quitar "${t.nombre}" (${dmy(t.desde)} al ${dmy(t.hasta)})${ids.length > 1 ? ' de las dos casas' : ''}?`)) return
    const { error } = await supabase.from('price_rules').delete().in('id', ids)
    if (error) { setAviso('No se pudo quitar: ' + error.message); return }
    setAviso('Tramo quitado')
    await cargar(); onCambio?.()
  }

  async function aplicarRango() {
    if (!userId || (!soloFeriados && !selA)) return
    // Feriados largos: sin fechas fijas, vale para todo el año de alquiler que se está viendo
    const anioHoy = Number(hoy.slice(0, 4))
    const desde = soloFeriados ? `${anioHoy}-01-01` : selA!
    const hasta = soloFeriados ? `${anioHoy + 5}-12-31` : (selB || selA!)
    const filas = casasVisibles
      .filter(c => Number(preciosRango[String(c.id)]) > 0)
      .map(c => ({
        property_id: String(c.id),
        name: nombreTramo.trim() || (soloFeriados ? 'Feriados largos' : `Tramo ${dm(desde)} al ${dm(hasta)}`),
        category: soloFeriados ? 'media' : 'alta',
        price_per_night: Number(preciosRango[String(c.id)]), start_date: desde, end_date: hasta,
        applies_to_days: soloFeriados ? [FERIADO_LARGO] : [], min_nights: null,
        priority: soloFeriados ? 3 : 5, active: true, user_id: userId,
      }))
    if (!filas.length) { setAviso('Poné el precio de al menos una casa'); return }
    setGuardando(true)
    const { error } = await supabase.from('price_rules').insert(filas)
    setGuardando(false)
    if (error) { setAviso('No se pudo guardar: ' + error.message); return }
    setAviso('Tramo guardado')
    setSelA(null); setSelB(null); setPreciosRango({}); setNombreTramo(''); setSoloFeriados(false)
    await cargar(); onCambio?.()
  }

  const diasMes = new Date(anio, mes + 1, 0).getDate()
  // Semana de lunes a domingo: el lunes va en la primera columna
  const offset = (new Date(anio, mes, 1).getDay() + 6) % 7
  const seg = 'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors'
  const btn = 'h-9 px-3 rounded-lg border border-costa-borde bg-costa-superficie text-xs font-semibold text-costa-esmeralda hover:bg-costa-arena transition-colors'

  return (
    <div className="space-y-4">
      {/* Barra: casas, hoy, buscar fecha */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap rounded-lg border border-costa-borde bg-costa-superficie p-0.5">
          {casas.length > 1 && (
            <button type="button" onClick={() => setVerCasa('todas')}
              className={`${seg} ${verCasa === 'todas' ? 'bg-costa-esmeralda text-white' : 'text-costa-gris hover:text-costa-esmeralda'}`}>
              {casas.length === 2 ? 'Ambas casas' : 'Todas'}
            </button>
          )}
          {casas.map(c => (
            <button key={c.id} type="button" onClick={() => setVerCasa(String(c.id))}
              className={`${seg} ${verCasa === String(c.id) ? 'bg-costa-esmeralda text-white' : 'text-costa-gris hover:text-costa-esmeralda'}`}>
              {c.nombre}{c.lote ? ` · ${c.lote}` : ''}
            </button>
          ))}
        </div>
        <button type="button" className={btn} onClick={() => irA(hoy)}>Hoy</button>
        <input type="date" title="Ir a una fecha" onChange={e => e.target.value && irA(e.target.value)}
          className="h-9 px-2 rounded-lg border border-costa-borde bg-costa-superficie text-xs text-costa-esmeralda" />
      </div>

      {aviso && (
        <p className="text-xs text-costa-esmeralda bg-costa-esmeralda-suave rounded-lg px-3 py-2 flex justify-between gap-2">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso('')} className="font-semibold">Cerrar</button>
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-stretch">
        {/* Calendario */}
        <div className="rounded-2xl border border-costa-borde bg-costa-superficie p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <button type="button" onClick={() => mover(-1)} className="w-8 h-8 rounded-lg border border-costa-borde flex items-center justify-center text-costa-esmeralda hover:bg-costa-arena" aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <h3 className="min-w-[160px] text-center text-lg font-bold text-costa-esmeralda">{MESES[mes]} {anio}</h3>
            <button type="button" onClick={() => mover(1)} className="w-8 h-8 rounded-lg border border-costa-borde flex items-center justify-center text-costa-esmeralda hover:bg-costa-arena" aria-label="Mes siguiente">
              <ChevronRight size={16} />
            </button>
            {cargando && <Loader2 size={16} className="animate-spin text-costa-gris" />}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-costa-gris pb-1">{d}</div>
            ))}
            {Array.from({ length: offset }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: diasMes }).map((_, i) => {
              const d = i + 1
              const iso = isoDe(anio, mes, d)
              const dow = new Date(anio, mes, i + 1).getDay()
              const feriado = feriados.get(iso)
              const enSel = selA && iso >= selA && iso <= (selB || selA)
              return (
                <button type="button" key={iso} onClick={() => tocarDia(iso)} title={feriado || undefined}
                  className={`relative min-h-[64px] sm:min-h-[74px] rounded-lg border p-1 sm:p-1.5 flex flex-col gap-0.5 text-left transition-shadow
                    ${dow === 0 || dow === 6 ? 'bg-[#fcfaf6]' : 'bg-white'}
                    ${iso === hoy ? 'border-costa-esmeralda border-2' : 'border-costa-borde'}
                    ${enSel ? 'ring-2 ring-[#c8692b]' : ''}
                    ${iso === marcado && !enSel ? 'ring-2 ring-[#f2c48d]' : ''}`}>
                  <span className={`flex items-center gap-1 text-[11px] font-bold leading-none rounded
                    ${feriado ? '-mx-0.5 sm:-mx-1 -mt-0.5 sm:-mt-1 px-1 py-1 bg-[#f6e1cf] text-[#8a3f12]' : 'text-costa-esmeralda'}`}>
                    {d}
                    {feriado && <span className="hidden sm:inline truncate text-[9px] font-semibold">{feriado}</span>}
                    {iso === hoy && <span className="ml-auto hidden sm:inline rounded bg-costa-esmeralda px-1 text-[9px] text-white">hoy</span>}
                  </span>
                  {casasVisibles.map(c => {
                    const cid = String(c.id)
                    const est = estadoDe(cid, iso)
                    const regla = precioDelDia(reglas.filter(r => r.property_id === cid), iso, dow, feriadosLargos)
                    const etiqueta = !una && <span className="hidden sm:inline text-[10px] font-medium opacity-70 truncate">{corto(c)}</span>
                    const base = `flex items-center justify-between gap-1 rounded px-1 leading-tight ${una ? 'flex-1 justify-center text-sm py-1' : 'text-[10px] sm:text-[11px] py-0.5'}`
                    if (est === 'res') return <span key={cid} className={`${base} bg-[#e7e2da] text-[#5d625f] font-semibold`}>{etiqueta}<span className="truncate">{una ? <><span className="sm:hidden">Res.</span><span className="hidden sm:inline">Reservada</span></> : 'Res.'}</span></span>
                    if (est === 'pend') return <span key={cid} className={`${base} border border-dashed border-[#a9a297] text-[#5d625f] font-semibold`}>{etiqueta}<span className="truncate">{una ? <><span className="sm:hidden">A conf.</span><span className="hidden sm:inline">Sin confirmar</span></> : 'A conf.'}</span></span>
                    if (!regla) return <span key={cid} className={`${base} text-[#b8b1a6]`}>{etiqueta}<span>—</span></span>
                    return (
                      <span key={cid} className={`${base} ${NIVELES[nivel(regla.price_per_night)]} text-costa-esmeralda font-bold`} title={regla.name}>
                        {etiqueta}<span>{regla.price_per_night}</span>
                      </span>
                    )
                  })}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-costa-gris">
            <span className="flex items-center gap-1.5">U$D por noche
              <span className="inline-flex">{NIVELES.map(n => <i key={n} className={`${n} w-4 h-3 first:rounded-l last:rounded-r`} />)}</span>
              más barato → más caro
            </span>
            <span className="flex items-center gap-1.5"><i className="w-3.5 h-3 rounded bg-[#e7e2da]" />Reservada</span>
            <span className="flex items-center gap-1.5"><i className="w-3.5 h-3 rounded border border-dashed border-[#a9a297]" />Sin confirmar</span>
            <span className="flex items-center gap-1.5"><i className="w-3.5 h-3 rounded bg-[#f6e1cf]" />Feriado</span>
            <span>— sin precio cargado</span>
          </div>
        </div>

        {/* Lateral: tramos y nuevo tramo. En pantalla grande mide lo mismo que el
            calendario y, si no entra, se desplaza adentro */}
        <div className="relative min-h-[420px]">
        <div className="xl:absolute xl:inset-0 xl:overflow-y-auto rounded-2xl border border-costa-borde bg-costa-superficie p-4 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-costa-esmeralda">Precios por tramo</h4>
            <p className="text-xs text-costa-gris mb-2">El precio vigente o el próximo de cada tramo, en U$D por noche. Cambiá el número y se guarda solo; los casilleros punteados no tienen precio todavía.</p>
            {tramos.length === 0 ? (
              <p className="text-xs text-costa-gris py-3">Todavía no hay precios cargados. Agregá un tramo abajo.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-costa-borde text-[10px] uppercase tracking-wider text-costa-gris">
                    <th className="text-left font-semibold py-1">Tramo</th>
                    {casas.map(c => <th key={c.id} className="text-right font-semibold py-1 pl-1">{corto(c)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tramos.map(t => {
                    return (
                      <tr key={`${t.nombre}${t.desde}${t.hasta}`} className="border-b border-[#f1ebe2] last:border-0">
                        <td className="py-1.5 pr-1">
                          <span className="font-semibold text-costa-esmeralda">{t.nombre}</span>
                          <span className="block text-[10px] text-costa-gris">
                            {t.dias.includes(FERIADO_LARGO) ? 'Todos los fines de semana largos, fuera de temporada' : `${dmy(t.desde)} al ${dmy(t.hasta)}${t.dias.length ? ` · solo ${t.dias.join(', ')}` : ''}`}
                          </span>
                          {!isDemo && (
                            <button type="button" onClick={() => quitarTramo(t)} className="text-[10px] text-red-700 hover:underline">Quitar</button>
                          )}
                        </td>
                        {casas.map(c => {
                          const r = t.porCasa[String(c.id)]
                          return (
                            <td key={c.id} className="py-1.5 pl-1 text-right">
                              {r ? (
                                <input type="number" defaultValue={r.price_per_night} key={`${r.id}-${r.price_per_night}`} disabled={isDemo}
                                  onBlur={e => cambiarPrecio(r, e.target.value)}
                                  className="w-16 rounded-md border border-costa-borde bg-white px-1.5 py-1 text-right font-bold text-costa-esmeralda" />
                              ) : (
                                <input type="number" placeholder="—" disabled={isDemo} title="Sin precio: escribilo y se guarda"
                                  onBlur={e => agregarPrecio(Object.values(t.porCasa)[0], String(c.id), e.target.value)}
                                  className="w-16 rounded-md border border-dashed border-[#c8692b] bg-white px-1.5 py-1 text-right font-bold text-costa-esmeralda placeholder:text-[#c8692b]" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-costa-borde pt-3">
            <h4 className="text-sm font-bold text-costa-esmeralda">Nuevo tramo</h4>
            <div className="inline-flex rounded-lg border border-costa-borde bg-white p-0.5 mb-2">
              <button type="button" onClick={() => setSoloFeriados(false)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${!soloFeriados ? 'bg-costa-esmeralda text-white' : 'text-costa-gris'}`}>Con fechas</button>
              <button type="button" onClick={() => setSoloFeriados(true)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${soloFeriados ? 'bg-costa-esmeralda text-white' : 'text-costa-gris'}`}>Fines de semana largos</button>
            </div>
            <p className="text-xs text-costa-gris mb-2">
              {soloFeriados
                ? 'Sin fechas: se aplica solo a cada fin de semana largo fuera de temporada (de marzo a mediados de diciembre), todos los años. Los días salen del panel de feriados.'
                : 'Elegí las fechas acá, o tocá un día y después otro en el calendario. Si se superpone con otro tramo, manda este.'}
            </p>
            <label className="block text-xs text-costa-gris mb-2">Nombre
              <input value={nombreTramo} onChange={e => setNombreTramo(e.target.value)} placeholder={soloFeriados ? "Feriados largos" : "Temporada alta"} disabled={isDemo}
                className="mt-0.5 w-full rounded-md border border-costa-borde bg-white px-2 py-1.5 text-sm text-costa-esmeralda" />
            </label>
            {!soloFeriados && <div className="grid grid-cols-2 gap-2 mb-2">
              <label className="text-xs text-costa-gris">Desde
                <input type="date" value={selA || ''} disabled={isDemo}
                  onChange={e => { const v = e.target.value || null; setSelA(v); if (v && selB && selB < v) setSelB(null) }}
                  className="mt-0.5 w-full rounded-md border border-costa-borde bg-white px-2 py-1.5 text-xs text-costa-esmeralda" />
              </label>
              <label className="text-xs text-costa-gris">Hasta
                <input type="date" value={selB || selA || ''} min={selA || undefined} disabled={isDemo}
                  onChange={e => setSelB(e.target.value || null)}
                  className="mt-0.5 w-full rounded-md border border-costa-borde bg-white px-2 py-1.5 text-xs text-costa-esmeralda" />
              </label>
            </div>}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {casasVisibles.map(c => (
                <label key={c.id} className="text-xs text-costa-gris">
                  {c.nombre}{c.lote ? ` · ${c.lote}` : ''} (U$D)
                  <input type="number" value={preciosRango[String(c.id)] || ''} disabled={isDemo}
                    onChange={e => setPreciosRango(p => ({ ...p, [String(c.id)]: e.target.value }))}
                    className="mt-0.5 w-full rounded-md border border-costa-borde bg-white px-2 py-1.5 text-sm text-costa-esmeralda disabled:opacity-50" />
                </label>
              ))}
            </div>
            <button type="button" onClick={aplicarRango} disabled={(!selA && !soloFeriados) || guardando || isDemo}
              className="w-full h-9 rounded-lg bg-costa-esmeralda text-white text-xs font-semibold hover:bg-costa-esmeralda-light disabled:opacity-50">
              {guardando ? 'Guardando…' : soloFeriados ? 'Guardar precio de fines de semana largos' : selA ? `Aplicar del ${dmy(selA)} al ${dmy(selB || selA)}` : 'Elegí las fechas'}
            </button>
            {selA && (
              <button type="button" onClick={() => { setSelA(null); setSelB(null) }} className="w-full mt-1 text-xs text-costa-gris underline">
                Quitar selección
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Precios por temporada: para comparar cómo fueron cambiando */}
      {porTemporada.temporadas.length > 0 && (
        <div className="rounded-2xl border border-costa-borde bg-costa-superficie p-4 overflow-x-auto">
          <h4 className="text-sm font-bold text-costa-esmeralda">Precios por temporada</h4>
          <p className="text-xs text-costa-gris mb-2">U$D por noche de cada tramo, temporada por temporada (diciembre a febrero). Tocá un número para cambiarlo. Abajo, lo que se cobró en promedio en las reservas.</p>
          <table className="text-xs min-w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-costa-gris">
                <th className="text-left font-semibold py-1 pr-3">Tramo</th>
                {porTemporada.temporadas.map(t => (
                  <th key={t} colSpan={casas.length} className="text-center font-semibold py-1 px-2 border-l border-costa-borde">{t}/{String(t + 1).slice(2)}</th>
                ))}
              </tr>
              <tr className="text-[10px] text-costa-gris border-b border-costa-borde">
                <th />
                {porTemporada.temporadas.map(t => casas.map((c, k) => (
                  <th key={`${t}-${c.id}`} className={`text-right font-medium py-1 px-2 ${k === 0 ? 'border-l border-costa-borde' : ''}`}>{corto(c)}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              {porTemporada.filas.map(f => (
                <tr key={f.nombre} className="border-b border-[#f1ebe2]">
                  <td className="py-1.5 pr-3 font-semibold text-costa-esmeralda whitespace-nowrap">{f.nombre}</td>
                  {porTemporada.temporadas.map(t => casas.map((c, k) => {
                    const r = f.valores[`${t}|${c.id}`]
                    return (
                      <td key={`${t}-${c.id}`} className={`py-1 px-2 text-right ${k === 0 ? 'border-l border-costa-borde' : ''}`}>
                        {r ? (
                          <input type="number" defaultValue={r.price_per_night} key={`${r.id}-${r.price_per_night}`} disabled={isDemo}
                            title={`${r.name}: ${dmy(r.start_date)} al ${dmy(r.end_date)}`}
                            onBlur={e => cambiarPrecio(r, e.target.value)}
                            className="w-16 rounded-md border border-transparent hover:border-costa-borde focus:border-costa-borde bg-transparent focus:bg-white px-1.5 py-0.5 text-right font-bold text-costa-esmeralda" />
                        ) : <span className="text-[#b8b1a6]">—</span>}
                      </td>
                    )
                  }))}
                </tr>
              ))}
              <tr className="bg-[#faf7f2]">
                <td className="py-1.5 pr-3 text-costa-gris whitespace-nowrap">Cobrado promedio</td>
                {porTemporada.temporadas.map(t => casas.map((c, k) => {
                  const v = porTemporada.cobrado[`${t}|${c.id}`]
                  return <td key={`${t}-${c.id}`} className={`py-1.5 px-2 text-right ${k === 0 ? 'border-l border-costa-borde' : ''} ${v ? 'font-semibold text-costa-gris' : 'text-[#b8b1a6]'}`}>{v ?? '—'}</td>
                }))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
