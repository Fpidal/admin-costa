'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDemoReservaById, getDemoCobrosByReservaId, getDemoLiquidacionByReservaId, demoReservas } from '@/lib/demoData'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { ArrowLeft, Plus, FileText, Receipt, Calculator, Trash2, DollarSign, Calendar, User, Home, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { jsPDF } from 'jspdf'
import Link from 'next/link'

interface Reserva {
  id: number
  propiedad_id: number
  inquilino_id: number
  fecha_inicio: string
  fecha_fin: string
  cantidad_personas: number
  precio_noche: number
  moneda: string
  deposito: number
  deposito_pesos: number
  sena: number
  limpieza_final: number
  monto_lavadero: number
  kw_inicial: number
  estado: string
  propiedades?: { id: number; nombre: string; direccion: string }
  inquilinos?: { id: number; nombre: string; documento: string; telefono: string; email: string }
}

interface Cobro {
  id: number
  reserva_id: number
  fecha: string
  aplicar_a: string // 'alquiler' | 'limpieza' | 'lavadero' | 'deposito'
  concepto: string // texto libre: seña, anticipo, saldo, etc.
  monto: number
  moneda: string
  medio_pago: string
  recibo_generado: boolean
  created_at: string
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

// Opciones para "Aplicar a"
const aplicarAOptions = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'lavadero', label: 'Lavadero' },
  { value: 'deposito', label: 'Depósito' },
]

const conceptoOptions = [
  { value: 'seña', label: 'Seña' },
  { value: 'anticipo', label: 'Anticipo' },
  { value: 'liquidacion', label: 'Liquidación' },
  { value: 'otro', label: 'Otro' },
]

const mediosPago = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

const monedas = [
  { value: 'USD', label: 'Dólares (U$D)' },
  { value: 'ARS', label: 'Pesos ($)' },
]

const formatMonto = (monto: number, moneda: string = 'ARS') => {
  if (!monto && monto !== 0) return '-'
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(monto)
  return moneda === 'USD' ? `U$D ${formatted}` : `$ ${formatted}`
}

// Versión con moneda en tamaño más chico
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

const calcularNoches = (inicio: string, fin: string) => {
  const d1 = new Date(inicio)
  const d2 = new Date(fin)
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

const initialCobroForm = {
  fecha: new Date().toISOString().split('T')[0],
  aplicar_a: 'alquiler',
  concepto: 'seña',
  monto: 0,
  moneda: 'USD',
  medio_pago: 'efectivo',
}

const initialLiquidacion = {
  deposito_recibido: 0,
  kw_final: 0,
  costo_kw: 0,
  consumo_energia: 0,
  roturas: 0,
  otros_descuentos: 0,
  cotizacion_dolar: 0,
  notas: '',
}

function CobrosContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const reservaId = params.id as string

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null)
  const [reservaIds, setReservaIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [liquidacionModalOpen, setLiquidacionModalOpen] = useState(false)
  const [editReservaModalOpen, setEditReservaModalOpen] = useState(false)
  const [cobroForm, setCobroForm] = useState(initialCobroForm)
  const [liquidacionForm, setLiquidacionForm] = useState(initialLiquidacion)
  const [reservaForm, setReservaForm] = useState({
    precio_noche: 0,
    deposito_pesos: 0,
    limpieza_final: 0,
    monto_lavadero: 0,
    kw_inicial: 0,
  })
  const [saving, setSaving] = useState(false)
  const [editingCobroId, setEditingCobroId] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [reservaId, isDemo])

  async function fetchData() {
    setLoading(true)

    if (isDemo) {
      // Demo mode: load demo data
      setReservaIds(demoReservas.map(r => r.id))

      const demoReserva = getDemoReservaById(reservaId)
      if (demoReserva) {
        setReserva({
          id: parseInt(demoReserva.id.replace('demo-res-', '')),
          propiedad_id: parseInt(demoReserva.propiedad_id.replace('demo-prop-', '')),
          inquilino_id: parseInt(demoReserva.inquilino_id.replace('demo-inq-', '')),
          fecha_inicio: demoReserva.fecha_inicio,
          fecha_fin: demoReserva.fecha_fin,
          cantidad_personas: demoReserva.cantidad_personas,
          precio_noche: demoReserva.precio_noche,
          moneda: demoReserva.moneda,
          deposito: demoReserva.deposito,
          deposito_pesos: demoReserva.deposito_pesos,
          sena: demoReserva.sena,
          limpieza_final: demoReserva.limpieza_final,
          monto_lavadero: demoReserva.monto_lavadero,
          kw_inicial: demoReserva.kw_inicial,
          estado: demoReserva.estado,
          propiedades: demoReserva.propiedades ? {
            id: parseInt(demoReserva.propiedades.id.replace('demo-prop-', '')),
            nombre: demoReserva.propiedades.nombre,
            direccion: demoReserva.propiedades.direccion
          } : undefined,
          inquilinos: demoReserva.inquilinos ? {
            id: parseInt(demoReserva.inquilinos.id.replace('demo-inq-', '')),
            nombre: demoReserva.inquilinos.nombre,
            documento: demoReserva.inquilinos.documento,
            telefono: demoReserva.inquilinos.telefono,
            email: demoReserva.inquilinos.email
          } : undefined
        } as Reserva)
      }

      const demoCobros = getDemoCobrosByReservaId(reservaId)
      setCobros(demoCobros.map((c, idx) => ({
        id: idx + 1,
        reserva_id: parseInt(c.reserva_id.replace('demo-res-', '')),
        fecha: c.fecha,
        aplicar_a: c.aplicar_a,
        concepto: c.concepto,
        monto: c.monto,
        moneda: c.moneda,
        medio_pago: c.medio_pago,
        recibo_generado: c.recibo_generado,
        created_at: c.fecha
      })) as Cobro[])

      const demoLiq = getDemoLiquidacionByReservaId(reservaId)
      if (demoLiq) {
        setLiquidacion({
          id: parseInt(demoLiq.id.replace('demo-liq-', '')),
          reserva_id: parseInt(demoLiq.reserva_id.replace('demo-res-', '')),
          deposito_recibido: demoLiq.deposito_recibido,
          kw_final: demoLiq.kw_final,
          costo_kw: demoLiq.costo_kw,
          consumo_energia: demoLiq.consumo_energia,
          roturas: demoLiq.roturas,
          otros_descuentos: demoLiq.otros_descuentos,
          cotizacion_dolar: demoLiq.cotizacion_dolar,
          notas: demoLiq.notas,
          monto_devolver: demoLiq.monto_devolver,
          fecha_liquidacion: demoLiq.fecha_liquidacion
        } as Liquidacion)
        setLiquidacionForm({
          deposito_recibido: demoLiq.deposito_recibido || 0,
          kw_final: demoLiq.kw_final || 0,
          costo_kw: demoLiq.costo_kw || 0,
          consumo_energia: demoLiq.consumo_energia || 0,
          roturas: demoLiq.roturas || 0,
          otros_descuentos: demoLiq.otros_descuentos || 0,
          cotizacion_dolar: demoLiq.cotizacion_dolar || 0,
          notas: demoLiq.notas || '',
        })
      }

      setLoading(false)
      return
    }

    // Fetch all reservation IDs for navigation
    const { data: allReservas } = await supabase
      .from('reservas')
      .select('id')
      .order('fecha_inicio', { ascending: false })

    if (allReservas) {
      setReservaIds(allReservas.map(r => String(r.id)))
    }

    // Fetch reserva with relations
    const { data: reservaData } = await supabase
      .from('reservas')
      .select('*, propiedades(id, nombre, direccion), inquilinos(id, nombre, documento, telefono, email)')
      .eq('id', reservaId)
      .single()

    if (reservaData) setReserva(reservaData)

    // Fetch cobros
    const { data: cobrosData } = await supabase
      .from('cobros')
      .select('*')
      .eq('reserva_id', reservaId)
      .order('fecha', { ascending: true })

    if (cobrosData) setCobros(cobrosData)

    // Fetch liquidacion
    const { data: liquidacionData } = await supabase
      .from('liquidaciones')
      .select('*')
      .eq('reserva_id', reservaId)
      .single()

    if (liquidacionData) {
      setLiquidacion(liquidacionData)
      setLiquidacionForm({
        deposito_recibido: liquidacionData.deposito_recibido || 0,
        kw_final: liquidacionData.kw_final || 0,
        costo_kw: liquidacionData.costo_kw || 0,
        consumo_energia: liquidacionData.consumo_energia || 0,
        roturas: liquidacionData.roturas || 0,
        otros_descuentos: liquidacionData.otros_descuentos || 0,
        cotizacion_dolar: liquidacionData.cotizacion_dolar || 0,
        notas: liquidacionData.notas || '',
      })
    }

    setLoading(false)
  }

  // Navigation between reservations
  const currentIndex = reservaIds.indexOf(reservaId)
  const prevReservaId = currentIndex > 0 ? reservaIds[currentIndex - 1] : null
  const nextReservaId = currentIndex < reservaIds.length - 1 ? reservaIds[currentIndex + 1] : null

  // Cálculos - Montos pactados de la reserva
  const noches = reserva ? calcularNoches(reserva.fecha_inicio, reserva.fecha_fin) : 0
  const monedaAlquiler = reserva?.moneda || 'USD'

  // Valores pactados
  const pactadoAlquiler = reserva ? noches * (reserva.precio_noche || 0) : 0
  const pactadoLimpieza = reserva?.limpieza_final || 0
  const pactadoLavadero = reserva?.monto_lavadero || 0
  // El depósito se guarda en deposito_pesos (en pesos argentinos)
  const pactadoDeposito = reserva?.deposito_pesos || 0

  // Cobrado por "aplicar_a" (nuevo campo)
  const cobradoAlquiler = cobros.filter(c => c.aplicar_a === 'alquiler').reduce((acc, c) => acc + c.monto, 0)
  const cobradoLimpieza = cobros.filter(c => c.aplicar_a === 'limpieza').reduce((acc, c) => acc + c.monto, 0)
  const cobradoLavadero = cobros.filter(c => c.aplicar_a === 'lavadero').reduce((acc, c) => acc + c.monto, 0)
  const cobradoDeposito = cobros.filter(c => c.aplicar_a === 'deposito').reduce((acc, c) => acc + c.monto, 0)

  // Saldos pendientes
  const saldoAlquiler = pactadoAlquiler - cobradoAlquiler
  const saldoLimpieza = pactadoLimpieza - cobradoLimpieza
  const saldoLavadero = pactadoLavadero - cobradoLavadero
  const saldoDeposito = pactadoDeposito - cobradoDeposito

  // Totales generales
  const totalPactado = pactadoAlquiler + pactadoLimpieza + pactadoLavadero + pactadoDeposito
  const totalCobrado = cobradoAlquiler + cobradoLimpieza + cobradoLavadero + cobradoDeposito
  const saldoTotal = totalPactado - totalCobrado

  // Liquidación - cálculo de energía
  const kwInicial = reserva?.kw_inicial || 0
  const kwConsumo = liquidacionForm.kw_final - kwInicial
  const kwPorDia = 110 / 7
  const kwIncluido = Math.round(noches * kwPorDia)
  const kwExcedente = Math.max(0, kwConsumo - kwIncluido)
  const costoEnergia = kwExcedente * (liquidacionForm.costo_kw || 0)

  // Calcular descuentos totales en pesos
  const totalDescuentosPesos = costoEnergia + liquidacionForm.roturas + liquidacionForm.otros_descuentos
  // Convertir descuentos a USD si hay cotización
  const cotizacion = liquidacionForm.cotizacion_dolar || 1
  const descuentosEnUSD = cotizacion > 0 ? totalDescuentosPesos / cotizacion : 0
  // El depósito está en USD, los descuentos se convierten a USD
  const montoDevolver = cobradoDeposito - descuentosEnUSD

  function openCobroModal(cobro?: Cobro) {
    if (cobro) {
      setEditingCobroId(cobro.id)
      setCobroForm({
        fecha: cobro.fecha,
        aplicar_a: cobro.aplicar_a || 'alquiler',
        concepto: cobro.concepto || 'seña',
        monto: cobro.monto,
        moneda: cobro.moneda,
        medio_pago: cobro.medio_pago,
      })
    } else {
      setEditingCobroId(null)
      setCobroForm(initialCobroForm)
    }
    setModalOpen(true)
  }

  function openEditReservaModal() {
    if (reserva) {
      setReservaForm({
        precio_noche: reserva.precio_noche || 0,
        deposito_pesos: reserva.deposito_pesos || 0,
        limpieza_final: reserva.limpieza_final || 0,
        monto_lavadero: reserva.monto_lavadero || 0,
        kw_inicial: reserva.kw_inicial || 0,
      })
    }
    setEditReservaModalOpen(true)
  }

  async function handleSaveReserva(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('reservas')
      .update({
        precio_noche: Number(reservaForm.precio_noche),
        deposito_pesos: Number(reservaForm.deposito_pesos),
        limpieza_final: Number(reservaForm.limpieza_final),
        monto_lavadero: Number(reservaForm.monto_lavadero),
        kw_inicial: Number(reservaForm.kw_inicial),
      })
      .eq('id', reservaId)

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      setEditReservaModalOpen(false)
      fetchData()
    }
    setSaving(false)
  }

  async function handleSaveCobro(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const data = {
      reserva_id: reservaId,
      fecha: cobroForm.fecha,
      aplicar_a: cobroForm.aplicar_a,
      concepto: cobroForm.concepto || null,
      monto: Number(cobroForm.monto),
      moneda: cobroForm.moneda,
      medio_pago: cobroForm.medio_pago,
      recibo_generado: false,
    }

    let error
    if (editingCobroId) {
      const res = await supabase.from('cobros').update(data).eq('id', editingCobroId)
      error = res.error
    } else {
      const res = await supabase.from('cobros').insert(data)
      error = res.error
    }

    if (!error) {
      setModalOpen(false)
      setCobroForm(initialCobroForm)
      setEditingCobroId(null)
      fetchData()
    }
    setSaving(false)
  }

  async function handleDeleteCobro(id: number) {
    if (!confirm('¿Eliminar este cobro?')) return
    await supabase.from('cobros').delete().eq('id', id)
    fetchData()
  }

  async function handleSaveLiquidacion(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const data = {
      reserva_id: reservaId,
      deposito_recibido: cobradoDeposito, // Viene de los cobros con aplicar_a='deposito'
      kw_final: Number(liquidacionForm.kw_final),
      costo_kw: Number(liquidacionForm.costo_kw),
      consumo_energia: costoEnergia,
      roturas: Number(liquidacionForm.roturas),
      otros_descuentos: Number(liquidacionForm.otros_descuentos),
      cotizacion_dolar: Number(liquidacionForm.cotizacion_dolar),
      notas: liquidacionForm.notas || null,
      monto_devolver: montoDevolver,
      fecha_liquidacion: new Date().toISOString().split('T')[0],
    }

    let error
    if (liquidacion) {
      const res = await supabase.from('liquidaciones').update(data).eq('id', liquidacion.id)
      error = res.error
    } else {
      const res = await supabase.from('liquidaciones').insert(data)
      error = res.error
    }

    if (error) {
      alert('Error al guardar liquidación: ' + error.message)
      console.error('Error liquidación:', error)
    } else {
      setLiquidacionModalOpen(false)
      fetchData()
    }
    setSaving(false)
  }

  function generarReciboPDF(cobro: Cobro) {
    if (!reserva) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20

    // Header
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, pageWidth, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE PAGO', pageWidth / 2, 25, { align: 'center' })

    // Número de recibo - usar últimos 6 caracteres del ID
    const numRecibo = String(cobro.id).slice(-6).toUpperCase()
    doc.setFontSize(12)
    doc.text(`N° 001-${numRecibo}`, pageWidth - margin, 35, { align: 'right' })

    // Datos del recibo
    let y = 55
    doc.setTextColor(30, 58, 95)
    doc.setFontSize(11)

    doc.setFont('helvetica', 'bold')
    doc.text('Fecha:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(formatFecha(cobro.fecha), margin + 30, y)

    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Recibí de:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(reserva.inquilinos?.nombre || '-', margin + 35, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Documento:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(reserva.inquilinos?.documento || '-', margin + 35, y)

    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Aplicado a:', margin, y)
    doc.setFont('helvetica', 'normal')
    const aplicarALabel = aplicarAOptions.find(a => a.value === cobro.aplicar_a)?.label || cobro.aplicar_a
    doc.text(aplicarALabel, margin + 35, y)

    if (cobro.concepto) {
      y += 8
      doc.setFont('helvetica', 'bold')
      doc.text('Concepto:', margin, y)
      doc.setFont('helvetica', 'normal')
      const conceptoLabel = conceptoOptions.find(c => c.value === cobro.concepto)?.label || cobro.concepto
      doc.text(conceptoLabel, margin + 35, y)
    }

    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Propiedad:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(reserva.propiedades?.nombre || '-', margin + 35, y)

    y += 8
    doc.text(reserva.propiedades?.direccion || '', margin + 35, y)

    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Período:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${formatFecha(reserva.fecha_inicio)} al ${formatFecha(reserva.fecha_fin)}`, margin + 35, y)

    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Medio de pago:', margin, y)
    doc.setFont('helvetica', 'normal')
    const medioLabel = mediosPago.find(m => m.value === cobro.medio_pago)?.label || cobro.medio_pago
    doc.text(medioLabel, margin + 45, y)

    // Monto destacado
    y += 25
    doc.setFillColor(245, 245, 245)
    doc.rect(margin, y - 8, pageWidth - margin * 2, 25, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('MONTO RECIBIDO:', margin + 10, y + 5)
    doc.setFontSize(18)
    doc.text(formatMonto(cobro.monto, cobro.moneda), pageWidth - margin - 10, y + 5, { align: 'right' })

    // Footer
    y += 50
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('_______________________________', margin, y)
    doc.text('Firma', margin + 30, y + 8)

    doc.text('_______________________________', pageWidth - margin - 70, y)
    doc.text('Aclaración', pageWidth - margin - 40, y + 8)

    // Pie
    doc.setFontSize(8)
    doc.text('Admin Costa - Gestión de Alquileres', pageWidth / 2, 280, { align: 'center' })
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, 285, { align: 'center' })

    doc.save(`Recibo_001-${numRecibo}_${reserva.inquilinos?.nombre?.replace(/\s/g, '_') || 'pago'}.pdf`)

    // Marcar como generado
    supabase.from('cobros').update({ recibo_generado: true }).eq('id', cobro.id).then(() => fetchData())
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  if (!reserva) {
    return <div className="text-center py-10 text-gray-500">Reserva no encontrada</div>
  }

  const demoParam = isDemo ? '?demo=true' : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link href={`/admin/reservas${demoParam}`} className="inline-flex items-center gap-1 text-sm text-costa-gris hover:text-costa-navy transition-colors">
          <ArrowLeft size={16} />
          Volver
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => prevReservaId && router.push(`/admin/reservas/${prevReservaId}/cobros${demoParam}`)}
            disabled={!prevReservaId}
            className={`p-1.5 rounded transition-colors ${prevReservaId ? 'text-costa-navy hover:bg-costa-beige' : 'text-gray-300 cursor-not-allowed'}`}
            title="Reserva anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-costa-navy">
            Gestión de Cobros - #{String(reserva.id).slice(-6).toUpperCase()}
          </h1>
          <button
            onClick={() => nextReservaId && router.push(`/admin/reservas/${nextReservaId}/cobros${demoParam}`)}
            disabled={!nextReservaId}
            className={`p-1.5 rounded transition-colors ${nextReservaId ? 'text-costa-navy hover:bg-costa-beige' : 'text-gray-300 cursor-not-allowed'}`}
            title="Reserva siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="w-16"></div>
      </div>

      {/* Header con datos de la reserva */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Home className="text-costa-navy" size={16} />
                <span className="font-medium text-costa-navy">{reserva.propiedades?.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="text-costa-navy" size={16} />
                <span className="text-costa-navy">{reserva.inquilinos?.nombre}</span>
                <span className="text-costa-gris text-xs">({reserva.inquilinos?.documento})</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="text-costa-navy" size={16} />
                <span className="text-costa-gris">{formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)}</span>
                <span className="text-costa-navy font-medium">{noches}n • {reserva.cantidad_personas}p</span>
              </div>
              <div className="flex items-center gap-2 text-costa-gris">
                <DollarSign size={14} />
                <span>Alquiler: {formatMonto(pactadoAlquiler, monedaAlquiler)}</span>
                <span className="mx-1">•</span>
                <span>Depósito: {formatMonto(pactadoDeposito, 'ARS')}</span>
              </div>
            </div>
            <button
              onClick={openEditReservaModal}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-costa-navy hover:bg-costa-beige rounded transition-colors"
            >
              <Pencil size={14} />
              Editar
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ALQUILER - Total del alquiler */}
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign size={16} />
              Alquiler
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="space-y-1.5 text-sm">
              {/* Total pactado */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Total ({noches} noches × <FormatMontoStyled monto={reserva?.precio_noche || 0} moneda={monedaAlquiler} />)</span>
                <span className="font-medium"><FormatMontoStyled monto={pactadoAlquiler} moneda={monedaAlquiler} /></span>
              </div>
              {/* Cobrado */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Cobrado</span>
                <span className={cobradoAlquiler > 0 ? 'font-medium text-costa-olivo' : 'text-costa-gris'}>
                  <FormatMontoStyled monto={cobradoAlquiler} moneda={monedaAlquiler} />
                </span>
              </div>
              {/* Saldo */}
              <div className={`flex justify-between pt-1.5 px-2 py-1.5 rounded font-semibold ${saldoAlquiler === 0 ? 'bg-costa-olivo/10' : 'bg-costa-coral/10'}`}>
                <span className={saldoAlquiler === 0 ? 'text-costa-olivo' : 'text-costa-coral'}>
                  {saldoAlquiler === 0 ? 'COMPLETO ✓' : 'PENDIENTE'}
                </span>
                <span className={saldoAlquiler === 0 ? 'text-costa-olivo' : 'text-costa-coral'}>
                  <FormatMontoStyled monto={saldoAlquiler === 0 ? pactadoAlquiler : saldoAlquiler} moneda={monedaAlquiler} />
                </span>
              </div>
              {/* Detalle de cobros de alquiler */}
              {cobros.filter(c => c.aplicar_a === 'alquiler').length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  <p className="text-xs text-costa-gris mb-1">Pagos registrados:</p>
                  {cobros.filter(c => c.aplicar_a === 'alquiler').map(c => (
                    <div key={c.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-costa-gris">{formatFecha(c.fecha)} - {conceptoOptions.find(opt => opt.value === c.concepto)?.label || c.concepto || 'Pago'}</span>
                      <span className="text-costa-olivo">{formatMonto(c.monto, c.moneda)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* LIMPIEZA - Limpieza Final + Lavadero */}
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calculator size={16} />
              Limpieza
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="space-y-1.5 text-sm">
              {/* Limpieza final */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Limpieza final</span>
                <span className="font-medium">{formatMonto(pactadoLimpieza, 'ARS')}</span>
              </div>
              {/* Lavadero */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Lavadero</span>
                <span className="font-medium">{formatMonto(pactadoLavadero, 'ARS')}</span>
              </div>
              {/* Total pactado */}
              <div className="flex justify-between py-1 border-b border-costa-beige bg-costa-beige/30 px-2 rounded">
                <span className="font-medium text-costa-navy">Total</span>
                <span className="font-medium text-costa-navy">{formatMonto(pactadoLimpieza + pactadoLavadero, 'ARS')}</span>
              </div>
              {/* Cobrado */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Cobrado</span>
                <span className={cobradoLimpieza + cobradoLavadero > 0 ? 'font-medium text-costa-olivo' : 'text-costa-gris'}>
                  {formatMonto(cobradoLimpieza + cobradoLavadero, 'ARS')}
                </span>
              </div>
              {/* Saldo */}
              {(() => {
                const totalLimpieza = pactadoLimpieza + pactadoLavadero
                const cobradoTotal = cobradoLimpieza + cobradoLavadero
                const saldo = totalLimpieza - cobradoTotal
                return (
                  <div className={`flex justify-between pt-1.5 px-2 py-1.5 rounded font-semibold ${saldo === 0 ? 'bg-costa-olivo/10' : 'bg-costa-coral/10'}`}>
                    <span className={saldo === 0 ? 'text-costa-olivo' : 'text-costa-coral'}>
                      {saldo === 0 ? 'COMPLETO ✓' : 'PENDIENTE'}
                    </span>
                    <span className={saldo === 0 ? 'text-costa-olivo' : 'text-costa-coral'}>
                      {saldo === 0 ? formatMonto(totalLimpieza, 'ARS') : formatMonto(saldo, 'ARS')}
                    </span>
                  </div>
                )
              })()}
              {/* Detalle de cobros de limpieza/lavadero */}
              {cobros.filter(c => c.aplicar_a === 'limpieza' || c.aplicar_a === 'lavadero').length > 0 && (
                <div className="mt-2 pt-2 border-t border-dashed">
                  <p className="text-xs text-costa-gris mb-1">Pagos registrados:</p>
                  {cobros.filter(c => c.aplicar_a === 'limpieza' || c.aplicar_a === 'lavadero').map(c => (
                    <div key={c.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-costa-gris">{formatFecha(c.fecha)} - {conceptoOptions.find(opt => opt.value === c.concepto)?.label || c.concepto || (c.aplicar_a === 'limpieza' ? 'Limpieza' : 'Lavadero')}</span>
                      <span className="text-costa-olivo">{formatMonto(c.monto, c.moneda)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* LIQUIDACIÓN - Depósito y devolución */}
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Receipt size={16} />
                Liquidación Final
              </span>
              <Button size="sm" variant="secondary" onClick={() => setLiquidacionModalOpen(true)} className="text-xs py-1 px-2">
                {liquidacion ? 'Editar' : 'Cargar'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="space-y-1.5 text-sm">
              {/* Depósito pactado */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Depósito pactado</span>
                <span className="font-medium">
                  <FormatMontoStyled monto={pactadoDeposito} moneda={monedaAlquiler} />
                </span>
              </div>
              {/* Depósito recibido */}
              <div className="flex justify-between py-1 border-b border-costa-beige">
                <span className="text-costa-gris">Depósito recibido</span>
                <span className={cobradoDeposito > 0 ? 'font-medium text-costa-olivo' : 'text-costa-gris'}>
                  <FormatMontoStyled monto={cobradoDeposito} moneda="USD" />
                </span>
              </div>

              {liquidacion ? (
                <>
                  {/* Cotización */}
                  {liquidacion.cotizacion_dolar > 0 && (
                    <div className="flex justify-between py-0.5 text-xs border-b border-costa-beige">
                      <span className="text-costa-gris">Cotización dólar blue</span>
                      <span className="text-costa-gris">{formatMonto(liquidacion.cotizacion_dolar, 'ARS')}</span>
                    </div>
                  )}

                  {/* Descuentos en pesos */}
                  {(liquidacion.consumo_energia > 0 || liquidacion.roturas > 0 || liquidacion.otros_descuentos > 0) && (
                    <>
                      <div className="text-xs text-costa-gris font-medium pt-1 pb-1">Descuentos (en pesos):</div>
                      {liquidacion.consumo_energia > 0 && (
                        <div className="flex justify-between py-0.5 text-costa-coral text-xs pl-2">
                          <span>Energía ({kwExcedente} KW exc.)</span>
                          <span>-{formatMonto(liquidacion.consumo_energia, 'ARS')}</span>
                        </div>
                      )}
                      {liquidacion.roturas > 0 && (
                        <div className="flex justify-between py-0.5 text-costa-coral text-xs pl-2">
                          <span>Roturas/Daños</span>
                          <span>-{formatMonto(liquidacion.roturas, 'ARS')}</span>
                        </div>
                      )}
                      {liquidacion.otros_descuentos > 0 && (
                        <div className="flex justify-between py-0.5 text-costa-coral text-xs pl-2">
                          <span>Otros</span>
                          <span>-{formatMonto(liquidacion.otros_descuentos, 'ARS')}</span>
                        </div>
                      )}
                      {/* Total descuentos convertido a USD */}
                      {liquidacion.cotizacion_dolar > 0 && (
                        <div className="flex justify-between py-0.5 text-xs pl-2 pt-1 border-t border-dashed">
                          <span className="text-costa-coral">Total en USD</span>
                          <span className="text-costa-coral font-medium">
                            -{formatMonto(((liquidacion.consumo_energia || 0) + (liquidacion.roturas || 0) + (liquidacion.otros_descuentos || 0)) / liquidacion.cotizacion_dolar, 'USD')}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Monto a devolver en USD */}
                  {(() => {
                    const totalDescPesos = (liquidacion.consumo_energia || 0) + (liquidacion.roturas || 0) + (liquidacion.otros_descuentos || 0)
                    const cotiz = liquidacion.cotizacion_dolar || 1
                    const descEnUSD = cotiz > 0 ? totalDescPesos / cotiz : 0
                    const aDevolver = cobradoDeposito - descEnUSD
                    return (
                      <div className={`flex justify-between pt-1.5 px-2 py-1.5 rounded font-semibold ${aDevolver >= 0 ? 'bg-costa-olivo/10' : 'bg-costa-coral/10'}`}>
                        <span className={aDevolver >= 0 ? 'text-costa-olivo' : 'text-costa-coral'}>
                          {aDevolver >= 0 ? 'A DEVOLVER' : 'DEBE PAGAR'}
                        </span>
                        <span className={aDevolver >= 0 ? 'text-costa-olivo' : 'text-costa-coral'}>
                          <FormatMontoStyled monto={Math.abs(aDevolver)} moneda="USD" />
                        </span>
                      </div>
                    )
                  })()}

                  {liquidacion.notas && (
                    <div className="mt-2 pt-2 border-t border-dashed">
                      <p className="text-xs text-costa-gris">Notas: <span className="italic">{liquidacion.notas}</span></p>
                    </div>
                  )}
                </>
              ) : (
                cobradoDeposito > 0 && (
                  <div className="text-center py-2">
                    <p className="text-xs text-costa-gris">Cargar liquidación para calcular devolución</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de cobros */}
      <Card className="mt-4">
        <CardHeader className="py-2 px-4">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Pagos Registrados</span>
            <Button onClick={() => openCobroModal()} size="sm" className="text-xs">
              <Plus size={14} className="mr-1" />
              Registrar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          {cobros.length === 0 ? (
            <p className="text-center text-costa-gris py-4 text-sm">No hay pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 text-xs font-medium text-costa-gris">Fecha</th>
                    <th className="pb-2 text-xs font-medium text-costa-gris">Aplicado a</th>
                    <th className="pb-2 text-xs font-medium text-costa-gris">Concepto</th>
                    <th className="pb-2 text-xs font-medium text-costa-gris">Medio</th>
                    <th className="pb-2 text-xs font-medium text-costa-gris text-right">Monto</th>
                    <th className="pb-2 text-xs font-medium text-costa-gris text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cobros.map((cobro) => (
                    <tr key={cobro.id} className="border-b last:border-0">
                      <td className="py-1.5">{formatFecha(cobro.fecha)}</td>
                      <td className="py-1.5">
                        <Badge variant={cobro.aplicar_a === 'alquiler' ? 'info' : cobro.aplicar_a === 'deposito' ? 'warning' : 'default'}>
                          {aplicarAOptions.find(a => a.value === cobro.aplicar_a)?.label || cobro.aplicar_a}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-costa-gris">
                        {conceptoOptions.find(c => c.value === cobro.concepto)?.label || cobro.concepto || '-'}
                      </td>
                      <td className="py-1.5 text-costa-gris">
                        {mediosPago.find(m => m.value === cobro.medio_pago)?.label}
                      </td>
                      <td className="py-1.5 font-medium text-right">
                        {formatMonto(cobro.monto, cobro.moneda)}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => generarReciboPDF(cobro)}
                            className="p-1 text-costa-navy hover:bg-costa-beige rounded transition-colors"
                            title="Generar recibo PDF"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            onClick={() => openCobroModal(cobro)}
                            className="p-1 text-costa-olivo hover:bg-costa-olivo/10 rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCobro(cobro.id)}
                            className="p-1 text-costa-coral hover:bg-costa-coral/10 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal nuevo cobro */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingCobroId(null); setCobroForm(initialCobroForm); }} title={editingCobroId ? "Editar Pago" : "Registrar Pago"}>
        <form onSubmit={handleSaveCobro} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Aplicar a"
              value={cobroForm.aplicar_a}
              onChange={(e) => {
                const aplicar_a = e.target.value
                // Auto-seleccionar moneda según concepto
                // Limpieza y lavadero en ARS, depósito siempre en USD, alquiler según reserva
                const monedaAuto = (aplicar_a === 'limpieza' || aplicar_a === 'lavadero') ? 'ARS' :
                                   (aplicar_a === 'deposito') ? 'USD' : monedaAlquiler
                setCobroForm({ ...cobroForm, aplicar_a, moneda: monedaAuto })
              }}
              options={aplicarAOptions}
              required
            />
            <Select
              label="Concepto"
              value={cobroForm.concepto}
              onChange={(e) => setCobroForm({ ...cobroForm, concepto: e.target.value })}
              options={conceptoOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={cobroForm.fecha}
              onChange={(e) => setCobroForm({ ...cobroForm, fecha: e.target.value })}
              required
            />
            <Select
              label="Medio de pago"
              value={cobroForm.medio_pago}
              onChange={(e) => setCobroForm({ ...cobroForm, medio_pago: e.target.value })}
              options={mediosPago}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto"
              type="number"
              min="0"
              step="0.01"
              value={cobroForm.monto || ''}
              onChange={(e) => setCobroForm({ ...cobroForm, monto: Number(e.target.value) })}
              required
            />
            <Select
              label="Moneda"
              value={cobroForm.moneda}
              onChange={(e) => setCobroForm({ ...cobroForm, moneda: e.target.value })}
              options={monedas}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal liquidación */}
      <Modal isOpen={liquidacionModalOpen} onClose={() => setLiquidacionModalOpen(false)} title="Liquidación Final">
        <form onSubmit={handleSaveLiquidacion} className="space-y-4">
          {/* Depósito recibido - viene de los cobros */}
          <div className="border rounded-lg p-3 bg-costa-beige/30">
            <p className="text-sm font-medium text-costa-navy mb-2">Depósito</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-costa-gris mb-1">Depósito pactado</label>
                <div className="px-3 py-2 bg-gray-100 rounded text-sm text-costa-gris">
                  {formatMonto(pactadoDeposito, monedaAlquiler)}
                </div>
              </div>
              <div>
                <label className="block text-xs text-costa-gris mb-1">Depósito recibido</label>
                <div className="px-3 py-2 bg-costa-olivo/10 rounded text-sm font-medium text-costa-olivo">
                  {formatMonto(cobradoDeposito, 'ARS')}
                </div>
              </div>
            </div>
            {cobradoDeposito === 0 && (
              <p className="text-xs text-costa-coral mt-2">* Registrar el pago del depósito en "Registrar Pago" con "Aplicar a: Depósito"</p>
            )}
          </div>

          {/* Control de Electricidad */}
          <div className="border rounded-lg p-3 bg-yellow-50/50">
            <p className="text-sm font-medium text-costa-navy mb-2">Control de Electricidad (110 KW cada 7 días)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-costa-gris mb-1">KW Inicial</label>
                <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium text-costa-navy">
                  {reserva?.kw_inicial || 0}
                </div>
              </div>
              <Input
                label="KW Final"
                type="number"
                min="0"
                value={liquidacionForm.kw_final || ''}
                onChange={(e) => setLiquidacionForm({ ...liquidacionForm, kw_final: Number(e.target.value) })}
              />
              <Input
                label="Costo x KW"
                type="number"
                min="0"
                step="0.01"
                value={liquidacionForm.costo_kw || ''}
                onChange={(e) => setLiquidacionForm({ ...liquidacionForm, costo_kw: Number(e.target.value) })}
              />
            </div>
            {/* Cálculo automático de energía */}
            {liquidacionForm.kw_final > 0 && (
              <div className="mt-2 pt-2 border-t border-yellow-200 text-xs space-y-1">
                {(() => {
                  const kwInicial = reserva?.kw_inicial || 0
                  const consumido = liquidacionForm.kw_final - kwInicial
                  const kwPorDia = 110 / 7
                  const incluido = Math.round(noches * kwPorDia)
                  const excedente = Math.max(0, consumido - incluido)
                  const costoExcedente = excedente * (liquidacionForm.costo_kw || 0)
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-costa-gris">Consumo total:</span>
                        <span className="font-medium">{consumido} KW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-costa-gris">Incluido ({noches} días):</span>
                        <span className="font-medium">{incluido} KW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-costa-gris">Excedente:</span>
                        <span className={`font-medium ${excedente > 0 ? 'text-costa-coral' : 'text-costa-olivo'}`}>{excedente} KW</span>
                      </div>
                      {excedente > 0 && (
                        <div className="flex justify-between pt-1 border-t border-yellow-200 font-semibold">
                          <span>Costo energía:</span>
                          <span className="text-costa-coral">{formatMonto(costoExcedente, 'ARS')}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Descuentos */}
          <div className="border rounded-lg p-3">
            <p className="text-sm font-medium text-costa-navy mb-2">Descuentos (en pesos)</p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Roturas/Daños ($)"
                type="number"
                min="0"
                value={liquidacionForm.roturas || ''}
                onChange={(e) => setLiquidacionForm({ ...liquidacionForm, roturas: Number(e.target.value) })}
              />
              <Input
                label="Otros descuentos ($)"
                type="number"
                min="0"
                value={liquidacionForm.otros_descuentos || ''}
                onChange={(e) => setLiquidacionForm({ ...liquidacionForm, otros_descuentos: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Cotización dólar blue */}
          <div className="border rounded-lg p-3 bg-blue-50/50">
            <p className="text-sm font-medium text-costa-navy mb-2">Conversión a Dólares</p>
            <Input
              label="Cotización dólar blue ($)"
              type="number"
              min="0"
              step="0.01"
              value={liquidacionForm.cotizacion_dolar || ''}
              onChange={(e) => setLiquidacionForm({ ...liquidacionForm, cotizacion_dolar: Number(e.target.value) })}
              placeholder="Ej: 1200"
            />
            {liquidacionForm.cotizacion_dolar > 0 && totalDescuentosPesos > 0 && (
              <p className="text-xs text-costa-gris mt-2">
                Descuentos: {formatMonto(totalDescuentosPesos, 'ARS')} = {formatMonto(descuentosEnUSD, 'USD')}
              </p>
            )}
          </div>

          <Textarea
            label="Notas (detalle de descuentos, observaciones)"
            value={liquidacionForm.notas}
            onChange={(e) => setLiquidacionForm({ ...liquidacionForm, notas: e.target.value })}
            rows={2}
            placeholder="Ej: Rotura de vaso, mancha en sábana..."
          />

          <div className="p-3 bg-costa-beige/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-costa-navy">Monto a devolver:</span>
              <span className={`text-xl font-bold ${montoDevolver >= 0 ? 'text-costa-olivo' : 'text-costa-coral'}`}>
                <FormatMontoStyled monto={montoDevolver} moneda="USD" />
              </span>
            </div>
            {montoDevolver < 0 && (
              <p className="text-xs text-costa-coral mt-1">El inquilino debe abonar este monto adicional</p>
            )}
            {liquidacionForm.cotizacion_dolar > 0 && (
              <p className="text-xs text-costa-gris mt-1">
                Depósito: <FormatMontoStyled monto={cobradoDeposito} moneda="USD" /> - Descuentos: <FormatMontoStyled monto={descuentosEnUSD} moneda="USD" />
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setLiquidacionModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar reserva */}
      <Modal isOpen={editReservaModalOpen} onClose={() => setEditReservaModalOpen(false)} title="Editar Reserva">
        <form onSubmit={handleSaveReserva} className="space-y-4">
          <div className="flex justify-end gap-3 pb-3 border-b">
            <Button type="button" variant="secondary" onClick={() => setEditReservaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Actualizar'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Precio por noche (${monedaAlquiler})`}
              type="number"
              min="0"
              value={reservaForm.precio_noche || ''}
              onChange={(e) => setReservaForm({ ...reservaForm, precio_noche: Number(e.target.value) })}
            />
            <Input
              label="Depósito ($)"
              type="number"
              min="0"
              value={reservaForm.deposito_pesos || ''}
              onChange={(e) => setReservaForm({ ...reservaForm, deposito_pesos: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Limpieza final ($)"
              type="number"
              min="0"
              value={reservaForm.limpieza_final || ''}
              onChange={(e) => setReservaForm({ ...reservaForm, limpieza_final: Number(e.target.value) })}
            />
            <Input
              label="Lavadero ($)"
              type="number"
              min="0"
              value={reservaForm.monto_lavadero || ''}
              onChange={(e) => setReservaForm({ ...reservaForm, monto_lavadero: Number(e.target.value) })}
            />
          </div>
          <Input
            label="KW Inicial"
            type="number"
            min="0"
            value={reservaForm.kw_inicial || ''}
            onChange={(e) => setReservaForm({ ...reservaForm, kw_inicial: Number(e.target.value) })}
          />
        </form>
      </Modal>
    </div>
  )
}

export default function CobrosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <CobrosContent />
    </Suspense>
  )
}
