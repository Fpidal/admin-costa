'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { parseFechaLocal, aFechaISO } from '@/lib/fechas'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Input, Select, Textarea, InputNumber } from '@/components/ui'
import { Plus, Calendar, Pencil, Trash2, Users, ChevronDown, ChevronUp, Check, Zap, AlertTriangle, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import Link from 'next/link'
import { demoReservas, demoPropiedades, demoInquilinos, demoCobros } from '@/lib/demoData'
import { calcularPrecioReserva, PrecioCalendario } from '@/lib/calcularPrecio'
import { serviciosConPrecio, type ServicioExtra } from '@/lib/serviciosReserva'
import { montosReserva, sumarMontos, monedasCon, filtrarReservas, nochesEntre, describirPeriodo, temporadaDe, temporadaActual, etiquetaTemporada, FILTRO_INICIAL, type FiltroReservas, type PorMoneda, type TipoPeriodo } from '@/lib/resumenReservas'
import { generarReporteReservasPDF } from '@/lib/reporteReservasPDF'
import { CalendarioTrimestre } from '@/components/CalendarioTrimestre'
import { AvisosCobranza } from '@/components/AvisosCobranza'
import { vencimientoSaldo, armarAvisos, nombreCasa as casaDeReserva } from '@/lib/cobranza'
import { etiquetaCobro } from '@/lib/conceptosCobro'
import { linkWhatsApp, mensajeConfirmacion, mensajeRecordatorioSaldo, mensajeIngreso } from '@/lib/whatsapp'
import { DATOS_LOCADOR_DEMO, DATOS_LOCADOR_VACIOS, camposFaltantes, type DatosLocador } from '@/lib/datosLocador'

interface Propiedad {
  id: number
  nombre: string
  direccion: string | null
  lote: string | null
}

interface ListaNegraItem {
  id: number
  documento: string
  nombre: string
  motivo: string
  fecha: string
}

interface Inquilino {
  id: number
  nombre: string
  documento: string
  telefono: string
  email: string
  domicilio: string | null
  acompanantes: Acompanante[]
}

interface Acompanante {
  nombre: string
  apellido: string
  documento: string
  edad: number | string
}

interface Reserva {
  id: number
  propiedad_id: string
  inquilino_id: string | null
  fecha_inicio: string
  fecha_fin: string
  horario_ingreso: string
  horario_salida: string
  cantidad_personas: number
  precio_noche: number
  monto_usd: number
  moneda: string
  deposito: number
  deposito_pesos: number
  sena: number
  forma_pago: string
  ropa_blanca: boolean
  limpieza_final: number
  monto_lavadero: number
  moneda_limpieza: string
  moneda_lavadero: string
  incluye_limpieza: boolean
  incluye_lavadero: boolean
  monto_ropa_blanca: number
  moneda_ropa_blanca: string
  servicios_extra: ServicioExtra[] | null
  comentario_servicios: string | null
  kw_inicial: number
  estado: string
  notas: string
  acompanantes: Acompanante[]
  propiedades?: Propiedad
  inquilinos?: Inquilino
}

interface Cobro {
  id: number
  reserva_id: number
  fecha: string
  concepto: string
  descripcion: string | null
  monto: number
  moneda: string
  medio_pago: string
  aplicar_a: string
  recibo_generado: boolean
  created_at: string
  reservas?: {
    id: number
    fecha_inicio: string
    fecha_fin: string
    eliminado_at: string | null
    propiedades?: { nombre: string }
    inquilinos?: { nombre: string }
  }
}

interface Liquidacion {
  id: number
  reserva_id: number
  deposito_recibido: number
  kw_final: number
  costo_kw: number
  consumo_energia: number
  roturas: number
  otros_descuentos: number
  cotizacion_dolar: number
  notas: string | null
  monto_devolver: number
  fecha_liquidacion: string
}

const estadosReserva = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const formasPago = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

const monedas = [
  { value: 'USD', label: 'U$D Dólares' },
  { value: 'ARS', label: '$ Pesos' },
]

// Tope de ocupación que fija el contrato. Es una cláusula del contrato, no la
// cantidad de personas que vino en la reserva.
const MAX_PERSONAS_CONTRATO = 8

// Porcentaje del total que se abona como reserva; el resto, al ingresar
const PORCENTAJE_RESERVA = 50

// Teléfono que se muestra en el contrato y en el detalle de reserva

// Condiciones y cuidados: los mismos textos van en el detalle de reserva y como
// nota del contrato. El horario sale de cada reserva, para que coincida con el plazo.
const condicionesAlquiler = (ingreso: string, salida: string) => [
  `Horario de ingreso: ${ingreso} hs - Horario de salida: ${salida} hs`,
  'Se incluyen 150 kWh de electricidad cada 7 días. El excedente se cobra al valor vigente.',
  'Prohibido fumar dentro de la propiedad. No se admiten mascotas sin autorización previa.',
  'El depósito se devuelve al verificar el estado de la propiedad.',
]

const USOS_Y_CUIDADOS = [
  'Apagar luces, aires acondicionados y artefactos eléctricos al salir de la vivienda.',
  'Mantener la casa ordenada durante la estadía.',
  'Ventilar los ambientes diariamente.',
  'Cuidar el mobiliario, equipamiento y elementos de la casa.',
  'Respetar las normas de convivencia del barrio.',
  'Informar cualquier inconveniente o daño a la brevedad.',
]

const URL_INFO_UTIL = 'https://admin-costa.vercel.app/'
const URL_COSTA = 'https://costa-esmeralda.com.ar/'


const mediosCobro: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}


const formatMonto = (monto: number, moneda: string = 'ARS') => {
  if (!monto) return moneda === 'USD' ? 'U$D 0' : '$ 0'
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(monto)
  return moneda === 'USD' ? `U$D ${formatted}` : `$ ${formatted}`
}

// Componente para mostrar moneda con símbolo más pequeño
const FormatMontoStyled = ({ monto, moneda = 'ARS' }: { monto: number, moneda?: string }) => {
  if (!monto && monto !== 0) return <span>-</span>
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(monto)
  const symbol = moneda === 'USD' ? 'U$D' : '$'
  return (
    <span>
      <span className="text-[0.75em] opacity-70">{symbol}</span> {formatted}
    </span>
  )
}

const formatFecha = (fecha: string) => {
  return parseFechaLocal(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Supabase devuelve los `time` como HH:MM:SS; en pantalla y en los PDF va HH:MM
const formatHora = (hora: string | null | undefined, porDefecto: string) => {
  return (hora || porDefecto).slice(0, 5)
}

const calcularNoches = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0
  const inicio = parseFechaLocal(checkIn)
  const fin = parseFechaLocal(checkOut)
  return Math.max(0, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)))
}

const initialForm = {
  propiedad_id: '',
  inquilino_id: '',
  check_in: '',
  check_out: '',
  horario_ingreso: '14:00',
  horario_salida: '10:00',
  cantidad_personas: 1,
  moneda: 'USD',
  precio_noche: 0,
  deposito: 0,
  deposito_pesos: 0,
  sena: 0,
  forma_pago: 'efectivo',
  ropa_blanca: false,
  limpieza_final: 0,
  monto_lavadero: 0,
  moneda_limpieza: 'ARS',
  moneda_lavadero: 'ARS',
  incluye_limpieza: false,
  incluye_lavadero: false,
  monto_ropa_blanca: 0,
  moneda_ropa_blanca: 'ARS',
  servicios_extra: [] as ServicioExtra[],
  comentario_servicios: '',
  cobrar_luz: false,
  kw_inicial: 0,
  estado: 'pendiente',
  notas: '',
}

const emptyAcompanante: Acompanante = { nombre: '', apellido: '', documento: '', edad: '' }

function ReservasContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { userId } = useAuth()

  // Una sola lista: vigentes, cerradas (antes "Pasados") o los pagos recibidos
  // (antes "Cobros"). La gestión de cada reserva vive en su ficha de cobros
  const [vista, setVista] = useState<'vigentes' | 'cerradas' | 'pagos'>('vigentes')
  // Reserva elegida en la lista (por defecto, la primera) y avisos desplegados
  const [reservaSel, setReservaSel] = useState<number | null>(null)
  const [avisosAbiertos, setAvisosAbiertos] = useState(false)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  // Locador del contrato: los datos que el usuario cargó en "Mis datos"
  const [locador, setLocador] = useState<DatosLocador>(DATOS_LOCADOR_VACIOS)
  // Alta rápida del titular: cargar la reserva no debería obligar a ir a
  // Inquilinos y volver. Se crea con lo mínimo y el resto se completa allá
  const [nuevoTitularOpen, setNuevoTitularOpen] = useState(false)
  const [nuevoTitular, setNuevoTitular] = useState({ nombre: '', documento: '', telefono: '' })
  const [creandoTitular, setCreandoTitular] = useState(false)
  const [titularListaNegra, setTitularListaNegra] = useState<ListaNegraItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([])
  // Para la reserva alcanza con cuántos son; los nombres se cargan si hacen falta
  const [cantidadAcompanantes, setCantidadAcompanantes] = useState(0)
  const [acompanantesExpanded, setAcompanantesExpanded] = useState(false)
  const [nuevoAcompanante, setNuevoAcompanante] = useState<Acompanante>({ nombre: '', apellido: '', documento: '', edad: '' })
  const [editingAcompIdx, setEditingAcompIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [precioSugerido, setPrecioSugerido] = useState<{ precio: number; total: number; noches: number } | null>(null)
  const [cargandoPrecio, setCargandoPrecio] = useState(false)
  // Filtro de la pestaña Reservas: casa y período. Lo usan los recuadros, la
  // tabla y el reporte PDF
  const [filtro, setFiltro] = useState<FiltroReservas>(FILTRO_INICIAL)
  // Reserva con el menú de mensajes de WhatsApp abierto
  const [whatsappAbierto, setWhatsappAbierto] = useState<number | null>(null)

  useEffect(() => {
    if (isDemo) {
      setReservas(demoReservas as unknown as Reserva[])
      setPropiedades(demoPropiedades.map(p => ({ id: p.id as unknown as number, nombre: p.nombre })) as Propiedad[])
      setInquilinos(demoInquilinos as unknown as Inquilino[])
      setCobros(demoCobros as unknown as Cobro[])
      setLocador(DATOS_LOCADOR_DEMO)
      setLoading(false)
      return
    }
    fetchData()
  }, [isDemo, userId])

  async function fetchData() {
    if (!userId) return

    const [resReservas, resPropiedades, resInquilinos, resCobros, resLiquidaciones, resPerfil] = await Promise.all([
      supabase.from('reservas').select('*, propiedades(id, nombre, lote, direccion), inquilinos(id, nombre, documento, domicilio, telefono, email, acompanantes)').eq('user_id', userId).is('eliminado_at', null).order('fecha_inicio', { ascending: false }),
      supabase.from('propiedades').select('id, nombre, direccion, lote').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
      supabase.from('inquilinos').select('id, nombre, documento, telefono, email, domicilio, acompanantes').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
      supabase.from('cobros').select('*, reservas!inner(id, fecha_inicio, fecha_fin, eliminado_at, propiedades(nombre), inquilinos(nombre))').eq('user_id', userId).is('reservas.eliminado_at', null).order('fecha', { ascending: false }),
      supabase.from('liquidaciones').select('*').eq('user_id', userId),
      supabase.from('profiles').select('nombre, dni, domicilio, telefono').eq('id', userId).single()
    ])

    if (resReservas.data) setReservas(resReservas.data)
    if (resPropiedades.data) setPropiedades(resPropiedades.data)
    if (resInquilinos.data) setInquilinos(resInquilinos.data)
    if (resCobros.data) setCobros(resCobros.data)
    if (resLiquidaciones.data) setLiquidaciones(resLiquidaciones.data)
    if (resPerfil.data) {
      setLocador({
        nombre: resPerfil.data.nombre || '',
        dni: resPerfil.data.dni || '',
        domicilio: resPerfil.data.domicilio || '',
        telefono: resPerfil.data.telefono || '',
      })
    }
    setLoading(false)
  }

  // Obtener precio sugerido del calendario cuando cambia la propiedad o las fechas
  useEffect(() => {
    async function fetchPrecioSugerido() {
      if (!form.propiedad_id || !form.check_in || !form.check_out || isDemo) {
        setPrecioSugerido(null)
        return
      }

      setCargandoPrecio(true)
      try {
        const { data: precios } = await supabase
          .from('precios_calendario')
          .select('*')
          .eq('propiedad_id', form.propiedad_id)
          .gte('fecha_fin', form.check_in)
          .lte('fecha_inicio', form.check_out)

        if (precios && precios.length > 0) {
          const resultado = calcularPrecioReserva(
            new Date(form.check_in),
            new Date(form.check_out),
            precios as PrecioCalendario[]
          )

          if (resultado.precioPromedio > 0) {
            setPrecioSugerido({
              precio: resultado.precioPromedio,
              total: resultado.total,
              noches: resultado.noches
            })
            // Auto-llenar el precio si está vacío (nueva reserva)
            if (form.precio_noche === 0) {
              setForm(prev => ({ ...prev, precio_noche: resultado.precioPromedio }))
            }
          } else {
            setPrecioSugerido(null)
          }
        } else {
          setPrecioSugerido(null)
        }
      } catch (error) {
        console.error('Error al obtener precio sugerido:', error)
        setPrecioSugerido(null)
      }
      setCargandoPrecio(false)
    }

    fetchPrecioSugerido()
  }, [form.propiedad_id, form.check_in, form.check_out, isDemo])

  function openModal(reserva?: Reserva, prefill?: Partial<typeof initialForm>) {
    if (reserva) {
      setEditingId(reserva.id)
      setForm({
        propiedad_id: reserva.propiedad_id?.toString() || '',
        inquilino_id: reserva.inquilino_id?.toString() || '',
        check_in: reserva.fecha_inicio || '',
        check_out: reserva.fecha_fin || '',
        horario_ingreso: formatHora(reserva.horario_ingreso, '14:00'),
        horario_salida: formatHora(reserva.horario_salida, '10:00'),
        cantidad_personas: reserva.cantidad_personas || 1,
        moneda: reserva.moneda || 'ARS',
        precio_noche: reserva.monto_usd || reserva.precio_noche || 0,
        deposito: reserva.deposito || 0,
        deposito_pesos: reserva.deposito_pesos || 0,
        sena: reserva.sena || 0,
        forma_pago: reserva.forma_pago || 'efectivo',
        ropa_blanca: reserva.ropa_blanca || false,
        limpieza_final: reserva.limpieza_final || 0,
        monto_lavadero: reserva.monto_lavadero || 0,
        moneda_limpieza: reserva.moneda_limpieza || 'ARS',
        moneda_lavadero: reserva.moneda_lavadero || 'ARS',
        incluye_limpieza: reserva.incluye_limpieza || false,
        incluye_lavadero: reserva.incluye_lavadero || false,
        monto_ropa_blanca: reserva.monto_ropa_blanca || 0,
        moneda_ropa_blanca: reserva.moneda_ropa_blanca || 'ARS',
        servicios_extra: reserva.servicios_extra || [],
        comentario_servicios: reserva.comentario_servicios || '',
        cobrar_luz: (reserva.kw_inicial || 0) > 0,
        kw_inicial: reserva.kw_inicial || 0,
        estado: reserva.estado || 'pendiente',
        notas: reserva.notas || '',
      })
      const acomps = reserva.acompanantes || []
      setAcompanantes(acomps)
      setCantidadAcompanantes(Math.max((reserva.cantidad_personas || 1) - 1, acomps.length))
      setAcompanantesExpanded(acomps.length > 0)
    } else {
      setEditingId(null)
      setForm({ ...initialForm, ...prefill })
      setAcompanantes([])
      setCantidadAcompanantes(0)
      setAcompanantesExpanded(false)
    }
    setModalOpen(true)
  }

  // Desde la pantalla Temporada, tocar un hueco libre abre la reserva nueva
  // con la casa y las fechas cargadas: ?nueva=1&propiedad=..&desde=..&hasta=..
  const pedidoNueva = searchParams.get('nueva') === '1'
  useEffect(() => {
    if (!pedidoNueva || loading) return
    openModal(undefined, {
      propiedad_id: searchParams.get('propiedad') || '',
      check_in: searchParams.get('desde') || '',
      check_out: searchParams.get('hasta') || '',
    })
    window.history.replaceState(null, '', window.location.pathname + (isDemo ? '?demo=true' : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoNueva, loading])

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(initialForm)
    setAcompanantes([])
    setCantidadAcompanantes(0)
    setAcompanantesExpanded(false)
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    setEditingAcompIdx(null)
    setPrecioSugerido(null)
    setNuevoTitularOpen(false)
    setNuevoTitular({ nombre: '', documento: '', telefono: '' })
    setTitularListaNegra(null)
  }

  function cambiarCantidadAcompanantes(n: number) {
    setCantidadAcompanantes(Math.min(20, Math.max(acompanantes.length, n || 0)))
  }

  function confirmarAcompanante() {
    if (!nuevoAcompanante.nombre.trim() && !nuevoAcompanante.apellido.trim()) return

    if (editingAcompIdx !== null) {
      // Editando existente
      const updated = [...acompanantes]
      updated[editingAcompIdx] = { ...nuevoAcompanante }
      setAcompanantes(updated)
      setEditingAcompIdx(null)
    } else {
      // Agregando nuevo
      setAcompanantes([...acompanantes, { ...nuevoAcompanante }])
      setCantidadAcompanantes(c => Math.max(c, acompanantes.length + 1))
    }
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
  }

  function editarAcompanante(index: number) {
    setNuevoAcompanante({ ...acompanantes[index] })
    setEditingAcompIdx(index)
  }

  function cancelarEdicion() {
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    setEditingAcompIdx(null)
  }

  function removeAcompanante(index: number) {
    setAcompanantes(acompanantes.filter((_, i) => i !== index))
    if (editingAcompIdx === index) {
      setEditingAcompIdx(null)
      setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    }
  }

  function handleInquilinoChange(inquilinoId: string) {
    setForm({ ...form, inquilino_id: inquilinoId })

    // Cargar acompañantes del inquilino si tiene
    if (inquilinoId) {
      const inquilino = inquilinos.find(i => i.id.toString() === inquilinoId)
      if (inquilino?.acompanantes && inquilino.acompanantes.length > 0) {
        setAcompanantes(inquilino.acompanantes)
        setCantidadAcompanantes(c => Math.max(c, inquilino.acompanantes.length))
        setAcompanantesExpanded(true)
      }
    }
  }

  // Un titular ya cargado no debería duplicarse por escribir el nombre de
  // nuevo: se busca sin acentos ni mayúsculas y por cada palabra suelta, así
  // "perez" encuentra a "Juan Pérez"
  const titularesSugeridos = useMemo(() => {
    const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    const q = normalizar(nuevoTitular.nombre)
    if (q.length < 2) return []
    const terminos = q.split(/\s+/)
    return inquilinos.filter(i => {
      const n = normalizar(i.nombre)
      return terminos.every(t => n.includes(t))
    }).slice(0, 5)
  }, [nuevoTitular.nombre, inquilinos])

  // Usa uno de los ya cargados en vez de crearlo: queda de titular y arrastra
  // sus acompañantes, igual que si se hubiera elegido del desplegable
  function usarTitularExistente(inquilino: Inquilino) {
    handleInquilinoChange(String(inquilino.id))
    setNuevoTitularOpen(false)
    setNuevoTitular({ nombre: '', documento: '', telefono: '' })
    setTitularListaNegra(null)
  }

  // Crea el inquilino con nombre, DNI y celular y lo selecciona como titular.
  // Queda en Inquilinos como cualquier otro, para completarle los datos ahí
  async function crearTitularRapido() {
    const nombre = nuevoTitular.nombre.trim()
    if (!nombre) {
      alert('Ingresá el nombre y apellido del titular')
      return
    }
    if (isDemo) {
      alert('En la demo no se pueden crear inquilinos')
      return
    }
    if (titularListaNegra && !confirm(`${titularListaNegra.nombre} figura con incidentes (${titularListaNegra.motivo}). ¿Crear igual el titular?`)) {
      return
    }

    setCreandoTitular(true)
    const { data, error } = await supabase
      .from('inquilinos')
      .insert([{
        nombre,
        documento: nuevoTitular.documento.trim(),
        telefono: nuevoTitular.telefono.trim(),
        email: '',
        cantidad_personas: 1,
        origen: 'directo',
        acompanantes: [],
        user_id: userId,
      }])
      .select('id, nombre, documento, telefono, email, domicilio, acompanantes')
      .single()
    setCreandoTitular(false)

    if (error || !data) {
      alert('Error al crear el inquilino: ' + (error?.message || ''))
      return
    }

    setInquilinos([...inquilinos, data as Inquilino].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setForm(f => ({ ...f, inquilino_id: String(data.id) }))
    setNuevoTitular({ nombre: '', documento: '', telefono: '' })
    setNuevoTitularOpen(false)
    setTitularListaNegra(null)
  }

  // El DNI se contrasta con inquilinos con incidentes, como en su pantalla
  useEffect(() => {
    async function checkListaNegra() {
      const doc = nuevoTitular.documento.trim()
      if (doc.length < 5 || !userId || isDemo) {
        setTitularListaNegra(null)
        return
      }
      const { data, error } = await supabase
        .from('lista_negra')
        .select('id, documento, nombre, motivo, fecha')
        .eq('user_id', userId)
        .ilike('documento', `%${doc}%`)
        .limit(1)
      setTitularListaNegra(!error && data && data.length > 0 ? data[0] : null)
    }
    const timeoutId = setTimeout(checkListaNegra, 500)
    return () => clearTimeout(timeoutId)
  }, [nuevoTitular.documento, userId, isDemo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.propiedad_id) {
      alert('Seleccioná una propiedad')
      return
    }

    // Validar superposición de fechas con reservas confirmadas. Como en un hotel,
    // el día de salida de una reserva puede ser el de entrada de la siguiente
    const reservasConfirmadas = reservas.filter(r => {
      if (r.propiedad_id !== form.propiedad_id || r.estado !== 'confirmada') return false
      if (editingId && r.id === editingId) return false
      const inicioExistente = parseFechaLocal(r.fecha_inicio)
      const finExistente = parseFechaLocal(r.fecha_fin)
      const inicioNuevo = parseFechaLocal(form.check_in)
      const finNuevo = parseFechaLocal(form.check_out)
      return inicioNuevo < finExistente && finNuevo > inicioExistente
    })

    if (reservasConfirmadas.length > 0) {
      const reservaConflicto = reservasConfirmadas[0]
      const nombreInquilino = reservaConflicto.inquilinos?.nombre || 'otro inquilino'
      const fechaInicio = formatFecha(reservaConflicto.fecha_inicio)
      const fechaFin = formatFecha(reservaConflicto.fecha_fin)
      alert(`Esta fecha ya está reservada por ${nombreInquilino} (${fechaInicio} al ${fechaFin}). Debés elegir otras fechas.`)
      return
    }

    // Advertencia para reservas pendientes (no bloquea, solo avisa)
    const reservasPendientes = reservas.filter(r => {
      if (r.propiedad_id !== form.propiedad_id || r.estado !== 'pendiente') return false
      if (editingId && r.id === editingId) return false
      const inicioExistente = parseFechaLocal(r.fecha_inicio)
      const finExistente = parseFechaLocal(r.fecha_fin)
      const inicioNuevo = parseFechaLocal(form.check_in)
      const finNuevo = parseFechaLocal(form.check_out)
      return inicioNuevo < finExistente && finNuevo > inicioExistente
    })

    if (reservasPendientes.length > 0) {
      const reservaPendiente = reservasPendientes[0]
      const nombreInquilino = reservaPendiente.inquilinos?.nombre || 'otro inquilino'
      const fechaInicio = formatFecha(reservaPendiente.fecha_inicio)
      const fechaFin = formatFecha(reservaPendiente.fecha_fin)
      const continuar = confirm(`⚠️ ADVERTENCIA: Esta fecha tiene una reserva PENDIENTE de ${nombreInquilino} (${fechaInicio} al ${fechaFin}).\n\n¿Querés continuar de todas formas?`)
      if (!continuar) return
    }

    setSaving(true)

    const noches = calcularNoches(form.check_in, form.check_out)
    const monto = noches * Number(form.precio_noche)

    // Filtrar acompañantes vacíos
    const acompanantesValidos = acompanantes.filter(a => a.nombre.trim() || a.apellido.trim())

    const data = {
      propiedad_id: form.propiedad_id,
      inquilino_id: form.inquilino_id || null,
      fecha_inicio: form.check_in,
      fecha_fin: form.check_out,
      horario_ingreso: form.horario_ingreso,
      horario_salida: form.horario_salida,
      cantidad_personas: 1 + Math.max(cantidadAcompanantes, acompanantesValidos.length),
      moneda: form.moneda,
      precio_noche: Number(form.precio_noche),
      deposito: Number(form.deposito),
      deposito_pesos: Number(form.deposito_pesos),
      sena: Number(form.sena),
      forma_pago: form.forma_pago,
      ropa_blanca: form.ropa_blanca,
      // Un servicio destildado no lleva precio, aunque haya quedado escrito
      limpieza_final: form.incluye_limpieza ? Number(form.limpieza_final) || 0 : 0,
      monto_lavadero: form.incluye_lavadero ? Number(form.monto_lavadero) || 0 : 0,
      moneda_limpieza: form.moneda_limpieza,
      moneda_lavadero: form.moneda_lavadero,
      incluye_limpieza: form.incluye_limpieza,
      incluye_lavadero: form.incluye_lavadero,
      monto_ropa_blanca: form.ropa_blanca ? Number(form.monto_ropa_blanca) || 0 : 0,
      moneda_ropa_blanca: form.moneda_ropa_blanca,
      // Los renglones que quedaron vacíos no se guardan
      servicios_extra: form.servicios_extra
        .filter(x => x.concepto.trim() || Number(x.monto))
        .map(x => ({ concepto: x.concepto.trim(), monto: Number(x.monto) || 0, moneda: x.moneda })),
      comentario_servicios: form.comentario_servicios.trim() || null,
      kw_inicial: Number(form.kw_inicial),
      monto: monto,
      monto_usd: Number(form.precio_noche),
      estado: form.estado,
      notas: form.notas,
      acompanantes: acompanantesValidos,
    }

    if (editingId) {
      const { error } = await supabase.from('reservas').update(data).eq('id', editingId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('reservas').insert([{ ...data, user_id: userId }])
      if (error) alert('Error al crear: ' + error.message)
    }

    // Actualizar acompañantes en el inquilino también
    if (form.inquilino_id && acompanantesValidos.length > 0) {
      await supabase
        .from('inquilinos')
        .update({
          acompanantes: acompanantesValidos,
          cantidad_personas: 1 + acompanantesValidos.length
        })
        .eq('id', form.inquilino_id)
    }

    setSaving(false)
    closeModal()
    fetchData()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta reserva?\n\nLa reserva irá a la Papelera.')) return
    const { error } = await supabase
      .from('reservas')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  function generarReciboPDF(reserva: Reserva) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
    const total = noches * (reserva.precio_noche || 0)
    const moneda = reserva.moneda || 'ARS'
    // Mientras no está confirmada, el mismo PDF sirve de cotización
    const esCotizacion = reserva.estado === 'pendiente'

    // Colores - Paleta náutica costa
    const azulPrincipal = { r: 30, g: 58, b: 95 }  // costa-navy #1e3a5f
    const celesteClaro = { r: 245, g: 235, b: 224 }  // costa-beige #f5ebe0

    // Datos de la propiedad: el barrio y el lote salen de la ficha, no de un if
    const nombrePropiedad = reserva.propiedades?.nombre || 'Propiedad'
    const loteProp = reserva.propiedades?.lote?.trim()
    const contacto = {
      direccion: `${nombrePropiedad}${loteProp ? `, Lote ${loteProp}` : ''}, Costa Esmeralda`,
      tel: locador.telefono,
    }

    // Número de detalle - usar últimos 6 caracteres del UUID
    const idCorto = String(reserva.id).slice(-6).toUpperCase()
    const numDetalle = `001-${idCorto}`

    let y = 15

    // ===== ENCABEZADO COMPACTO =====
    doc.setFillColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.rect(0, 0, pageWidth, 28, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(nombrePropiedad.toUpperCase(), 15, 12)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(contacto.tel ? `${contacto.direccion} | ${contacto.tel}` : contacto.direccion, 15, 22)

    // Detalle a la derecha del encabezado
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(esCotizacion ? 'COTIZACIÓN' : 'DETALLE DE RESERVA', pageWidth - 15, 12, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`N° ${numDetalle}`, pageWidth - 15, 19, { align: 'right' })
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, pageWidth - 15, 25, { align: 'right' })

    y = 38

    // ===== DATOS DEL HUÉSPED =====
    doc.setFillColor(245, 245, 245)
    doc.rect(15, y - 3, pageWidth - 30, 22, 'F')

    doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL HUÉSPED', 20, y + 3)

    y += 10
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(reserva.inquilinos?.nombre || '-', 20, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const dni = reserva.inquilinos?.documento?.trim()
    const datosContacto = [dni ? `DNI ${dni}` : '', reserva.inquilinos?.email, reserva.inquilinos?.telefono].filter(Boolean).join(' | ')
    doc.text(datosContacto || '-', 20, y + 5)

    y += 18

    // ===== DETALLES DE LA RESERVA =====
    doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLES DE LA RESERVA', 20, y)

    y += 5
    doc.setDrawColor(200, 200, 200)
    doc.line(20, y, pageWidth - 20, y)

    y += 8
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    // Fila 1
    doc.text('Check-in:', 20, y)
    doc.setFont('helvetica', 'bold')
    doc.text(`${formatFecha(reserva.fecha_inicio)} - ${formatHora(reserva.horario_ingreso, '14:00')} hs`, 45, y)

    doc.setFont('helvetica', 'normal')
    doc.text('Check-out:', 110, y)
    doc.setFont('helvetica', 'bold')
    doc.text(`${formatFecha(reserva.fecha_fin)} - ${formatHora(reserva.horario_salida, '10:00')} hs`, 135, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text('Noches:', 20, y)
    doc.setFont('helvetica', 'bold')
    doc.text(String(noches), 45, y)

    doc.setFont('helvetica', 'normal')
    doc.text('Huéspedes:', 110, y)
    doc.setFont('helvetica', 'bold')
    doc.text(String(reserva.cantidad_personas || 1), 135, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text('Propiedad:', 20, y)
    doc.setFont('helvetica', 'bold')
    doc.text(nombrePropiedad, 45, y)

    y += 12

    // ===== DETALLE DE MONTOS (con borde) =====
    // El alquiler, la limpieza y el lavadero pueden estar en monedas distintas:
    // si coinciden se suma un total; si no, se muestra una línea por moneda.
    const simboloDe = (m: string) => (m === 'USD' ? 'U$D' : '$')
    // Sin centavos: se redondea acá y también al armar los montos, para que el
    // total y el saldo coincidan con la suma de las líneas de arriba
    const importe = (n: number, m: string) => `${simboloDe(m)} ${Math.round(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

    const conceptos: { label: string; monto: number; moneda: string }[] = [
      { label: `Alquiler · ${noches} noche${noches !== 1 ? 's' : ''} × ${importe(reserva.precio_noche || 0, moneda)}`, monto: Math.round(total), moneda },
    ]
    for (const serv of serviciosConPrecio(reserva)) {
      conceptos.push({ ...serv, monto: Math.round(serv.monto) })
    }

    const totalPorMoneda: Record<string, number> = {}
    for (const c of conceptos) totalPorMoneda[c.moneda] = (totalPorMoneda[c.moneda] || 0) + c.monto
    const monedasTotal = Object.keys(totalPorMoneda)

    // Los pagos salen de Cobros, igual que en la tabla: todo menos el depósito,
    // que es garantía. La devolución de seña resta.
    const cobrosReserva = cobros
      .filter(c => c.reserva_id === reserva.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    const pagos = cobrosReserva
      .filter(c => c.aplicar_a !== 'deposito')
      .map(c => ({
        label: [formatFecha(c.fecha), etiquetaCobro(c), mediosCobro[c.medio_pago]].filter(Boolean).join(' · '),
        monto: Math.round(c.concepto === 'devolucion_sena' ? -(c.monto || 0) : (c.monto || 0)),
        moneda: c.moneda || 'ARS',
      }))
    const depositoRecibido = cobrosReserva.some(c => c.aplicar_a === 'deposito')

    // Con muchos pagos no entran todos antes de las condiciones: los primeros
    // van uno por uno y el resto se agrupa por moneda
    const MAX_LINEAS_PAGOS = 6
    let lineasPagos = pagos
    if (pagos.length > MAX_LINEAS_PAGOS) {
      const resto = pagos.slice(MAX_LINEAS_PAGOS - 2)
      const restoPorMoneda: Record<string, number> = {}
      for (const p of resto) restoPorMoneda[p.moneda] = (restoPorMoneda[p.moneda] || 0) + p.monto
      lineasPagos = [
        ...pagos.slice(0, MAX_LINEAS_PAGOS - 2),
        ...Object.keys(restoPorMoneda).map(m => ({ label: `Otros ${resto.length} pagos`, monto: restoPorMoneda[m], moneda: m })),
      ]
    }

    // Sin pagos todavía, figura la seña a abonar: el 50% del alquiler, como
    // dice el contrato (el campo "seña" de la reserva ya no se usa)
    const senaAAbonar = pagos.length === 0 ? Math.round(total * PORCENTAJE_RESERVA / 100) : 0

    const saldoPorMoneda: Record<string, number> = { ...totalPorMoneda }
    for (const p of pagos) saldoPorMoneda[p.moneda] = (saldoPorMoneda[p.moneda] || 0) - p.monto
    const monedasSaldo = Object.keys(saldoPorMoneda).filter(m => saldoPorMoneda[m] !== 0 || monedasTotal.includes(m))

    const montosStartY = y - 3
    const hayDeposito = !!(reserva.deposito && reserva.deposito > 0)
    const altoPagos = 6 + Math.max(1, lineasPagos.length) * 5 + 3
    const montosHeight =
      12 + conceptos.length * 6 + 6 + monedasTotal.length * 6 + altoPagos + monedasSaldo.length * 8 + 6 + (hayDeposito ? 8 : 0)

    // Borde del cuadro
    doc.setDrawColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.setLineWidth(0.5)
    doc.rect(15, montosStartY, pageWidth - 30, montosHeight)

    // Título con fondo azul
    doc.setFillColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.rect(15, montosStartY, pageWidth - 30, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DE MONTOS', 20, y + 2)

    y += 12
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    for (const c of conceptos) {
      doc.text(c.label, 20, y)
      doc.text(importe(c.monto, c.moneda), pageWidth - 20, y, { align: 'right' })
      y += 6
    }

    doc.setDrawColor(200, 200, 200)
    doc.line(20, y - 2, pageWidth - 20, y - 2)
    y += 2

    doc.setFont('helvetica', 'bold')
    for (const m of monedasTotal) {
      doc.text(monedasTotal.length > 1 ? `Total (${simboloDe(m)})` : 'Total', 20, y)
      doc.text(importe(totalPorMoneda[m], m), pageWidth - 20, y, { align: 'right' })
      y += 6
    }

    // Pagos registrados, después del total
    y += 1
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.text('PAGOS REGISTRADOS', 20, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    if (lineasPagos.length > 0) {
      for (const p of lineasPagos) {
        doc.text(p.label, 20, y)
        // Un pago descuenta del saldo; una devolución de seña lo vuelve a sumar
        doc.text(`${p.monto < 0 ? '+' : '-'} ${importe(Math.abs(p.monto), p.moneda)}`, pageWidth - 20, y, { align: 'right' })
        y += 5
      }
    } else if (senaAAbonar) {
      doc.text(`Sin pagos todavía · Seña a abonar para confirmar (${PORCENTAJE_RESERVA}% del alquiler)`, 20, y)
      doc.text(importe(senaAAbonar, moneda), pageWidth - 20, y, { align: 'right' })
      y += 5
    } else {
      doc.setTextColor(120, 120, 120)
      doc.text('Sin pagos registrados', 20, y)
      doc.setTextColor(60, 60, 60)
      y += 5
    }
    y += 3

    // Saldo pendiente, con fondo celeste
    const altoSaldo = 2 + monedasSaldo.length * 8
    doc.setFillColor(celesteClaro.r, celesteClaro.g, celesteClaro.b)
    doc.rect(16, y - 4, pageWidth - 32, altoSaldo, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    let ySaldo = y + 2
    for (const m of monedasSaldo) {
      doc.setTextColor(60, 60, 60)
      doc.text(monedasSaldo.length > 1 ? `SALDO PENDIENTE (${simboloDe(m)})` : 'SALDO PENDIENTE', 20, ySaldo)
      doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
      doc.text(importe(saldoPorMoneda[m], m), pageWidth - 20, ySaldo, { align: 'right' })
      ySaldo += 8
    }
    y = ySaldo

    // El depósito no integra el total: es garantía y se devuelve
    if (hayDeposito) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120, 120, 120)
      doc.text(`Depósito en garantía (no integra el total, se devuelve al finalizar)${depositoRecibido ? ' · recibido' : ''}`, 20, y)
      doc.text(importe(reserva.deposito, 'USD'), pageWidth - 20, y, { align: 'right' })
      y += 6
    }

    y += 12

    // Los bloques del medio no pueden invadir las condiciones, que van ancladas
    // al pie: lo que no entra se omite en vez de superponerse
    const TOPE_MEDIO = 168

    // ===== ACOMPAÑANTES =====
    if (reserva.acompanantes && reserva.acompanantes.length > 0 && y < TOPE_MEDIO) {
      doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('ACOMPAÑANTES', 20, y)

      y += 6
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      reserva.acompanantes.forEach((acomp, idx) => {
        if (y > TOPE_MEDIO) return
        const nombre = `${acomp.nombre} ${acomp.apellido}`.trim()
        const doc_edad = [acomp.documento, acomp.edad ? `${acomp.edad} años` : ''].filter(Boolean).join(' - ')
        doc.text(`${idx + 1}. ${nombre}${doc_edad ? ` (${doc_edad})` : ''}`, 25, y)
        y += 5
      })
      y += 3
    }

    // ===== SERVICIOS =====
    // Los que tienen precio ya figuran en los montos; acá va qué incluye
    const servicios: string[] = []
    if (reserva.ropa_blanca) servicios.push((reserva.monto_ropa_blanca || 0) > 0 ? 'Ropa blanca' : 'Ropa blanca (incluida)')
    if (reserva.incluye_limpieza || reserva.limpieza_final > 0) servicios.push(reserva.limpieza_final > 0 ? 'Limpieza final' : 'Limpieza final (bonificada)')
    if (reserva.incluye_lavadero || reserva.monto_lavadero > 0) servicios.push('Lavadero')
    for (const x of reserva.servicios_extra || []) {
      if (x.concepto) servicios.push(x.monto > 0 ? x.concepto : `${x.concepto} (sin cargo)`)
    }
    const comentarioServicios = reserva.comentario_servicios?.trim()

    if ((servicios.length > 0 || comentarioServicios) && y < TOPE_MEDIO) {
      doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('SERVICIOS', 20, y)
      y += 5
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      servicios.forEach(s => {
        doc.text(`• ${s}`, 25, y)
        y += 4
      })
      if (comentarioServicios) {
        doc.setFont('helvetica', 'italic')
        const lineas = doc.splitTextToSize(comentarioServicios, pageWidth - 45)
        doc.text(lineas, 25, y)
        y += lineas.length * 4
        doc.setFont('helvetica', 'normal')
      }
      y += 3
    }

    // ===== NOTAS =====
    if (reserva.notas && y < TOPE_MEDIO) {
      doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVACIONES', 20, y)
      y += 5
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const notasLines = doc.splitTextToSize(reserva.notas, pageWidth - 45)
      doc.text(notasLines, 25, y)
      y += notasLines.length * 4 + 3
    }

    // ===== CONDICIONES DEL ALQUILER =====
    // Los dos bloques más los links ocupan ~80 mm y el pie va en 280. Van anclados
    // en 178; si los montos llegan más abajo bajan, y si no entran pasan a otra hoja
    const ALTO_CONDICIONES = 84
    if (y + 4 <= 178) y = 178
    else if (y + 4 + ALTO_CONDICIONES <= 276) y = y + 4
    else { doc.addPage(); y = 20 }
    doc.setFillColor(250, 250, 250)
    doc.rect(15, y - 3, pageWidth - 30, 32, 'F')

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('CONDICIONES DEL ALQUILER', 20, y + 2)

    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    const condiciones = condicionesAlquiler(formatHora(reserva.horario_ingreso, '14:00'), formatHora(reserva.horario_salida, '10:00'))
    condiciones.forEach(c => {
      doc.text(`• ${c}`, 20, y)
      y += 4
    })

    // ===== USOS Y CUIDADOS DE LA PROPIEDAD =====
    y += 8
    doc.setFillColor(250, 250, 250)
    doc.rect(15, y - 3, pageWidth - 30, 48, 'F')

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('USOS Y CUIDADOS DE LA PROPIEDAD', 20, y + 2)

    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    USOS_Y_CUIDADOS.forEach(c => {
      doc.text(`• ${c}`, 20, y)
      y += 4
    })

    // Link info útil
    y += 3
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.text('Para teléfonos útiles, servicios, emergencias y contactos del barrio:', 20, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 100, 180)
    doc.textWithLink(URL_INFO_UTIL, 20, y, { url: URL_INFO_UTIL })

    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.text('Actividades, novedades y servicios de Costa Esmeralda:', 20, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 100, 180)
    doc.textWithLink(URL_COSTA, 20, y, { url: URL_COSTA })

    // ===== PIE (en cada hoja) =====
    for (let p = 1; p <= doc.getNumberOfPages(); p++) {
      doc.setPage(p)
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Admin Costa - Sistema de Gestión de Alquileres', pageWidth / 2, 280, { align: 'center' })
      doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, 285, { align: 'center' })
    }

    // Guardar
    doc.save(`${esCotizacion ? 'Cotizacion' : 'Detalle_Reserva'}_${numDetalle}_${reserva.inquilinos?.nombre?.replace(/\s/g, '_') || 'reserva'}.pdf`)
  }

  function generarContratoPDF(reserva: Reserva) {
    // Sin los datos del locador el contrato saldría incompleto: se piden antes
    const faltan = camposFaltantes(locador)
    if (faltan.length > 0) {
      if (confirm(`Para generar el contrato completá tus datos (${faltan.join(', ')}) en "Mis datos".\n\n¿Ir ahora?`)) {
        window.location.href = '/admin/mis-datos'
      }
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 16
    const contentWidth = pageWidth - margin * 2

    // ID corto para el nombre del archivo
    const idCorto = String(reserva.id).slice(-6).toUpperCase()

    const azulNavy = { r: 30, g: 58, b: 95 }

    // Datos calculados
    // Sin centavos: el precio por noche puede tener decimales, y el saldo sale
    // de las cifras ya redondeadas para que total = reserva + saldo cierre
    const monto = (n: number) => Math.round(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })
    const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
    const total = Math.round(noches * (reserva.precio_noche || 0))
    // El total va en la moneda de la reserva; la reserva y el saldo, en porcentaje
    const monedaTotal = reserva.moneda === 'ARS' ? '$' : 'USD'

    const locatario = {
      nombre: reserva.inquilinos?.nombre || '-',
      dni: reserva.inquilinos?.documento || '-',
      domicilio: reserva.inquilinos?.domicilio || '-'
    }

    // Barrio y lote salen de la ficha de la propiedad
    const barrio = reserva.propiedades?.nombre || 'Propiedad'
    const lote = reserva.propiedades?.lote?.trim()
    const barrioLote = lote ? `${barrio}, Lote ${lote}` : barrio

    const montoEn = (n: number, m: string | null | undefined) => `${m === 'USD' ? 'USD ' : '$'}${monto(n)}`

    // Extras (mucama, ropa blanca adicional...): con su precio o sin cargo
    const extras = (reserva.servicios_extra || []).filter(x => x.concepto)
    const extrasTexto = extras.length
      ? ` Servicios adicionales: ${extras.map(x => `${x.concepto} (${x.monto > 0 ? montoEn(x.monto, x.moneda) : 'sin cargo'})`).join(', ')}.`
      : ''

    // Limpieza: con precio se paga; tildada sin precio, bonificada; sin tildar no se menciona
    const textoLimpieza = [
      reserva.limpieza_final > 0
        ? `Pagar limpieza de salida de ${montoEn(reserva.limpieza_final, reserva.moneda_limpieza)}.`
        : reserva.incluye_limpieza ? 'La limpieza de salida está bonificada.' : '',
      reserva.monto_lavadero > 0 ? `Pagar lavadero de ${montoEn(reserva.monto_lavadero, reserva.moneda_lavadero)}.` : '',
    ].filter(Boolean).map(t => `${t} `).join('')

    const formatFechaLarga = (fecha: string) => {
      return parseFechaLocal(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    // El saldo se paga con 15 días de anticipación al ingreso
    const fechaLimiteSaldo = parseFechaLocal(reserva.fecha_inicio)
    fechaLimiteSaldo.setDate(fechaLimiteSaldo.getDate() - 15)
    const fechaLimiteSaldoTexto = fechaLimiteSaldo.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

    // Si ya hay cobros (sin contar el depósito) la reserva está paga y el
    // contrato sirve de recibo; si no, se pide dentro de los 5 días
    const cobradoReserva = cobros
      .filter(c => c.reserva_id === reserva.id && c.aplicar_a !== 'deposito')
      .reduce((acc, c) => acc + (c.concepto === 'devolucion_sena' ? -(c.monto || 0) : (c.monto || 0)), 0)
    const textoReserva = cobradoReserva > 0
      ? `El locatario abonó el ${PORCENTAJE_RESERVA}% en concepto de reserva, que el locador declara haber recibido, sirviendo el presente de recibo.`
      : `El locatario abonará el ${PORCENTAJE_RESERVA}% en concepto de reserva dentro de los 5 días de aceptada la cotización. Si no se abona en ese plazo, el locador podrá disponer libremente de la propiedad para esas fechas.`

    const depositoTexto = reserva.deposito_pesos
      ? `USD ${monto(reserva.deposito)} (o echeq $${monto(reserva.deposito_pesos)})`
      : `USD ${monto(reserva.deposito)}`

    const secciones = [
      { num: '1', title: 'Objeto', content:
        `${locador.nombre} da en alquiler temporario su casa ubicada en Costa Esmeralda, Km 380 Ruta 11, Barrio ${barrioLote}, Partido de la Costa, Buenos Aires. Se entrega amueblada y en buen estado, con todo su equipamiento. El locatario dispone de 24 hs desde el ingreso para informar cualquier desperfecto.` },
      { num: '2', title: 'Destino', content:
        `Uso exclusivo como vivienda temporaria de descanso, para un máximo de ${MAX_PERSONAS_CONTRATO} personas. Se prohíbe subalquilar, sobre-ocupar, cambiar el destino o realizar fiestas/eventos. El locatario debe cumplir el Reglamento de Convivencia de Costa Esmeralda y solicitar autorización para ingresar animales.` },
      { num: '3', title: 'Plazo', content:
        `Desde ${formatFechaLarga(reserva.fecha_inicio)} a las ${formatHora(reserva.horario_ingreso, '16:00')} hs hasta ${formatFechaLarga(reserva.fecha_fin)} a las ${formatHora(reserva.horario_salida, '10:00')} hs, improrrogable. Si no se entrega en término, se aplica una penalidad de USD 500 por día de demora.` },
      { num: '4', title: 'Precio y pago', content:
        `Total: ${monedaTotal} ${monto(total)}. ${textoReserva} El ${100 - PORCENTAJE_RESERVA}% restante, en concepto de saldo, se abonará con una anticipación mínima de 15 días a la fecha de ingreso (a más tardar el ${fechaLimiteSaldoTexto}). La forma de pago se acordará con el locador.\nEl precio incluye agua, impuesto inmobiliario, tasa municipal, jardinería, limpieza semanal de piscina, TV, Internet, vigilancia y electricidad hasta 150 kWh cada 7 días. El excedente se cobra según la lectura del medidor al ingreso y al egreso, al valor vigente del kWh. ${reserva.ropa_blanca ? `**Incluye ropa blanca${(reserva.monto_ropa_blanca || 0) > 0 ? ` (con cargo de ${montoEn(reserva.monto_ropa_blanca, reserva.moneda_ropa_blanca)})` : ''}.**` : '**No incluye ropa blanca.**'}${extrasTexto}` },
      { num: '5', title: 'Depósito', content:
        `El locatario entrega al ingreso un depósito en garantía de ${depositoTexto}. Se devolverá al egreso, una vez verificado el estado de la propiedad, o dentro de los 7 días posteriores si hubiera que esperar lecturas, reparaciones o multas pendientes. Se descontarán daños, faltantes, exceso de consumo eléctrico y multas aplicadas por la administración del barrio por conductas del locatario, sus acompañantes o visitas. Si los daños superan el monto del depósito, la diferencia queda a cargo del locatario.` },
      { num: '6', title: 'Obligaciones del locatario', content:
        `Mantener la propiedad en buen estado y restituirla limpia, con vajilla y parrilla lavadas. ${textoLimpieza}Avisar de desperfectos y permitir ingreso para reparaciones, jardinería y mantenimiento de piscina. No realizar mejoras sin autorización. No estacionar sobre el césped ni dañar riego; el costo de reparación será a su cargo. El uso de cuatriciclos requiere registro y es bajo su exclusiva responsabilidad.` },
      { num: '7', title: 'Responsabilidad', content:
        `El locador no responde por robos o hurtos de pertenencias del locatario, sus acompañantes o visitas, ni por cortes o fallas de servicios ajenos a su control (electricidad, agua, gas, Internet, TV).\nEl uso de la piscina, parrilla, juegos y demás instalaciones es bajo exclusiva responsabilidad del locatario. Los menores de edad deberán estar en todo momento bajo la supervisión de un adulto, especialmente en la zona de piscina.\nEl locatario responde por los daños que él, sus acompañantes o visitas causen a la propiedad, a su equipamiento o a terceros, incluidas las sanciones que aplique la administración del barrio.` },
      { num: '8', title: 'Jurisdicción', content:
        `Las partes fijan domicilio en los indicados arriba y se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.` },
      // Nota con lo mismo que figura en el detalle de reserva
      { num: '9', title: 'Nota: condiciones, usos y cuidados de la propiedad', content:
        [...condicionesAlquiler(formatHora(reserva.horario_ingreso, '16:00'), formatHora(reserva.horario_salida, '10:00')), ...USOS_Y_CUIDADOS]
          .map(c => `• ${c}`)
          .concat(`Teléfonos útiles, servicios, emergencias y contactos del barrio: ${URL_INFO_UTIL}`)
          .concat(`Actividades, novedades y servicios de Costa Esmeralda: ${URL_COSTA}`)
          .join('\n') },
    ]

    /* Encaje en una sola hoja: se busca la escala tipográfica más grande con
       la que el contrato entero entra en la A4, en vez de partirlo en dos. */
    const headerH = 21
    const yInicio = headerH + 9
    const altoFirmas = 38 // lugar y fecha + líneas de firma + pie

    /* Arma las líneas de un párrafo respetando los tramos entre ** como
       negrita (jsPDF no mezcla fuentes dentro de un mismo text). Usa el
       tamaño de letra vigente, igual para medir que para escribir. */
    type Tramo = { t: string; b: boolean }
    const partirEnLineas = (texto: string): Tramo[][] => {
      const lineas: Tramo[][] = []
      const ancho = (t: string, b: boolean) => {
        doc.setFont('helvetica', b ? 'bold' : 'normal')
        return doc.getTextWidth(t)
      }
      for (const parrafo of texto.split('\n')) {
        const palabras: Tramo[] = []
        parrafo.split(/(\*\*[^*]+\*\*)/).forEach((parte, i) => {
          const b = i % 2 === 1
          const limpio = b ? parte.slice(2, -2) : parte
          for (const t of limpio.split(' ')) if (t) palabras.push({ t, b })
        })
        let linea: Tramo[] = []
        let usado = 0
        for (const p of palabras) {
          const w = ancho(p.t, p.b)
          const espacio = linea.length ? ancho(' ', p.b) : 0
          if (linea.length && usado + espacio + w > contentWidth) {
            lineas.push(linea)
            linea = []
            usado = 0
          }
          linea.push({ t: linea.length ? ` ${p.t}` : p.t, b: p.b })
          usado += (linea.length > 1 ? espacio : 0) + w
        }
        lineas.push(linea)
      }
      doc.setFont('helvetica', 'normal')
      return lineas
    }

    const medir = (k: number) => {
      const fsTexto = 9.4 * k
      const lh = 4.5 * k
      let alto = 0
      // bloque "Entre"
      alto += 5 * k + 4.6 * k * 2 + 5 * k
      for (const sec of secciones) {
        doc.setFontSize(fsTexto)
        doc.setFont('helvetica', 'normal')
        const lines = partirEnLineas(sec.content)
        alto += 5.2 * k + lines.length * lh + 3.6 * k
      }
      return alto
    }

    let k = 0.62
    for (let t = 1; t >= 0.62; t -= 0.01) {
      if (yInicio + medir(t) + altoFirmas <= pageHeight - 8) { k = t; break }
    }

    const fsTexto = 9.4 * k
    const fsTitulo = 10.2 * k
    const lh = 4.5 * k

    /* Encabezado */
    doc.setFillColor(azulNavy.r, azulNavy.g, azulNavy.b)
    doc.rect(0, 0, pageWidth, headerH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE LOCACIÓN TEMPORARIA', pageWidth / 2, 9.5, { align: 'center' })
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Costa Esmeralda · Barrio ${barrioLote}`, pageWidth / 2, 15.5, { align: 'center' })

    let y = yInicio

    /* Entre */
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(fsTitulo)
    doc.setFont('helvetica', 'bold')
    doc.text('Entre:', margin, y)
    y += 5 * k

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fsTexto)
    doc.text(`Locador: ${locador.nombre}, DNI ${locador.dni}, ${locador.domicilio} — Tel. ${locador.telefono}`, margin, y)
    y += 4.6 * k
    doc.text(`Locatario: ${locatario.nombre}, DNI ${locatario.dni}, ${locatario.domicilio}`, margin, y)
    y += 4.6 * k + 5 * k

    /* Secciones */
    for (const sec of secciones) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fsTitulo)
      doc.setTextColor(azulNavy.r, azulNavy.g, azulNavy.b)
      doc.text(`${sec.num}. ${sec.title}`, margin, y)
      y += 5.2 * k

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(fsTexto)
      const lines = partirEnLineas(sec.content)
      lines.forEach((linea, i) => {
        let x = margin
        for (const tramo of linea) {
          doc.setFont('helvetica', tramo.b ? 'bold' : 'normal')
          doc.text(tramo.t, x, y + i * lh)
          x += doc.getTextWidth(tramo.t)
        }
      })
      doc.setFont('helvetica', 'normal')
      y += lines.length * lh + 3.6 * k
    }

    /* Lugar y fecha */
    y += 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fsTexto)
    doc.setTextColor(60, 60, 60)
    doc.text(`En la Ciudad Autónoma de Buenos Aires, a los ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}.`, margin, y)

    /* Firmas, ancladas al pie para que no queden flotando */
    const yFirma = pageHeight - 26
    doc.setDrawColor(100, 100, 100)
    doc.line(margin, yFirma, margin + 62, yFirma)
    doc.line(pageWidth - margin - 62, yFirma, pageWidth - margin, yFirma)
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(`${locador.nombre} – Locador`, margin, yFirma + 5)
    doc.text(`${locatario.nombre} – Locatario`, pageWidth - margin - 62, yFirma + 5)
    doc.text(`DNI ${locador.dni}`, margin, yFirma + 9)
    if (locatario.dni !== '-') doc.text(`DNI ${locatario.dni}`, pageWidth - margin - 62, yFirma + 9)

    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Contrato generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, pageHeight - 8, { align: 'center' })

    doc.save(`Contrato_001-${idCorto}_${locatario.nombre.replace(/\s/g, '_')}.pdf`)
  }

  // Reservas del filtro. Los recuadros suman lo mismo que muestra la tabla:
  // las vigentes, sin canceladas. El PDF lista además las cerradas del
  // período, cada una con su fila, así un año o temporada pasada sale completo
  const reservasFiltradas = filtrarReservas(reservas, filtro)
  const reservasReporte = reservasFiltradas.filter(r => r.estado !== 'cancelada')
  // Vigentes o cerradas según lo que se esté viendo
  const enVista = (r: Reserva) => vista === 'cerradas' ? r.estado === 'cerrada' : r.estado !== 'cerrada'
  const reservasResumen = reservasReporte.filter(enVista)
  const cerradasPeriodo = reservasReporte.filter(r => r.estado === 'cerrada').length
  // Siempre por fecha de ingreso, de la más próxima a la más lejana
  const reservasLista = reservasFiltradas.filter(enVista).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
  // Pagos de las reservas del filtro (vigentes y cerradas)
  const idsFiltradas = new Set(reservasFiltradas.map(r => r.id))
  const cobrosVista = cobros.filter(c => idsFiltradas.has(c.reserva_id))
  // Total y pendiente de cobro cuentan solo lo confirmado; lo que falta
  // confirmar se muestra aparte, en rojo, bajo el total
  const montosResumen = reservasResumen.filter(r => r.estado !== 'pendiente').map(r => montosReserva(r, cobros))
  const resumen = {
    total: sumarMontos(montosResumen.map(m => m.total)),
    cobrado: sumarMontos(montosResumen.map(m => m.cobrado)),
    saldo: sumarMontos(montosResumen.map(m => m.saldo)),
  }
  const reservasAConfirmar = reservasResumen.filter(r => r.estado === 'pendiente')
  const pendientes = reservasAConfirmar.length
  const totalAConfirmar = sumarMontos(reservasAConfirmar.map(r => montosReserva(r, cobros).total))
  // Temporadas con reservas, más la actual aunque todavía no tenga ninguna
  const opcionesTemporada = Array.from(new Set([
    temporadaActual(),
    ...reservas.map(r => temporadaDe(r.fecha_inicio)).filter((t): t is number => t !== null),
  ])).sort((a, b) => b - a)
  const opcionesAnio = Array.from(new Set(reservas.map(r => Number(r.fecha_inicio.slice(0, 4))))).sort((a, b) => b - a)
  const nombreCasa = (id: string) => {
    const p = propiedades.find(p => String(p.id) === id)
    return p ? `${p.nombre}${p.lote ? ` (Lote ${p.lote})` : ''}` : ''
  }
  const casasFiltro = filtro.propiedadId ? nombreCasa(filtro.propiedadId) : 'Todas las casas'

  function cambiarTipoPeriodo(tipo: TipoPeriodo) {
    // La temporada arranca en la actual; el año, en el más reciente
    const valor = tipo === 'temporada' ? String(temporadaActual()) : tipo === 'anio' ? String(opcionesAnio[0] ?? '') : ''
    setFiltro({ ...filtro, tipo, valor })
  }

  // Los tres mensajes de WhatsApp de una reserva, con sus datos ya puestos
  function mensajesWhatsApp(reserva: Reserva) {
    const { cobrado, saldo } = montosReserva(reserva, cobros)
    const datos = {
      huesped: reserva.inquilinos?.nombre,
      casa: casaDeReserva(reserva),
      fecha_inicio: reserva.fecha_inicio,
      fecha_fin: reserva.fecha_fin,
      horario_ingreso: reserva.horario_ingreso,
      cobrado,
      saldo,
      vencimientoSaldo: vencimientoSaldo(reserva.fecha_inicio),
    }
    const tel = reserva.inquilinos?.telefono
    const lista = [{ label: 'Confirmación', href: linkWhatsApp(tel, mensajeConfirmacion(datos)) }]
    if (monedasCon(saldo).some(m => saldo[m] > 0)) lista.push({ label: 'Recordar saldo', href: linkWhatsApp(tel, mensajeRecordatorioSaldo(datos)) })
    lista.push({ label: 'Info para el ingreso', href: linkWhatsApp(tel, mensajeIngreso(datos, URL_INFO_UTIL)) })
    return lista
  }

  function descargarReporte() {
    generarReporteReservasPDF({
      reservas: reservasReporte,
      cobros,
      casas: casasFiltro,
      periodo: describirPeriodo(filtro),
    })
  }

  // Calculos del formulario
  const formNoches = calcularNoches(form.check_in, form.check_out)
  const formTotal = formNoches * Number(form.precio_noche)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div className="vista-compacta">
      {/* Barra única: qué ver, filtros y acciones */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl sm:text-2xl font-bold text-costa-esmeralda tracking-tight">Reservas</h1>
        <div className="inline-flex rounded-lg border border-costa-borde bg-costa-superficie p-0.5" role="group" aria-label="Qué reservas ver">
          {([['vigentes', 'Vigentes'], ['cerradas', 'Cerradas'], ['pagos', 'Pagos']] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${vista === v ? 'bg-costa-esmeralda text-white' : 'text-costa-gris hover:text-costa-navy'}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={filtro.propiedadId} onChange={(e) => setFiltro({ ...filtro, propiedadId: e.target.value })} aria-label="Casa"
          className="rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-semibold text-costa-navy">
          <option value="">Todas las casas</option>
          {propiedades.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
        </select>
        <select value={filtro.tipo} onChange={(e) => cambiarTipoPeriodo(e.target.value as TipoPeriodo)} aria-label="Período"
          className="rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-semibold text-costa-navy">
          <option value="todo">Todas las fechas</option>
          <option value="temporada">Temporada</option>
          <option value="anio">Año</option>
          <option value="rango">Entre fechas</option>
        </select>
        {(filtro.tipo === 'temporada' || filtro.tipo === 'anio') && (
          <select value={filtro.valor} onChange={(e) => setFiltro({ ...filtro, valor: e.target.value })} aria-label={filtro.tipo === 'temporada' ? 'Temporada' : 'Año'}
            className="rounded-lg border border-costa-borde bg-costa-superficie px-2.5 py-1.5 text-sm font-semibold text-costa-navy">
            {(filtro.tipo === 'temporada' ? opcionesTemporada : opcionesAnio).map(a => (
              <option key={a} value={String(a)}>{filtro.tipo === 'temporada' ? etiquetaTemporada(a).replace('Temporada ', '') : a}</option>
            ))}
          </select>
        )}
        {filtro.tipo === 'rango' && (
          <>
            <input type="date" value={filtro.desde} onChange={(e) => setFiltro({ ...filtro, desde: e.target.value })} aria-label="Ingreso desde"
              className="rounded-lg border border-costa-borde bg-costa-superficie px-2 py-1.5 text-sm text-costa-navy" />
            <input type="date" value={filtro.hasta} onChange={(e) => setFiltro({ ...filtro, hasta: e.target.value })} aria-label="Ingreso hasta"
              className="rounded-lg border border-costa-borde bg-costa-superficie px-2 py-1.5 text-sm text-costa-navy" />
          </>
        )}
        {(filtro.propiedadId || filtro.tipo !== 'todo') && (
          <button type="button" onClick={() => setFiltro(FILTRO_INICIAL)} className="text-sm font-semibold text-costa-gris hover:text-costa-navy">Limpiar</button>
        )}
        <span className="flex-1" />
        <Button variant="secondary" size="sm" onClick={descargarReporte} disabled={reservasReporte.length === 0}>
          <Download size={15} /> Reporte PDF
        </Button>
        <Button size="sm" onClick={() => openModal()}>
          <Plus size={16} /> Nueva reserva
        </Button>
      </div>

      {(() => {
        // En "Pagos" la lista son las reservas del filtro que tienen pagos
        const conPagos = new Set(cobrosVista.map(c => c.reserva_id))
        const lista = vista === 'pagos'
          ? reservasFiltradas.filter(r => conPagos.has(r.id)).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
          : reservasLista
        const elegida = lista.find(r => r.id === reservaSel) || lista[0]
        const avisos = vista === 'vigentes' ? armarAvisos(reservas, cobros) : []
        const saldosUrgentes = avisos.filter(a => a.tipo === 'saldo' && a.urgencia !== 'normal')
        const sinConfirmar = avisos.filter(a => a.tipo === 'confirmar').length
        const hoyISO = aFechaISO(new Date())
        const montosTexto = (o: PorMoneda) => monedasCon(o).map(m => formatMonto(o[m], m)).join(' + ')
        const positivos = (o: PorMoneda) => Object.fromEntries(Object.entries(o).filter(([, v]) => v > 0)) as PorMoneda

        // Etiqueta de estado: lo único con color en la lista
        const etiqueta = (r: Reserva) => {
          const { saldo } = montosReserva(r, cobros)
          const debe = monedasCon(saldo).some(m => saldo[m] > 0)
          const vence = vencimientoSaldo(r.fecha_inicio)
          if (r.estado === 'cancelada') return <span className="rounded-full bg-costa-arena px-2 py-0.5 text-[0.75em] font-semibold text-costa-gris">Cancelada</span>
          if (r.estado === 'pendiente') return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.75em] font-semibold text-red-700">Sin confirmar</span>
          if (r.estado === 'cerrada') return <span className="text-[0.75em] text-costa-gris">Cerrada</span>
          if (!debe) return <span className="text-[0.75em] font-semibold text-costa-olivo">Pagada</span>
          // nochesEntre no da negativos: lo vencido se compara por fecha
          const dias = vence < hoyISO ? -1 : nochesEntre(hoyISO, vence)
          if (dias < 0) return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.75em] font-semibold text-red-700">Venció {formatFecha(vence).slice(0, 5)}</span>
          if (dias <= 30) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.75em] font-semibold text-amber-800">Vence {formatFecha(vence).slice(0, 5)}</span>
          return <span className="text-[0.75em] text-costa-gris">vence {formatFecha(vence).slice(0, 5)}</span>
        }

        const detalle = (r: Reserva) => {
          const { total, cobrado, saldo } = montosReserva(r, cobros)
          const pend = r.estado === 'pendiente'
          const debe = monedasCon(saldo).some(m => saldo[m] > 0)
          const noches = calcularNoches(r.fecha_inicio, r.fecha_fin)
          const liq = liquidaciones.find(l => String(l.reserva_id) === String(r.id))
          // Por fecha y, dentro del mismo día, en el orden en que se cargaron
          const cobrosR = cobros.filter(c => c.reserva_id === r.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.created_at || '').localeCompare(b.created_at || '') || a.id - b.id)
          // El depósito está resuelto si hay liquidación, si no se pidió, o si
          // entró y se devolvió entero como pago ("devolución" aplicada a depósito)
          const movDeposito = cobrosR.filter(c => c.aplicar_a === 'deposito')
          const netoDeposito = movDeposito.reduce((a, c) => a + (c.concepto === 'devolucion_sena' ? -c.monto : c.monto), 0)
          const depositoDevuelto = movDeposito.some(c => c.concepto === 'devolucion_sena') && Math.round(netoDeposito) <= 0
          const cerrada = r.estado === 'cerrada'
          const pasos = [
            { t: 'Consulta', ok: true },
            { t: 'Seña', ok: cerrada || monedasCon(cobrado).some(m => cobrado[m] > 0) || !debe },
            { t: 'Saldo', ok: cerrada || !debe },
            { t: 'Ingreso', ok: cerrada || hoyISO >= r.fecha_inicio.slice(0, 10) },
            { t: 'Salida', ok: cerrada || hoyISO >= r.fecha_fin.slice(0, 10) },
            { t: 'Depósito', ok: cerrada || !!liq || !r.deposito || depositoDevuelto },
          ]
          const ahora = pasos.findIndex(p => !p.ok)
          const sena = Math.round(noches * (r.precio_noche || 0) * PORCENTAJE_RESERVA / 100)
          const linkCobros = `/admin/reservas/${r.id}/cobros`
          const accion = isDemo ? '&demo=true' : ''
          const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-costa-borde bg-costa-superficie px-3 py-1.5 text-sm font-semibold text-costa-navy hover:bg-costa-arena transition-colors'
          return (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-costa-navy truncate">{r.inquilinos?.nombre?.trim() || 'Sin titular'}</h2>
                  <p className="text-sm text-costa-gris">
                    {r.propiedades?.nombre}{r.propiedades?.lote ? ` · Lote ${r.propiedades.lote}` : ''} · {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)} · {noches} noches · {r.cantidad_personas || 1} persona{(r.cantidad_personas || 1) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="shrink-0">{etiqueta(r)}</div>
              </div>

              <div className="grid grid-cols-3 rounded-lg border border-costa-borde">
                <div className="px-3 py-2">
                  <p className="text-xs text-costa-gris">Total</p>
                  <p className="font-bold text-costa-navy tabular-nums">{montosTexto(total) || '–'}</p>
                </div>
                <div className="px-3 py-2 border-l border-costa-borde">
                  <p className="text-xs text-costa-gris">Cobrado</p>
                  <p className="font-bold text-costa-olivo tabular-nums">{montosTexto(cobrado) || '–'}</p>
                </div>
                <div className="px-3 py-2 border-l border-costa-borde">
                  <p className="text-xs text-costa-gris">{pend ? `Seña a pedir (${PORCENTAJE_RESERVA}%)` : debe ? `Saldo · vence ${formatFecha(vencimientoSaldo(r.fecha_inicio)).slice(0, 5)}` : 'Saldo'}</p>
                  <p className={`font-bold tabular-nums ${debe ? 'text-amber-700' : 'text-costa-olivo'}`}>{pend ? formatMonto(sena, r.moneda || 'USD') : debe ? montosTexto(positivos(saldo)) : 'Pagado'}</p>
                </div>
              </div>

              {r.estado !== 'cancelada' && (
                <ol className="flex flex-wrap items-center gap-y-1 text-xs">
                  {pasos.map((p, i) => (
                    <li key={p.t} className="flex items-center">
                      {i > 0 && <span className={`mx-1.5 h-0.5 w-4 ${pasos[i - 1].ok ? 'bg-costa-olivo' : 'bg-costa-borde'}`} />}
                      <span className={`flex items-center gap-1 ${p.ok ? 'text-costa-navy' : i === ahora ? 'font-bold text-amber-700' : 'text-costa-gris'}`}>
                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${p.ok ? 'border-costa-olivo bg-costa-olivo text-white' : i === ahora ? 'border-amber-600' : 'border-costa-borde'}`}>
                          {p.ok && <Check size={8} strokeWidth={4} />}
                        </span>
                        {p.t}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {r.estado !== 'cancelada' && r.estado !== 'cerrada' && (debe || pend) && (
                  <Link href={`${linkCobros}?registrar=${pend || !monedasCon(cobrado).some(m => cobrado[m] > 0) ? 'sena' : 'saldo'}${accion}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-costa-esmeralda px-3 py-1.5 text-sm font-semibold text-white hover:bg-costa-esmeralda-light">
                    {pend ? 'Registrar seña' : 'Registrar pago'}
                  </Link>
                )}
                <Link href={`${linkCobros}${isDemo ? '?demo=true' : ''}`} className={btn}>Cobros</Link>
                {r.estado !== 'cancelada' && (
                  <button type="button" className={btn} onClick={() => setWhatsappAbierto(whatsappAbierto === r.id ? null : r.id)}>WhatsApp</button>
                )}
                {r.estado !== 'cancelada' && <button type="button" className={btn} onClick={() => generarContratoPDF(r)}>Contrato</button>}
                {r.estado !== 'cancelada' && <button type="button" className={btn} onClick={() => generarReciboPDF(r)}>{pend ? 'Cotización' : 'Reserva PDF'}</button>}
                <button type="button" className={btn} onClick={() => openModal(r)}>Editar</button>
                <span className="flex-1" />
                <button type="button" onClick={() => handleDelete(r.id)} className="text-sm font-semibold text-red-700 hover:underline">Eliminar</button>
              </div>
              {whatsappAbierto === r.id && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-costa-arena/70 px-3 py-2">
                  <span className="text-xs text-costa-gris">Mensaje:</span>
                  {mensajesWhatsApp(r).map(m => (
                    <a key={m.label} href={m.href} target="_blank" rel="noopener noreferrer" onClick={() => setWhatsappAbierto(null)}
                      className="rounded-full border border-costa-borde bg-costa-superficie px-3 py-1 text-xs font-semibold text-costa-navy hover:bg-costa-esmeralda-suave">
                      {m.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Liquidación del depósito (lo que mostraba "Pasados") */}
              {liq && (
                <div className="rounded-lg bg-costa-arena/60 px-3 py-2">
                  <p className="mb-1 text-xs font-semibold text-costa-gris">Liquidación · {formatFecha(liq.fecha_liquidacion)}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                    <span className="text-costa-gris">Depósito recibido <b className="block text-costa-navy tabular-nums">{formatMonto(liq.deposito_recibido || 0, 'USD')}</b></span>
                    <span className="text-costa-gris">Luz excedente <b className="block text-costa-navy tabular-nums">{liq.consumo_energia ? formatMonto(liq.consumo_energia, 'ARS') : '–'}</b></span>
                    <span className="text-costa-gris">Roturas y otros <b className="block text-costa-navy tabular-nums">{(liq.roturas || 0) + (liq.otros_descuentos || 0) ? formatMonto((liq.roturas || 0) + (liq.otros_descuentos || 0), 'ARS') : '–'}</b></span>
                    <span className="text-costa-gris">Cotización <b className="block text-costa-navy tabular-nums">{liq.cotizacion_dolar ? formatMonto(liq.cotizacion_dolar, 'ARS') : '–'}</b></span>
                    <span className="text-costa-gris">Devuelto <b className="block text-costa-olivo tabular-nums">{formatMonto(liq.monto_devolver || 0, 'USD')}</b></span>
                  </div>
                  {liq.notas && <p className="mt-1 text-xs text-costa-gris">{liq.notas}</p>}
                </div>
              )}

              <div className="border-t border-costa-borde/70 pt-3">
                <p className="mb-1 text-xs font-semibold text-costa-gris">Pagos</p>
                {cobrosR.length === 0 ? (
                  <p className="text-sm text-costa-gris">Todavía no hay pagos.</p>
                ) : (
                  <ul className="text-sm">
                    {cobrosR.map(c => (
                      <li key={c.id} className="flex items-center gap-3 border-b border-costa-borde/50 py-1.5 last:border-0">
                        <span className="w-24 shrink-0 tabular-nums text-costa-gris">{formatFecha(c.fecha)}</span>
                        <span className="flex-1 min-w-0 truncate text-costa-navy">{etiquetaCobro(c)}<span className="text-xs text-costa-gris"> · {mediosCobro[c.medio_pago] || c.medio_pago}</span></span>
                        <span className={`shrink-0 font-semibold tabular-nums ${c.concepto === 'devolucion_sena' ? 'text-red-700' : c.aplicar_a === 'deposito' ? 'text-costa-gris' : 'text-costa-olivo'}`}>{c.concepto === 'devolucion_sena' ? '− ' : ''}{formatMonto(c.monto, c.moneda)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        }

        return (
          <>
            {/* Números del filtro, en un cuadro */}
            {(() => {
              const celda = (etiqueta: string, valor: React.ReactNode, color: string, nota?: React.ReactNode) => (
                <div key={etiqueta} className="min-w-0 px-4 py-2.5">
                  <p className="text-[0.7em] font-semibold uppercase tracking-wider text-costa-gris">{etiqueta}</p>
                  <p className={`mt-0.5 text-base font-extrabold tabular-nums leading-tight ${color}`}>{valor}</p>
                  {nota && <p className="mt-0.5 text-[0.75em] text-costa-gris">{nota}</p>}
                </div>
              )
              const cuadro = 'mb-3 grid grid-cols-2 sm:flex sm:flex-wrap rounded-xl border border-costa-borde bg-costa-superficie divide-costa-borde sm:divide-x [&>*]:sm:flex-1'
              if (vista === 'pagos') {
                const sumar = (deposito: boolean) => cobrosVista.filter(c => (c.aplicar_a === 'deposito') === deposito)
                  .reduce((acc, c) => { acc[c.moneda] = (acc[c.moneda] || 0) + (c.concepto === 'devolucion_sena' ? -c.monto : c.monto); return acc }, {} as PorMoneda)
                const dep = sumar(true)
                return (
                  <div className={cuadro}>
                    {celda('Pagos', cobrosVista.length, 'text-costa-navy', `en ${lista.length} reserva${lista.length !== 1 ? 's' : ''}`)}
                    {celda('Cobrado', montosTexto(sumar(false)) || 'U$D 0', 'text-costa-olivo', 'sin depósitos')}
                    {celda('Depósitos en garantía', montosTexto(dep) || '—', 'text-costa-navy')}
                  </div>
                )
              }
              return (
                <div className={cuadro}>
                  {celda('Reservas', reservasResumen.length, 'text-costa-navy',
                    vista === 'vigentes' && cerradasPeriodo > 0 ? `+ ${cerradasPeriodo} cerrada${cerradasPeriodo !== 1 ? 's' : ''} en el período` : undefined)}
                  {celda('Total', montosTexto(resumen.total) || 'U$D 0', 'text-costa-navy', pendientes > 0 ? 'sin las que faltan confirmar' : undefined)}
                  {celda('Cobrado', montosTexto(resumen.cobrado) || 'U$D 0', 'text-costa-olivo')}
                  {celda('Por cobrar', montosTexto(positivos(resumen.saldo)) || 'U$D 0', 'text-amber-700')}
                  {pendientes > 0 && celda('Sin confirmar', montosTexto(totalAConfirmar), 'text-red-700', `${pendientes} reserva${pendientes !== 1 ? 's' : ''}`)}
                </div>
              )
            })()}

            {/* Avisos plegados en una línea */}
            {avisos.length > 0 && (
              <div className="mb-3">
                <button type="button" onClick={() => setAvisosAbiertos(!avisosAbiertos)}
                  className="flex w-full items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-left text-sm text-costa-navy hover:bg-amber-100/70">
                  <span className="flex-1">
                    {saldosUrgentes.length > 0 && <b className="text-amber-800">{saldosUrgentes.length} saldo{saldosUrgentes.length !== 1 ? 's' : ''} para cobrar ya</b>}
                    {saldosUrgentes.length > 0 && sinConfirmar > 0 && ' · '}
                    {sinConfirmar > 0 && <span>{sinConfirmar} sin confirmar</span>}
                    {saldosUrgentes.length === 0 && sinConfirmar === 0 && <span>{avisos.length} aviso{avisos.length !== 1 ? 's' : ''}</span>}
                  </span>
                  <span className="font-semibold text-costa-esmeralda">{avisosAbiertos ? 'Ocultar avisos ▴' : 'Ver avisos ▾'}</span>
                </button>
                {avisosAbiertos && (
                  <div className="mt-2">
                    <AvisosCobranza reservas={reservas} cobros={cobros} isDemo={isDemo} linkInfoUtil={URL_INFO_UTIL} onEditar={openModal} />
                  </div>
                )}
              </div>
            )}

            {lista.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-costa-gris">{vista === 'pagos' ? 'No hay pagos para este filtro' : `No hay reservas ${vista} para este filtro`}</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
                {/* Lista por fecha */}
                <div className="overflow-hidden rounded-xl border border-costa-borde bg-costa-superficie">
                  <div className="flex justify-between border-b border-costa-borde px-4 py-2 text-xs font-semibold text-costa-gris">
                    <span>Por fecha de ingreso</span><span>{vista === 'cerradas' ? 'Total' : vista === 'pagos' ? 'Cobrado' : 'Saldo'}</span>
                  </div>
                  <ul>
                    {lista.map(r => {
                      const activa = elegida?.id === r.id
                      const ini = parseFechaLocal(r.fecha_inicio)
                      const { total, saldo, cobrado } = montosReserva(r, cobros)
                      const monto = vista === 'pagos' ? cobrado : vista === 'cerradas' || r.estado === 'pendiente' ? total : positivos(saldo)
                      return (
                        <li key={r.id} className="border-b border-costa-borde/60 last:border-0">
                          <button type="button" onClick={() => setReservaSel(r.id)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${activa ? 'bg-costa-esmeralda-suave shadow-[inset_3px_0_0_var(--costa-esmeralda)]' : 'hover:bg-costa-arena/60'}`}>
                            <span className="w-12 shrink-0 rounded-lg border border-costa-borde bg-costa-superficie py-1 text-center leading-none">
                              <span className="block text-lg font-extrabold text-costa-navy tabular-nums">{ini.getDate()}</span>
                              <span className="block text-[0.65em] font-bold uppercase tracking-wide text-costa-gris">{ini.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm font-bold ${activa ? 'text-costa-esmeralda' : 'text-costa-navy'}`}>{r.propiedades?.nombre} · {r.inquilinos?.nombre?.trim() || 'Sin titular'}</span>
                              <span className="block text-xs text-costa-gris tabular-nums">{formatFecha(r.fecha_inicio).slice(0, 5)} → {formatFecha(r.fecha_fin)} · {calcularNoches(r.fecha_inicio, r.fecha_fin)} noches</span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className={`block text-sm font-bold tabular-nums ${vista === 'pagos' ? 'text-costa-olivo' : r.estado === 'pendiente' ? 'text-costa-gris' : 'text-costa-navy'}`}>{montosTexto(monto) || '–'}</span>
                              {etiqueta(r)}
                            </span>
                          </button>
                          {/* En el celular el detalle se abre debajo de la reserva tocada */}
                          {activa && <div className="border-t border-costa-borde bg-costa-superficie p-4 md:hidden">{detalle(r)}</div>}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Detalle de la reserva elegida */}
                {elegida && (
                  <div className="hidden md:block md:sticky md:top-4 rounded-xl border border-costa-borde bg-costa-superficie p-5">
                    {detalle(elegida)}
                  </div>
                )}
              </div>
            )}
          </>
        )
      })()}

      {/* Tres meses de calendario con los días alquilados de cada casa */}
      {vista === 'vigentes' && (
        <div className="mt-6">
          <CalendarioTrimestre
            reservas={reservas}
            casas={propiedades.map(p => ({ id: String(p.id), nombre: p.nombre }))}
            onElegir={(id) => {
              const r = reservas.find(x => x.id === id)
              if (!r) return
              setVista(r.estado === 'cerrada' ? 'cerradas' : 'vigentes')
              setReservaSel(id)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Reserva' : 'Nueva Reserva'}
        size="xl"
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="reserva-form" size="sm" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="reserva-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Casa"
              value={form.propiedad_id}
              onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
              options={propiedades.map(p => ({ value: p.id.toString(), label: `${p.nombre}${p.lote ? ` - Lote ${p.lote}` : ''}${p.direccion ? ` (${p.direccion})` : ''}` }))}
              required
            />
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  label="Titular de la reserva"
                  value={form.inquilino_id}
                  onChange={(e) => handleInquilinoChange(e.target.value)}
                  options={inquilinos.map(i => ({ value: i.id.toString(), label: i.nombre }))}
                />
              </div>
              <button
                type="button"
                onClick={() => setNuevoTitularOpen(!nuevoTitularOpen)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-costa-esmeralda hover:bg-costa-esmeralda-light shadow-sm transition-colors"
              >
                <Plus size={13} /> Nuevo
              </button>
            </div>
          </div>

          {nuevoTitularOpen && (
            <div className="p-3 rounded-lg bg-costa-beige/40 border border-costa-beige">
              <p className="text-xs text-costa-gris mb-2">
                Se crea en Inquilinos y queda seleccionado como titular. El resto de los datos se completan desde ahí.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Nombre y apellido"
                  value={nuevoTitular.nombre}
                  onChange={(e) => setNuevoTitular({ ...nuevoTitular, nombre: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crearTitularRapido() } }}
                  placeholder="Juan Pérez"
                  autoFocus
                />
                <Input
                  label="DNI"
                  value={nuevoTitular.documento}
                  onChange={(e) => setNuevoTitular({ ...nuevoTitular, documento: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crearTitularRapido() } }}
                  placeholder="30123456"
                />
                <Input
                  label="Celular"
                  value={nuevoTitular.telefono}
                  onChange={(e) => setNuevoTitular({ ...nuevoTitular, telefono: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); crearTitularRapido() } }}
                  placeholder="11 6879 2207"
                />
              </div>
              {titularesSugeridos.length > 0 && (
                <div className="mt-3 rounded-lg border border-costa-olivo/30 bg-white overflow-hidden">
                  <p className="px-3 py-1.5 text-xs text-costa-gris bg-costa-olivo/5 border-b border-costa-olivo/20">
                    Ya está cargado, ¿es alguno de estos? Tocalo y queda de titular.
                  </p>
                  {titularesSugeridos.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => usarTitularExistente(i)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-costa-beige/50 border-b border-costa-beige last:border-b-0 transition-colors"
                    >
                      <span className="text-sm font-medium text-costa-navy">{i.nombre}</span>
                      <span className="text-xs text-costa-gris whitespace-nowrap">
                        {[i.documento && `DNI ${i.documento}`, i.telefono].filter(Boolean).join(' · ') || 'sin datos'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {titularListaNegra && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border-2 border-red-400">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-red-700">Inquilino con incidentes</p>
                      <p className="text-red-600">{titularListaNegra.nombre} - DNI: {titularListaNegra.documento}</p>
                      <p className="text-red-700 mt-1"><strong>Motivo:</strong> {titularListaNegra.motivo}</p>
                      <p className="text-red-500 text-xs mt-0.5">
                        Registrado el {formatFecha(titularListaNegra.fecha)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setNuevoTitularOpen(false); setNuevoTitular({ nombre: '', documento: '', telefono: '' }); setTitularListaNegra(null) }}
                >
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={crearTitularRapido} disabled={creandoTitular}>
                  {creandoTitular ? 'Creando...' : 'Crear titular'}
                </Button>
              </div>
            </div>
          )}

          {/* Las fechas llevan más ancho que las horas: si no, se cortaba el año */}
          <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] gap-3 items-end">
            <Input label="Ingreso" type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value, check_out: form.check_out && form.check_out < e.target.value ? e.target.value : form.check_out })} required />
            <Input label="Hora" type="time" value={form.horario_ingreso} onChange={(e) => setForm({ ...form, horario_ingreso: e.target.value })} />
            <Input label="Salida" type="date" value={form.check_out} min={form.check_in || undefined} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required />
            <Input label="Hora" type="time" value={form.horario_salida} onChange={(e) => setForm({ ...form, horario_salida: e.target.value })} />
            <p className="pb-1.5 text-sm text-costa-esmeralda whitespace-nowrap"><span className="text-lg font-bold">{formNoches}</span> noche{formNoches !== 1 ? 's' : ''}</p>
          </div>

          {/* Estado con radio buttons */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 rounded-lg bg-costa-arena border border-costa-borde">
            <span className="text-sm font-medium text-costa-navy">Estado:</span>
            {estadosReserva.map((estado) => (
              <label key={estado.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="estado"
                  value={estado.value}
                  checked={form.estado === estado.value}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="w-4 h-4 accent-costa-esmeralda"
                />
                <span className={`text-sm ${form.estado === estado.value ? 'font-bold text-costa-navy' : 'text-gray-700'}`}>
                  {estado.label}
                </span>
              </label>
            ))}
            {form.estado === 'pendiente' && (
              <span className="text-xs text-costa-gris basis-full sm:basis-auto">Pasa sola a confirmada cuando registrás la seña en Cobros</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select label="Moneda" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} options={monedas} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio por noche
                {precioSugerido && form.precio_noche === precioSugerido.precio && (
                  <span className="text-xs text-gray-400 ml-2">(sugerido)</span>
                )}
              </label>
              <div className={precioSugerido && form.precio_noche === precioSugerido.precio ? 'opacity-60' : ''}>
                <InputNumber value={form.precio_noche} onChange={(val) => setForm({ ...form, precio_noche: val })} decimales={2} />
              </div>
              {/* Precio sugerido del calendario */}
              {cargandoPrecio && (
                <p className="text-xs text-gray-400 mt-1">Buscando precio...</p>
              )}
              {precioSugerido && !cargandoPrecio && form.precio_noche !== precioSugerido.precio && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, precio_noche: precioSugerido.precio })}
                  className="text-xs text-costa-olivo hover:text-costa-navy mt-1 flex items-center gap-1"
                >
                  <Calendar size={12} />
                  Sugerido: {form.moneda === 'USD' ? 'U$D' : '$'} {precioSugerido.precio.toLocaleString('es-AR')}
                  <span className="text-gray-400">(click para aplicar)</span>
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depósito USD</label>
              <InputNumber value={form.deposito} onChange={(val) => setForm({ ...form, deposito: val })} />
            </div>
          </div>

          {/* Resumen calculado */}
          {/* Resumen: lo mismo que va a figurar en la tabla, el contrato y la cotización */}
          {form.check_in && form.check_out && form.precio_noche > 0 && (() => {
            const totalForm: Record<string, number> = { [form.moneda]: Math.round(formTotal) }
            for (const sv of serviciosConPrecio({
              ...form,
              limpieza_final: form.incluye_limpieza ? Number(form.limpieza_final) || 0 : 0,
              monto_lavadero: form.incluye_lavadero ? Number(form.monto_lavadero) || 0 : 0,
              monto_ropa_blanca: form.ropa_blanca ? Number(form.monto_ropa_blanca) || 0 : 0,
            })) totalForm[sv.moneda] = (totalForm[sv.moneda] || 0) + sv.monto
            const sena = Math.round(formTotal * PORCENTAJE_RESERVA / 100)
            return (
              <div className="rounded-lg border border-costa-borde bg-costa-arena/60 px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-costa-gris">Total</p>
                  <p className="font-bold text-costa-navy">{monedasCon(totalForm).map(m => <span key={m} className="block">{formatMonto(totalForm[m], m)}</span>)}</p>
                </div>
                <div>
                  <p className="text-xs text-costa-gris">Seña {PORCENTAJE_RESERVA}% del alquiler</p>
                  <p className="font-bold text-costa-esmeralda">{formatMonto(sena, form.moneda)}</p>
                </div>
                <div>
                  <p className="text-xs text-costa-gris">El saldo vence</p>
                  <p className="font-bold text-costa-navy">{formatFecha(vencimientoSaldo(form.check_in))}</p>
                </div>
                <div>
                  <p className="text-xs text-costa-gris">Depósito</p>
                  <p className="font-bold text-costa-navy">{formatMonto(Number(form.deposito), 'USD')}</p>
                </div>
              </div>
            )
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-costa-gris">Servicios</p>
          {/* Cada servicio se tilda y, si se quiere, se le pone precio. En blanco
              queda incluido sin cargo (la limpieza figura bonificada). */}
          <div className="p-2.5 bg-costa-arena/50 border border-costa-borde rounded-lg space-y-1.5">
            {([
              { check: 'ropa_blanca', monto: 'monto_ropa_blanca', moneda: 'moneda_ropa_blanca', label: 'Ropa blanca', ayuda: '' },
              { check: 'incluye_limpieza', monto: 'limpieza_final', moneda: 'moneda_limpieza', label: 'Limpieza final', ayuda: 'puede incluir el lavadero' },
              { check: 'incluye_lavadero', monto: 'monto_lavadero', moneda: 'moneda_lavadero', label: 'Lavadero', ayuda: '' },
            ] as const).map(serv => (
              <div key={serv.check} className="flex items-center gap-2 min-h-9">
                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={form[serv.check]}
                    onChange={(e) => setForm({ ...form, [serv.check]: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{serv.label}</span>
                  {serv.ayuda && <span className="text-xs text-gray-400 truncate hidden lg:inline">{serv.ayuda}</span>}
                </label>
                {form[serv.check] && (
                  <>
                    <div className="w-28 shrink-0">
                      <InputNumber
                        value={form[serv.monto] || ''}
                        onChange={(val) => setForm({ ...form, [serv.monto]: val })}
                        placeholder="Sin cargo"
                      />
                    </div>
                    <select
                      value={form[serv.moneda]}
                      onChange={(e) => setForm({ ...form, [serv.moneda]: e.target.value })}
                      className="w-16 shrink-0 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ARS">$</option>
                      <option value="USD">U$D</option>
                    </select>
                  </>
                )}
              </div>
            ))}

            {form.servicios_extra.map((extra, idx) => {
              const cambiar = (cambios: Partial<ServicioExtra>) => setForm({
                ...form,
                servicios_extra: form.servicios_extra.map((x, i) => (i === idx ? { ...x, ...cambios } : x)),
              })
              return (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={extra.concepto}
                    onChange={(e) => cambiar({ concepto: e.target.value })}
                    placeholder="Ej: mucama cada 3 días"
                    className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="w-28 shrink-0">
                    <InputNumber value={extra.monto || ''} onChange={(val) => cambiar({ monto: val })} placeholder="Sin cargo" />
                  </div>
                  <select
                    value={extra.moneda}
                    onChange={(e) => cambiar({ moneda: e.target.value })}
                    className="w-16 shrink-0 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ARS">$</option>
                    <option value="USD">U$D</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, servicios_extra: form.servicios_extra.filter((_, i) => i !== idx) })}
                    className="p-2 w-8 text-costa-gris hover:bg-costa-beige rounded"
                    title="Quitar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => setForm({ ...form, servicios_extra: [...form.servicios_extra, { concepto: '', monto: 0, moneda: form.moneda }] })}
              className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-costa-navy hover:underline"
            >
              <Plus size={14} /> Agregar otro servicio
            </button>
          </div>

          <Textarea
            label="Comentario sobre los servicios"
            value={form.comentario_servicios}
            onChange={(e) => setForm({ ...form, comentario_servicios: e.target.value })}
            placeholder="Ej: la ropa blanca incluye sábanas y toallas, no toallones de pileta"
            rows={2}
          />

            </div>
            <div className="space-y-3">
          {/* Acompañantes: para la reserva alcanza con cuántos son */}
          <div className="border border-costa-borde rounded-lg">
            <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-1">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users size={16} />
                Acompañantes
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => cambiarCantidadAcompanantes(cantidadAcompanantes - 1)}
                    disabled={cantidadAcompanantes <= acompanantes.length}
                    className="w-8 h-8 flex items-center justify-center rounded-l-lg border border-costa-gris/30 text-costa-navy hover:bg-costa-beige disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={acompanantes.length}
                    max={20}
                    value={cantidadAcompanantes}
                    onChange={(e) => cambiarCantidadAcompanantes(Number(e.target.value))}
                    className="w-12 h-8 text-center text-sm text-costa-navy border-y border-costa-gris/30 focus:outline-none focus:ring-1 focus:ring-costa-navy"
                  />
                  <button
                    type="button"
                    onClick={() => cambiarCantidadAcompanantes(cantidadAcompanantes + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-r-lg border border-costa-gris/30 text-costa-navy hover:bg-costa-beige transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Total: {1 + cantidadAcompanantes} persona{cantidadAcompanantes !== 0 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="px-3 pb-2.5">
              <button
                type="button"
                onClick={() => setAcompanantesExpanded(!acompanantesExpanded)}
                className="flex items-center gap-1 text-xs text-costa-olivo hover:underline"
              >
                {acompanantesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {acompanantes.length > 0
                  ? `Datos cargados: ${acompanantes.length} de ${cantidadAcompanantes}`
                  : 'Agregar nombres y datos (opcional)'}
              </button>
            </div>

            {acompanantesExpanded && (
              <div className="p-3 border-t space-y-3">
                {/* Lista de acompañantes registrados */}
                {acompanantes.length > 0 && (
                  <div className="space-y-2">
                    {acompanantes.map((acomp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-costa-olivo/10 border border-costa-olivo/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Check size={16} className="text-costa-olivo" />
                          <div>
                            <p className="font-medium text-gray-900">{acomp.nombre} {acomp.apellido}</p>
                            <p className="text-xs text-gray-500">
                              {acomp.documento && `DNI: ${acomp.documento}`}
                              {acomp.documento && acomp.edad && ' · '}
                              {acomp.edad && `${acomp.edad} años`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => editarAcompanante(idx)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAcompanante(idx)}
                            className="p-2 text-costa-gris hover:bg-costa-beige rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para agregar/editar */}
                <div className={`p-3 rounded-lg ${editingAcompIdx !== null ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {editingAcompIdx !== null ? 'Editando acompañante' : 'Agregar acompañante'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input
                      label="Nombre"
                      value={nuevoAcompanante.nombre}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, nombre: e.target.value })}
                      placeholder="Nombre"
                    />
                    <Input
                      label="Apellido"
                      value={nuevoAcompanante.apellido}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, apellido: e.target.value })}
                      placeholder="Apellido"
                    />
                    <Input
                      label="DNI/Pasaporte"
                      value={nuevoAcompanante.documento}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, documento: e.target.value })}
                      placeholder="Documento"
                    />
                    <Input
                      label="Edad"
                      type="number"
                      min="0"
                      value={nuevoAcompanante.edad}
                      onChange={(e) => setNuevoAcompanante({ ...nuevoAcompanante, edad: e.target.value })}
                      placeholder="Edad"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    {editingAcompIdx !== null && (
                      <Button type="button" variant="secondary" size="sm" onClick={cancelarEdicion}>
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={confirmarAcompanante}
                      disabled={!nuevoAcompanante.nombre.trim() && !nuevoAcompanante.apellido.trim()}
                    >
                      <Check size={14} />
                      {editingAcompIdx !== null ? 'Actualizar' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Control de electricidad - Solo KW Inicial */}
          <div className="border border-costa-borde rounded-lg px-3 py-2.5 bg-yellow-50/50">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Control de Luz</span>
              <label className="flex items-center gap-2 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={form.cobrar_luz}
                  onChange={(e) => setForm({ ...form, cobrar_luz: e.target.checked, kw_inicial: e.target.checked ? form.kw_inicial : 0 })}
                  className="w-4 h-4 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-600">Se cobra</span>
              </label>
            </div>
            {form.cobrar_luz && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Input label="KW Inicial (medidor)" type="number" min="0" value={form.kw_inicial || ''} onChange={(e) => setForm({ ...form, kw_inicial: Number(e.target.value) })} />
                <div className="flex items-end">
                  <p className="text-xs text-gray-500">El KW final, costo y cálculo de excedente se registran en la liquidación al finalizar la estadía.</p>
                </div>
              </div>
            )}
          </div>

          <Textarea label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones de la reserva..." rows={2} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function ReservasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <ReservasContent />
    </Suspense>
  )
}
