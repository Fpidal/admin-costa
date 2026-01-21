'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea, InputNumber } from '@/components/ui'
import { Plus, Calendar, User, Home, Pencil, Trash2, DollarSign, Users, X, ChevronDown, ChevronUp, Check, Zap, Clock, FileText, FileSignature, Wallet } from 'lucide-react'
import { jsPDF } from 'jspdf'
import Link from 'next/link'
import { demoReservas, demoPropiedades, demoInquilinos, demoCobros } from '@/lib/demoData'
import { CobrosContent } from '@/components/CobrosContent'
import { calcularPrecioReserva, PrecioCalendario } from '@/lib/calcularPrecio'

interface Propiedad {
  id: number
  nombre: string
  direccion: string | null
  lote: string | null
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
    propiedades?: { nombre: string }
    inquilinos?: { nombre: string }
  }
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

const estadoVariant = {
  'confirmada': 'success',
  'pendiente': 'warning',
  'cancelada': 'danger',
} as const

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
  return new Date(fecha).toLocaleDateString('es-AR')
}

const calcularNoches = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0
  const inicio = new Date(checkIn)
  const fin = new Date(checkOut)
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

  const [activeTab, setActiveTab] = useState<'reservas' | 'cobros' | 'gestion'>('reservas')
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [acompanantes, setAcompanantes] = useState<Acompanante[]>([])
  const [acompanantesExpanded, setAcompanantesExpanded] = useState(false)
  const [nuevoAcompanante, setNuevoAcompanante] = useState<Acompanante>({ nombre: '', apellido: '', documento: '', edad: '' })
  const [editingAcompIdx, setEditingAcompIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedReservas, setExpandedReservas] = useState<Set<string>>(new Set())
  const [precioSugerido, setPrecioSugerido] = useState<{ precio: number; total: number; noches: number } | null>(null)
  const [cargandoPrecio, setCargandoPrecio] = useState(false)

  useEffect(() => {
    if (isDemo) {
      setReservas(demoReservas as unknown as Reserva[])
      setPropiedades(demoPropiedades.map(p => ({ id: p.id as unknown as number, nombre: p.nombre })) as Propiedad[])
      setInquilinos(demoInquilinos as unknown as Inquilino[])
      setCobros(demoCobros as unknown as Cobro[])
      setLoading(false)
      return
    }
    fetchData()
  }, [isDemo, userId])

  async function fetchData() {
    if (!userId) return

    const [resReservas, resPropiedades, resInquilinos, resCobros] = await Promise.all([
      supabase.from('reservas').select('*, propiedades(id, nombre, lote, direccion), inquilinos(id, nombre, documento, telefono, email, acompanantes)').eq('user_id', userId).is('eliminado_at', null).order('fecha_inicio', { ascending: false }),
      supabase.from('propiedades').select('id, nombre, direccion, lote').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
      supabase.from('inquilinos').select('id, nombre, documento, telefono, email, domicilio, acompanantes').eq('user_id', userId).is('eliminado_at', null).order('nombre'),
      supabase.from('cobros').select('*, reservas(id, fecha_inicio, fecha_fin, propiedades(nombre), inquilinos(nombre))').eq('user_id', userId).order('fecha', { ascending: false })
    ])

    if (resReservas.data) setReservas(resReservas.data)
    if (resPropiedades.data) {
      console.log('Propiedades cargadas:', resPropiedades.data)
      setPropiedades(resPropiedades.data)
    }
    if (resInquilinos.data) setInquilinos(resInquilinos.data)
    if (resCobros.data) setCobros(resCobros.data)
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

  function openModal(reserva?: Reserva) {
    if (reserva) {
      setEditingId(reserva.id)
      setForm({
        propiedad_id: reserva.propiedad_id?.toString() || '',
        inquilino_id: reserva.inquilino_id?.toString() || '',
        check_in: reserva.fecha_inicio || '',
        check_out: reserva.fecha_fin || '',
        horario_ingreso: reserva.horario_ingreso || '14:00',
        horario_salida: reserva.horario_salida || '10:00',
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
        cobrar_luz: (reserva.kw_inicial || 0) > 0,
        kw_inicial: reserva.kw_inicial || 0,
        estado: reserva.estado || 'pendiente',
        notas: reserva.notas || '',
      })
      setAcompanantes(reserva.acompanantes || [])
    } else {
      setEditingId(null)
      setForm(initialForm)
      setAcompanantes([])
    }
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(initialForm)
    setAcompanantes([])
    setAcompanantesExpanded(false)
    setNuevoAcompanante({ nombre: '', apellido: '', documento: '', edad: '' })
    setEditingAcompIdx(null)
    setPrecioSugerido(null)
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
        setAcompanantesExpanded(true)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.propiedad_id) {
      alert('Seleccioná una propiedad')
      return
    }

    // Validar superposición de fechas con reservas confirmadas
    const reservasConfirmadas = reservas.filter(r => {
      if (r.propiedad_id !== form.propiedad_id || r.estado !== 'confirmada') return false
      if (editingId && r.id === editingId) return false
      const inicioExistente = new Date(r.fecha_inicio)
      const finExistente = new Date(r.fecha_fin)
      const inicioNuevo = new Date(form.check_in)
      const finNuevo = new Date(form.check_out)
      return inicioNuevo <= finExistente && finNuevo >= inicioExistente
    })

    if (reservasConfirmadas.length > 0) {
      const reservaConflicto = reservasConfirmadas[0]
      const nombreInquilino = reservaConflicto.inquilinos?.nombre || 'otro inquilino'
      const fechaInicio = new Date(reservaConflicto.fecha_inicio).toLocaleDateString('es-AR')
      const fechaFin = new Date(reservaConflicto.fecha_fin).toLocaleDateString('es-AR')
      alert(`Esta fecha ya está reservada por ${nombreInquilino} (${fechaInicio} al ${fechaFin}). Debés elegir otras fechas.`)
      return
    }

    // Advertencia para reservas pendientes (no bloquea, solo avisa)
    const reservasPendientes = reservas.filter(r => {
      if (r.propiedad_id !== form.propiedad_id || r.estado !== 'pendiente') return false
      if (editingId && r.id === editingId) return false
      const inicioExistente = new Date(r.fecha_inicio)
      const finExistente = new Date(r.fecha_fin)
      const inicioNuevo = new Date(form.check_in)
      const finNuevo = new Date(form.check_out)
      return inicioNuevo <= finExistente && finNuevo >= inicioExistente
    })

    if (reservasPendientes.length > 0) {
      const reservaPendiente = reservasPendientes[0]
      const nombreInquilino = reservaPendiente.inquilinos?.nombre || 'otro inquilino'
      const fechaInicio = new Date(reservaPendiente.fecha_inicio).toLocaleDateString('es-AR')
      const fechaFin = new Date(reservaPendiente.fecha_fin).toLocaleDateString('es-AR')
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
      cantidad_personas: 1 + acompanantesValidos.length,
      moneda: form.moneda,
      precio_noche: Number(form.precio_noche),
      deposito: Number(form.deposito),
      deposito_pesos: Number(form.deposito_pesos),
      sena: Number(form.sena),
      forma_pago: form.forma_pago,
      ropa_blanca: form.ropa_blanca,
      limpieza_final: Number(form.limpieza_final),
      monto_lavadero: Number(form.monto_lavadero),
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
    const saldo = total - (reserva.sena || 0)
    const moneda = reserva.moneda || 'ARS'
    const simbolo = moneda === 'USD' ? 'U$D' : '$'

    // Colores - Paleta náutica costa
    const azulPrincipal = { r: 30, g: 58, b: 95 }  // costa-navy #1e3a5f
    const celesteClaro = { r: 245, g: 235, b: 224 }  // costa-beige #f5ebe0

    // Datos de la propiedad
    const nombrePropiedad = reserva.propiedades?.nombre || 'Propiedad'
    const esGolf = nombrePropiedad.toLowerCase().includes('golf')
    const contacto = esGolf
      ? { direccion: 'Golf 234, Costa Esmeralda', tel: '+54 11 1234-5678' }
      : { direccion: 'Deportiva 9, Costa Esmeralda', tel: '+54 11 1234-5678' }

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
    doc.text(`${contacto.direccion} | ${contacto.tel}`, 15, 22)

    // Detalle a la derecha del encabezado
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DE RESERVA', pageWidth - 15, 12, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`N° ${numDetalle}`, pageWidth - 15, 19, { align: 'right' })
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - 15, 25, { align: 'right' })

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
    doc.text(`${reserva.inquilinos?.email || '-'} | ${reserva.inquilinos?.telefono || '-'}`, 20, y + 5)

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
    doc.text(`${formatFecha(reserva.fecha_inicio)} - ${reserva.horario_ingreso || '14:00'} hs`, 45, y)

    doc.setFont('helvetica', 'normal')
    doc.text('Check-out:', 110, y)
    doc.setFont('helvetica', 'bold')
    doc.text(`${formatFecha(reserva.fecha_fin)} - ${reserva.horario_salida || '10:00'} hs`, 135, y)

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
    const montosStartY = y - 3
    const montosHeight = 55 + (reserva.deposito && reserva.deposito > 0 ? 6 : 0)

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

    // Líneas de detalle
    doc.setFont('helvetica', 'normal')
    doc.text(`Precio por noche (${simbolo})`, 20, y)
    doc.text(`${simbolo} ${(reserva.precio_noche || 0).toLocaleString('es-AR')}`, pageWidth - 20, y, { align: 'right' })

    y += 6
    doc.text(`Total ${noches} noche${noches !== 1 ? 's' : ''}`, 20, y)
    doc.text(`${simbolo} ${total.toLocaleString('es-AR')}`, pageWidth - 20, y, { align: 'right' })

    if (reserva.deposito && reserva.deposito > 0) {
      y += 6
      doc.text('Depósito', 20, y)
      doc.text(`${simbolo} ${reserva.deposito.toLocaleString('es-AR')}`, pageWidth - 20, y, { align: 'right' })
    }

    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(20, y, pageWidth - 20, y)

    y += 6
    doc.text('Seña pagada', 20, y)
    doc.text(`- ${simbolo} ${(reserva.sena || 0).toLocaleString('es-AR')}`, pageWidth - 20, y, { align: 'right' })

    y += 8
    // Fila de TOTAL con fondo celeste
    doc.setFillColor(celesteClaro.r, celesteClaro.g, celesteClaro.b)
    doc.rect(16, y - 4, pageWidth - 32, 10, 'F')

    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('SALDO PENDIENTE', 20, y + 2)
    doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
    doc.text(`${simbolo} ${saldo.toLocaleString('es-AR')}`, pageWidth - 20, y + 2, { align: 'right' })

    y += 18

    // ===== ACOMPAÑANTES =====
    if (reserva.acompanantes && reserva.acompanantes.length > 0) {
      doc.setTextColor(azulPrincipal.r, azulPrincipal.g, azulPrincipal.b)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('ACOMPAÑANTES', 20, y)

      y += 6
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      reserva.acompanantes.forEach((acomp, idx) => {
        const nombre = `${acomp.nombre} ${acomp.apellido}`.trim()
        const doc_edad = [acomp.documento, acomp.edad ? `${acomp.edad} años` : ''].filter(Boolean).join(' - ')
        doc.text(`${idx + 1}. ${nombre}${doc_edad ? ` (${doc_edad})` : ''}`, 25, y)
        y += 5
      })
      y += 3
    }

    // ===== SERVICIOS =====
    const servicios = []
    if (reserva.ropa_blanca) servicios.push('Ropa blanca incluida')
    if (reserva.monto_lavadero && reserva.monto_lavadero > 0) servicios.push(`Lavadero: $ ${reserva.monto_lavadero.toLocaleString('es-AR')}`)
    if (reserva.limpieza_final && reserva.limpieza_final > 0) servicios.push(`Limpieza final: $ ${reserva.limpieza_final.toLocaleString('es-AR')}`)

    if (servicios.length > 0) {
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
      y += 3
    }

    // ===== NOTAS =====
    if (reserva.notas) {
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
    y = Math.max(y + 5, 175)
    doc.setFillColor(250, 250, 250)
    doc.rect(15, y - 3, pageWidth - 30, 32, 'F')

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('CONDICIONES DEL ALQUILER', 20, y + 2)

    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    const condiciones = [
      '• Horario de ingreso: 14:00 hs - Horario de salida: 10:00 hs',
      '• Se incluyen 110 kW de electricidad cada 7 días. El excedente se cobra al valor vigente.',
      '• Prohibido fumar dentro de la propiedad. No se admiten mascotas sin autorización previa.',
      '• El depósito se devuelve al verificar el estado de la propiedad.'
    ]
    condiciones.forEach(c => {
      doc.text(c, 20, y)
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
    const usosCuidados = [
      '• Apagar luces, aires acondicionados y artefactos eléctricos al salir de la vivienda.',
      '• Mantener la casa ordenada durante la estadía.',
      '• Ventilar los ambientes diariamente.',
      '• Cuidar el mobiliario, equipamiento y elementos de la casa.',
      '• Respetar las normas de convivencia del barrio.',
      '• Informar cualquier inconveniente o daño a la brevedad.'
    ]
    usosCuidados.forEach(c => {
      doc.text(c, 20, y)
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
    doc.textWithLink('https://admin-costa.vercel.app/', 20, y, { url: 'https://admin-costa.vercel.app/' })

    // ===== PIE =====
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.text('Admin Costa - Sistema de Gestión de Alquileres', pageWidth / 2, 280, { align: 'center' })
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, 285, { align: 'center' })

    // Guardar
    doc.save(`Detalle_Reserva_${numDetalle}_${reserva.inquilinos?.nombre?.replace(/\s/g, '_') || 'reserva'}.pdf`)
  }

  function generarContratoPDF(reserva: Reserva) {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - margin * 2

    // ID corto para el nombre del archivo
    const idCorto = String(reserva.id).slice(-6).toUpperCase()

    // Colores
    const azulNavy = { r: 30, g: 58, b: 95 }

    // Datos calculados
    const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
    const total = noches * (reserva.precio_noche || 0)
    const saldo = total - (reserva.sena || 0)

    // Datos del locador (configurables)
    const locador = {
      nombre: 'Francisco Pidal',
      domicilio: 'Av. Libertador 1234, CABA'
    }

    // Datos del locatario
    const locatario = {
      nombre: reserva.inquilinos?.nombre || '-',
      dni: reserva.inquilinos?.documento || '-',
      domicilio: reserva.inquilinos?.domicilio || '-'
    }

    // Datos de la propiedad
    const propiedad = reserva.propiedades?.nombre || 'Propiedad'
    const barrioLote = reserva.propiedades?.nombre || 'Barrio y Lote'

    // Formato de fechas
    const formatFechaLarga = (fecha: string) => {
      return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    let y = 20

    // Título
    doc.setFillColor(azulNavy.r, azulNavy.g, azulNavy.b)
    doc.rect(0, 0, pageWidth, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE LOCACIÓN TEMPORARIA', pageWidth / 2, 16, { align: 'center' })

    y = 35

    // Entre
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Entre:', margin, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Locador: ${locador.nombre}, ${locador.domicilio}`, margin, y)
    y += 5
    doc.text(`Locatario: ${locatario.nombre}, DNI ${locatario.dni}, ${locatario.domicilio}`, margin, y)
    y += 10

    // Función para agregar secciones
    const addSection = (num: string, title: string, content: string) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(azulNavy.r, azulNavy.g, azulNavy.b)
      doc.text(`${num}. ${title}`, margin, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.setFontSize(10)

      const lines = doc.splitTextToSize(content, contentWidth)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 8
    }

    // 1. Objeto
    addSection('1', 'Objeto',
      `${locador.nombre} da en alquiler temporario su casa ubicada en Costa Esmeralda, Km 380 Ruta 11, ${barrioLote}, Partido de la Costa, Buenos Aires. Se entrega amueblada y en buen estado, con todo su equipamiento. El locatario dispone de 24 hs desde el ingreso para informar cualquier desperfecto.`)

    // 2. Destino
    addSection('2', 'Destino',
      `Uso exclusivo como vivienda temporaria de descanso, para un máximo de ${reserva.cantidad_personas || 1} personas. Se prohíbe subalquilar, sobre-ocupar, cambiar el destino o realizar fiestas/eventos. El locatario debe cumplir el Reglamento de Convivencia de Costa Esmeralda y solicitar autorización para ingresar animales.`)

    // 3. Plazo
    addSection('3', 'Plazo',
      `Desde ${formatFechaLarga(reserva.fecha_inicio)} a las ${reserva.horario_ingreso || '16:00'} hs hasta ${formatFechaLarga(reserva.fecha_fin)} a las ${reserva.horario_salida || '10:00'} hs, improrrogable. Si no se entrega en término, se aplica una penalidad de USD 500 por día de demora.`)

    // 4. Precio y pago
    const fechaLimiteSena = new Date(reserva.fecha_inicio)
    fechaLimiteSena.setDate(fechaLimiteSena.getDate() - 15)

    addSection('4', 'Precio y pago',
      `Total: USD ${total.toLocaleString('es-AR')}. Reserva: USD ${(reserva.sena || 0).toLocaleString('es-AR')} antes del ${formatFechaLarga(fechaLimiteSena.toISOString())} (transferencia). Saldo: USD ${saldo.toLocaleString('es-AR')} al ingresar (efectivo). Incluye agua, impuesto inmobiliario, tasa municipal, jardinería, limpieza de piscina semanal, TV, Internet, vigilancia y electricidad hasta 120 kWh. ${reserva.ropa_blanca ? 'Incluye ropa blanca.' : 'No incluye ropa blanca.'} Falta de suministro de servicios no es responsabilidad del locador.`)

    // 5. Depósito
    const depositoTexto = reserva.deposito_pesos
      ? `USD ${(reserva.deposito || 0).toLocaleString('es-AR')} (o echeq $${(reserva.deposito_pesos || 0).toLocaleString('es-AR')})`
      : `USD ${(reserva.deposito || 0).toLocaleString('es-AR')}`

    addSection('5', 'Depósito',
      `El locatario entrega un depósito de ${depositoTexto} que se devolverá al finalizar, descontando daños, faltantes, exceso de consumo eléctrico o multas.`)

    // === PÁGINA 2 ===
    doc.addPage()
    y = 25

    // Encabezado página 2
    doc.setFillColor(azulNavy.r, azulNavy.g, azulNavy.b)
    doc.rect(0, 0, pageWidth, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE LOCACIÓN TEMPORARIA - Continuación', pageWidth / 2, 10, { align: 'center' })

    // 6. Obligaciones del locatario
    addSection('6', 'Obligaciones del locatario',
      `Mantener la propiedad en buen estado y restituirla limpia, con vajilla y parrilla lavadas. Pagar limpieza de salida de $${(reserva.limpieza_final || 0).toLocaleString('es-AR')}. Avisar de desperfectos y permitir ingreso para reparaciones, jardinería y mantenimiento de piscina. No realizar mejoras sin autorización. No estacionar sobre el césped ni dañar riego; el costo de reparación será a su cargo. El uso de cuatriciclos requiere registro y es bajo su exclusiva responsabilidad.`)

    // 7. Responsabilidad
    addSection('7', 'Responsabilidad',
      `El locador no responde por accidentes, robos, incendios o cortes de servicios. El locatario asume todos los riesgos de su estadía.`)

    // 8. Jurisdicción
    addSection('8', 'Jurisdicción',
      `Las partes fijan domicilio en los indicados arriba y se someten a los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires.`)

    // Lugar y fecha
    y += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(`En la Ciudad Autónoma de Buenos Aires, a los ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}.`, margin, y)

    // Firmas
    y += 25
    doc.setDrawColor(100, 100, 100)

    // Firma locador
    doc.line(margin, y + 15, margin + 70, y + 15)
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(`${locador.nombre} – Locador`, margin, y + 22)

    // Firma locatario
    doc.line(pageWidth - margin - 70, y + 15, pageWidth - margin, y + 15)
    doc.text(`${locatario.nombre} – Locatario`, pageWidth - margin - 70, y + 22)

    // Pie de página
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Contrato generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, 285, { align: 'center' })

    // Guardar
    doc.save(`Contrato_001-${idCorto}_${locatario.nombre.replace(/\s/g, '_')}.pdf`)
  }

  // Calcular totales
  const calcularTotal = (r: Reserva) => {
    const noches = calcularNoches(r.fecha_inicio, r.fecha_fin)
    return noches * (r.precio_noche || 0)
  }

  const totalConfirmadas = reservas.filter(r => r.estado === 'confirmada').reduce((acc, r) => acc + calcularTotal(r), 0)
  const totalSenas = reservas.filter(r => r.estado !== 'cancelada').reduce((acc, r) => acc + (r.sena || 0), 0)
  const pendientes = reservas.filter(r => r.estado === 'pendiente').length

  // Calculos del formulario
  const formNoches = calcularNoches(form.check_in, form.check_out)
  const formTotal = formNoches * Number(form.precio_noche)
  const formSaldo = formTotal - Number(form.sena)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Reservas" description="Administra las reservas de tus propiedades">
        {activeTab === 'reservas' && (
          <Button onClick={() => openModal()}>
            <Plus size={18} />
            Nueva Reserva
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-costa-beige/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('reservas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'reservas'
              ? 'bg-white text-costa-navy shadow-sm'
              : 'text-costa-gris hover:text-costa-navy'
          }`}
        >
          Reservas
        </button>
        <button
          onClick={() => setActiveTab('cobros')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'cobros'
              ? 'bg-white text-costa-navy shadow-sm'
              : 'text-costa-gris hover:text-costa-navy'
          }`}
        >
          Cobros
        </button>
        <button
          onClick={() => setActiveTab('gestion')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'gestion'
              ? 'bg-white text-costa-navy shadow-sm'
              : 'text-costa-gris hover:text-costa-navy'
          }`}
        >
          <Wallet size={16} />
          Gestión de Cobros
        </button>
      </div>

      {activeTab === 'reservas' && (
        <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-costa-gris">Total reservas</p>
            <p className="text-2xl font-bold text-costa-navy">{reservas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-costa-gris">Pendientes</p>
            <p className="text-2xl font-bold text-costa-coral">{pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-costa-gris">Ingresos confirmados</p>
            <p className="text-2xl font-bold text-costa-olivo">{formatMonto(totalConfirmadas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-costa-gris">Total señas</p>
            <p className="text-2xl font-bold text-costa-navy">{formatMonto(totalSenas)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vista móvil - Cards */}
      <div className="sm:hidden space-y-3">
        {reservas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">No hay reservas registradas</CardContent>
          </Card>
        ) : (
          reservas.map((reserva) => {
            const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
            const total = noches * (reserva.precio_noche || 0)
            const cobradoAlquiler = cobros
              .filter(c => c.reserva_id === reserva.id && c.aplicar_a === 'alquiler')
              .reduce((acc, c) => acc + (c.monto || 0), 0)
            const saldo = total - cobradoAlquiler
            const moneda = reserva.moneda || 'ARS'
            return (
              <Card key={reserva.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-costa-navy">{reserva.propiedades?.nombre || '-'}{reserva.propiedades?.lote ? ` - Lote ${reserva.propiedades.lote}` : ''}</p>
                      <p className="text-sm text-costa-gris">{reserva.inquilinos?.nombre || '-'}</p>
                    </div>
                    <Badge variant={estadoVariant[reserva.estado as keyof typeof estadoVariant] || 'default'}>
                      {reserva.estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-costa-gris mb-3">
                    <Calendar size={12} />
                    <span>{formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)}</span>
                    <span className="text-costa-navy font-medium">({noches}n)</span>
                    <span className="flex items-center gap-1 ml-2">
                      <Users size={12} />
                      {reserva.cantidad_personas || 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-costa-beige/30 rounded-lg mb-3">
                    <div>
                      <p className="text-xs text-costa-gris">Total</p>
                      <p className="font-semibold text-costa-navy text-sm"><FormatMontoStyled monto={total} moneda={moneda} /></p>
                    </div>
                    <div>
                      <p className="text-xs text-costa-gris">Cobrado</p>
                      <p className="font-semibold text-costa-olivo text-sm"><FormatMontoStyled monto={cobradoAlquiler} moneda={moneda} /></p>
                    </div>
                    <div>
                      <p className="text-xs text-costa-gris">Saldo</p>
                      <p className={`font-semibold text-sm ${saldo > 0 ? 'text-amber-600' : 'text-costa-olivo'}`}>
                        <FormatMontoStyled monto={saldo} moneda={moneda} />
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pt-2 border-t border-costa-beige">
                    {reserva.estado === 'confirmada' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => generarContratoPDF(reserva)} title="Contrato">
                          <FileSignature size={16} className="text-costa-olivo" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => generarReciboPDF(reserva)} title="Detalle">
                          <FileText size={16} className="text-costa-navy" />
                        </Button>
                      </>
                    )}
                    <Link href={`/admin/reservas/${reserva.id}/cobros${isDemo ? '?demo=true' : ''}`}>
                      <Button variant="ghost" size="sm" title="Cobros"><Wallet size={16} className="text-costa-olivo" /></Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => openModal(reserva)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(reserva.id)}><Trash2 size={16} className="text-costa-gris" /></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Vista desktop - Tabla */}
      <Card className="hidden sm:block">
        <CardHeader><CardTitle>Todas las reservas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {reservas.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay reservas registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-costa-beige/50 border-b border-costa-beige">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-costa-gris uppercase">Propiedad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-costa-gris uppercase">Huésped</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-costa-gris uppercase">Período</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-costa-gris uppercase">Pers.</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-costa-gris uppercase">Total</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-costa-gris uppercase">Cobrado</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-costa-gris uppercase">Saldo</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-costa-gris uppercase">Estado</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-costa-gris uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-costa-beige">
                  {reservas.map((reserva) => {
                    const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
                    const total = noches * (reserva.precio_noche || 0)
                    const cobradoAlquiler = cobros
                      .filter(c => c.reserva_id === reserva.id && c.aplicar_a === 'alquiler')
                      .reduce((acc, c) => acc + (c.monto || 0), 0)
                    const saldo = total - cobradoAlquiler
                    const moneda = reserva.moneda || 'ARS'
                    return (
                      <tr key={reserva.id} className="hover:bg-costa-beige/30">
                        <td className="px-3 py-2">
                          <span className="font-medium text-costa-navy text-sm">{reserva.propiedades?.nombre || '-'}{reserva.propiedades?.lote ? ` - Lote ${reserva.propiedades.lote}` : ''}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-costa-navy text-sm">{reserva.inquilinos?.nombre || '-'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-costa-gris text-xs">
                            {formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)}
                            <span className="ml-1 text-costa-navy">({noches}n)</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center text-costa-navy text-sm">
                          {reserva.cantidad_personas || 1}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-costa-navy text-sm">
                          <FormatMontoStyled monto={total} moneda={moneda} />
                        </td>
                        <td className="px-2 py-2 text-right text-costa-olivo text-sm">
                          <FormatMontoStyled monto={cobradoAlquiler} moneda={moneda} />
                        </td>
                        <td className="px-2 py-2 text-right text-sm">
                          <span className={saldo > 0 ? 'font-semibold text-amber-600' : 'text-costa-olivo'}>
                            <FormatMontoStyled monto={saldo} moneda={moneda} />
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant={estadoVariant[reserva.estado as keyof typeof estadoVariant] || 'default'}>
                            {reserva.estado}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <div className="flex justify-end gap-0.5">
                            {reserva.estado === 'confirmada' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => generarContratoPDF(reserva)} title="Generar Contrato PDF">
                                  <FileSignature size={14} className="text-costa-olivo" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => generarReciboPDF(reserva)} title="Generar Detalle PDF">
                                  <FileText size={14} className="text-costa-navy" />
                                </Button>
                              </>
                            )}
                            <Link href={`/admin/reservas/${reserva.id}/cobros${isDemo ? '?demo=true' : ''}`}>
                              <Button variant="ghost" size="sm" title="Gestión de cobros"><Wallet size={14} className="text-costa-olivo" /></Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => openModal(reserva)}><Pencil size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(reserva.id)}><Trash2 size={14} className="text-costa-gris" /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Tab Cobros */}
      {activeTab === 'cobros' && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Cobros</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {cobros.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No hay cobros registrados</div>
            ) : (
              <div className="divide-y divide-costa-beige">
                {/* Agrupar cobros por reserva_id */}
                {Object.entries(
                  cobros.reduce((acc, cobro) => {
                    const key = cobro.reserva_id
                    if (!acc[key]) acc[key] = []
                    acc[key].push(cobro)
                    return acc
                  }, {} as Record<number, Cobro[]>)
                ).map(([reservaId, cobrosList]) => {
                  const firstCobro = cobrosList[0]
                  const totalCobrado = cobrosList.reduce((sum, c) => sum + c.monto, 0)
                  const isExpanded = expandedReservas.has(reservaId)
                  const numReserva = String(reservaId).slice(-6).toUpperCase()

                  return (
                    <div key={reservaId}>
                      {/* Fila principal - clickeable */}
                      <div
                        onClick={() => {
                          const newSet = new Set(expandedReservas)
                          if (isExpanded) newSet.delete(reservaId)
                          else newSet.add(reservaId)
                          setExpandedReservas(newSet)
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-costa-beige/30 cursor-pointer"
                      >
                        <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronDown size={16} className="text-costa-gris" />
                        </div>
                        <div className="flex-1 flex items-center gap-4 min-w-0">
                          <span className="font-medium text-costa-navy truncate">
                            {firstCobro.reservas?.inquilinos?.nombre || '-'}
                          </span>
                          <span className="text-xs text-costa-gris hidden sm:inline">
                            {firstCobro.reservas?.propiedades?.nombre}
                          </span>
                          <span className="text-xs text-costa-gris/70">
                            #{numReserva}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-costa-gris">
                            {cobrosList.length} cobro{cobrosList.length > 1 ? 's' : ''}
                          </span>
                          <span className="font-semibold text-costa-navy text-sm">
                            {formatMonto(totalCobrado, firstCobro.moneda)}
                          </span>
                          <Link href={`/admin/reservas/${reservaId}/cobros${isDemo ? '?demo=true' : ''}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" title="Gestionar cobros">
                              <Wallet size={14} />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {isExpanded && (
                        <div className="bg-costa-beige/20 border-t border-costa-beige">
                          {cobrosList.map((cobro) => (
                            <div key={cobro.id} className="flex items-center gap-3 px-4 py-1.5 pl-10 text-sm border-b border-costa-beige/50 last:border-0">
                              <span className="text-costa-gris w-20">{formatFecha(cobro.fecha)}</span>
                              <Badge variant="info" className="text-xs">{cobro.concepto}</Badge>
                              <span className="text-costa-gris text-xs capitalize flex-1">{cobro.medio_pago}</span>
                              <span className="font-medium text-costa-navy">{formatMonto(cobro.monto, cobro.moneda)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Gestión de Cobros */}
      {activeTab === 'gestion' && (
        <div className="space-y-4">
          {!selectedReservaId ? (
            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Reserva</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-costa-gris mb-4">Seleccioná una reserva para gestionar sus cobros:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reservas.filter(r => r.estado !== 'cancelada').map((reserva) => {
                    const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
                    const total = noches * (reserva.precio_noche || 0)
                    const cobradoAlquiler = cobros
                      .filter(c => c.reserva_id === reserva.id && c.aplicar_a === 'alquiler')
                      .reduce((acc, c) => acc + (c.monto || 0), 0)
                    const saldo = total - cobradoAlquiler

                    return (
                      <button
                        key={reserva.id}
                        onClick={() => setSelectedReservaId(String(reserva.id))}
                        className="text-left p-4 border border-costa-beige rounded-lg hover:border-costa-navy hover:bg-costa-beige/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-costa-navy">{reserva.inquilinos?.nombre || 'Sin inquilino'}</p>
                            <p className="text-xs text-costa-gris">{reserva.propiedades?.nombre}</p>
                          </div>
                          <Badge variant={estadoVariant[reserva.estado as keyof typeof estadoVariant] || 'default'} className="text-xs">
                            {reserva.estado}
                          </Badge>
                        </div>
                        <div className="text-xs text-costa-gris mb-2">
                          {formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)} ({noches}n)
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-costa-gris">Saldo:</span>
                          <span className={saldo > 0 ? 'font-semibold text-amber-600' : 'text-costa-olivo'}>
                            {formatMonto(saldo, reserva.moneda)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              <button
                onClick={() => setSelectedReservaId(null)}
                className="mb-4 text-sm text-costa-gris hover:text-costa-navy flex items-center gap-1"
              >
                ← Volver a seleccionar reserva
              </button>
              <CobrosContent reservaId={selectedReservaId} showNavigation={false} showHeader={true} />
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Reserva' : 'Nueva Reserva'} size="lg">
        {/* Botones sticky arriba */}
        <div className="sticky top-0 z-10 bg-white flex justify-end gap-3 pb-3 mb-4 border-b -mt-2">
          <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
          <Button type="submit" form="reserva-form" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
        </div>

        <form id="reserva-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium text-gray-700 border-b pb-2">Propiedad y titular</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Propiedad"
              value={form.propiedad_id}
              onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
              options={propiedades.map(p => ({ value: p.id.toString(), label: `${p.nombre}${p.lote ? ` - Lote ${p.lote}` : ''}${p.direccion ? ` (${p.direccion})` : ''}` }))}
              required
            />
            <Select
              label="Titular de la reserva"
              value={form.inquilino_id}
              onChange={(e) => handleInquilinoChange(e.target.value)}
              options={inquilinos.map(i => ({ value: i.id.toString(), label: i.nombre }))}
            />
          </div>

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Fechas y horarios</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Input label="Check-in" type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value, check_out: form.check_out && form.check_out < e.target.value ? e.target.value : form.check_out })} required />
            <Input label="Hora ingreso" type="time" value={form.horario_ingreso} onChange={(e) => setForm({ ...form, horario_ingreso: e.target.value })} />
            <Input label="Check-out" type="date" value={form.check_out} min={form.check_in || undefined} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required />
            <Input label="Hora salida" type="time" value={form.horario_salida} onChange={(e) => setForm({ ...form, horario_salida: e.target.value })} />
            <div className="flex items-end">
              <div className="w-full px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <span className="text-2xl font-bold text-blue-600">{formNoches}</span>
                <span className="text-sm text-blue-600 ml-1">noche{formNoches !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Estado con radio buttons */}
          <div className="flex items-center gap-6 pt-2 px-4 py-3 rounded-lg bg-costa-coral/20 border border-costa-coral/30">
            <span className="text-sm font-medium text-costa-navy">Estado:</span>
            {estadosReserva.map((estado) => (
              <label key={estado.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="estado"
                  value={estado.value}
                  checked={form.estado === estado.value}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="w-4 h-4 text-costa-coral border-costa-coral focus:ring-costa-coral"
                />
                <span className={`text-sm ${form.estado === estado.value ? 'font-bold text-costa-navy' : 'text-gray-700'}`}>
                  {estado.label}
                </span>
              </label>
            ))}
          </div>

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Tarifas y pagos</p>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Moneda" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} options={monedas} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio por noche</label>
              <InputNumber value={form.precio_noche} onChange={(val) => setForm({ ...form, precio_noche: val })} />
              {/* Precio sugerido del calendario */}
              {cargandoPrecio && (
                <p className="text-xs text-gray-400 mt-1">Buscando precio...</p>
              )}
              {precioSugerido && !cargandoPrecio && (
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
          {form.check_in && form.check_out && form.precio_noche > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Noches</p>
                <p className="text-xl font-bold text-gray-900">{formNoches}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total alquiler</p>
                <p className="text-xl font-bold text-gray-900">{formatMonto(formTotal, form.moneda)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Depósito</p>
                <p className="text-xl font-bold text-blue-600">{formatMonto(Number(form.deposito), 'USD')}</p>
              </div>
            </div>
          )}

          {/* Acompañantes - Colapsable */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setAcompanantesExpanded(!acompanantesExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users size={16} />
                Acompañantes ({acompanantes.length})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Total: {1 + acompanantes.length} personas
                </span>
                {acompanantesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {acompanantesExpanded && (
              <div className="p-3 pt-0 border-t space-y-3">
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

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Servicios adicionales</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg h-fit">
              <input
                type="checkbox"
                id="ropa_blanca"
                checked={form.ropa_blanca}
                onChange={(e) => setForm({ ...form, ropa_blanca: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="ropa_blanca" className="text-sm text-gray-700">Ropa blanca</label>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incluye_limpieza"
                  checked={form.limpieza_final > 0}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setForm({ ...form, limpieza_final: 0 })
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="incluye_limpieza" className="text-sm text-gray-700">Limpieza final</label>
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <InputNumber value={form.limpieza_final} onChange={(val) => setForm({ ...form, limpieza_final: val })} />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="incluye_lavadero"
                  checked={form.monto_lavadero > 0}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setForm({ ...form, monto_lavadero: 0 })
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="incluye_lavadero" className="text-sm text-gray-700">Lavadero</label>
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <InputNumber value={form.monto_lavadero} onChange={(val) => setForm({ ...form, monto_lavadero: val })} />
              </div>
            </div>
          </div>

          {/* Control de electricidad - Solo KW Inicial */}
          <div className="border rounded-lg p-4 bg-yellow-50/50">
            <div className="flex items-center gap-3 mb-3">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label="KW Inicial (medidor)" type="number" min="0" value={form.kw_inicial || ''} onChange={(e) => setForm({ ...form, kw_inicial: Number(e.target.value) })} />
                <div className="col-span-3 flex items-end">
                  <p className="text-xs text-gray-500">El KW final, costo y cálculo de excedente se registran en la liquidación al finalizar la estadía.</p>
                </div>
              </div>
            )}
          </div>

          <Textarea label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones de la reserva..." />
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
