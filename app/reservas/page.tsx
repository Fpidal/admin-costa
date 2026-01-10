'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { Plus, Calendar, User, Home, Pencil, Trash2, DollarSign, Users, X, ChevronDown, ChevronUp, Check, Zap, Clock, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'

interface Propiedad {
  id: number
  nombre: string
}

interface Inquilino {
  id: number
  nombre: string
  documento: string
  telefono: string
  email: string
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
  sena: number
  forma_pago: string
  ropa_blanca: boolean
  limpieza_final: number
  lavadero: boolean
  kw_inicial: number
  kw_final: number
  costo_kw: number
  estado: string
  notas: string
  acompanantes: Acompanante[]
  propiedades?: Propiedad
  inquilinos?: Inquilino
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
  { value: 'ARS', label: '$ Pesos' },
  { value: 'USD', label: 'U$D Dólares' },
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
  moneda: 'ARS',
  precio_noche: 0,
  deposito: 0,
  sena: 0,
  forma_pago: 'efectivo',
  ropa_blanca: false,
  limpieza_final: 0,
  lavadero: false,
  kw_inicial: 0,
  kw_final: 0,
  costo_kw: 0,
  estado: 'pendiente',
  notas: '',
}

const emptyAcompanante: Acompanante = { nombre: '', apellido: '', documento: '', edad: '' }

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [resReservas, resPropiedades, resInquilinos] = await Promise.all([
      supabase.from('reservas').select('*, propiedades(id, nombre), inquilinos(id, nombre, documento, telefono, email, acompanantes)').order('fecha_inicio', { ascending: false }),
      supabase.from('propiedades').select('id, nombre').order('nombre'),
      supabase.from('inquilinos').select('id, nombre, documento, telefono, email, acompanantes').order('nombre')
    ])

    if (resReservas.data) setReservas(resReservas.data)
    if (resPropiedades.data) setPropiedades(resPropiedades.data)
    if (resInquilinos.data) setInquilinos(resInquilinos.data)
    setLoading(false)
  }

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
        sena: reserva.sena || 0,
        forma_pago: reserva.forma_pago || 'efectivo',
        ropa_blanca: reserva.ropa_blanca || false,
        limpieza_final: reserva.limpieza_final || 0,
        lavadero: reserva.lavadero || false,
        kw_inicial: reserva.kw_inicial || 0,
        kw_final: reserva.kw_final || 0,
        costo_kw: reserva.costo_kw || 0,
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
      sena: Number(form.sena),
      forma_pago: form.forma_pago,
      ropa_blanca: form.ropa_blanca,
      limpieza_final: Number(form.limpieza_final),
      lavadero: form.lavadero,
      kw_inicial: Number(form.kw_inicial),
      kw_final: Number(form.kw_final),
      costo_kw: Number(form.costo_kw),
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
      const { error } = await supabase.from('reservas').insert([data])
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
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return
    const { error } = await supabase.from('reservas').delete().eq('id', id)
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

    // Colores
    const azulPrincipal = { r: 30, g: 64, b: 175 }
    const celesteClaro = { r: 219, g: 234, b: 254 }

    // Datos de la propiedad
    const nombrePropiedad = reserva.propiedades?.nombre || 'Propiedad'
    const esGolf = nombrePropiedad.toLowerCase().includes('golf')
    const contacto = esGolf
      ? { direccion: 'Golf 234, Costa Esmeralda', tel: '+54 11 1234-5678' }
      : { direccion: 'Deportiva 9, Costa Esmeralda', tel: '+54 11 1234-5678' }

    // Número de recibo formato 001-000001
    const numRecibo = `001-${String(reserva.id).padStart(6, '0')}`

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

    // Recibo a la derecha del encabezado
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO', pageWidth - 15, 12, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`N° ${numRecibo}`, pageWidth - 15, 19, { align: 'right' })
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
    if (reserva.lavadero) servicios.push('Acceso a lavadero')
    if (reserva.limpieza_final && reserva.limpieza_final > 0) servicios.push(`Limpieza final: ${simbolo} ${reserva.limpieza_final.toLocaleString('es-AR')}`)

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

    // ===== CONDICIONES (más arriba) =====
    y = Math.max(y + 5, 200)
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

    // ===== PIE =====
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(8)
    doc.text('Admin Costa - Sistema de Gestión de Alquileres', pageWidth / 2, 280, { align: 'center' })
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, pageWidth / 2, 285, { align: 'center' })

    // Guardar
    doc.save(`Recibo_${numRecibo}_${reserva.inquilinos?.nombre?.replace(/\s/g, '_') || 'reserva'}.pdf`)
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
        <Button onClick={() => openModal()}>
          <Plus size={18} />
          Nueva Reserva
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total reservas</p>
            <p className="text-2xl font-bold text-gray-900">{reservas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Ingresos confirmados</p>
            <p className="text-2xl font-bold text-costa-olivo">{formatMonto(totalConfirmadas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-500">Total señas</p>
            <p className="text-2xl font-bold text-blue-600">{formatMonto(totalSenas)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader><CardTitle>Todas las reservas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {reservas.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No hay reservas registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Huésped</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Personas</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Seña</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reservas.map((reserva) => {
                    const noches = calcularNoches(reserva.fecha_inicio, reserva.fecha_fin)
                    const total = noches * (reserva.precio_noche || 0)
                    const saldo = total - (reserva.sena || 0)
                    const moneda = reserva.moneda || 'ARS'
                    return (
                      <tr key={reserva.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Home size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900">{reserva.propiedades?.nombre || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <div>
                              <span className="text-gray-900 font-medium">{reserva.inquilinos?.nombre || '-'}</span>
                              {reserva.inquilinos?.telefono && (
                                <p className="text-xs text-gray-500">{reserva.inquilinos.telefono}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            <div>
                              <span className="text-gray-700">{formatFecha(reserva.fecha_inicio)} → {formatFecha(reserva.fecha_fin)}</span>
                              <p className="text-xs text-gray-500">{noches} noches · {formatMonto(reserva.precio_noche || 0, moneda)}/noche</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                          {reserva.cantidad_personas || 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                          {formatMonto(total, moneda)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-costa-olivo">
                          {formatMonto(reserva.sena || 0, moneda)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={saldo > 0 ? 'font-semibold text-amber-600' : 'text-costa-olivo'}>
                            {formatMonto(saldo, moneda)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={estadoVariant[reserva.estado as keyof typeof estadoVariant] || 'default'}>
                            {reserva.estado}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            {reserva.estado === 'confirmada' && (
                              <Button variant="ghost" size="sm" onClick={() => generarReciboPDF(reserva)} title="Generar Recibo PDF">
                                <FileText size={16} className="text-blue-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openModal(reserva)}><Pencil size={16} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(reserva.id)}><Trash2 size={16} className="text-costa-gris" /></Button>
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

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Reserva' : 'Nueva Reserva'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium text-gray-700 border-b pb-2">Propiedad y titular</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Propiedad"
              value={form.propiedad_id}
              onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
              options={propiedades.map(p => ({ value: p.id.toString(), label: p.nombre }))}
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

          <p className="text-sm font-medium text-gray-700 border-b pb-2 pt-2">Tarifas y pagos</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Select label="Moneda" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} options={monedas} />
            <Input label="Precio por noche" type="number" min="0" value={form.precio_noche || ''} onChange={(e) => setForm({ ...form, precio_noche: Number(e.target.value) })} />
            <Input label="Depósito" type="number" min="0" value={form.deposito || ''} onChange={(e) => setForm({ ...form, deposito: Number(e.target.value) })} />
            <Input label="Seña" type="number" min="0" value={form.sena || ''} onChange={(e) => setForm({ ...form, sena: Number(e.target.value) })} />
            <Select label="Forma de pago" value={form.forma_pago} onChange={(e) => setForm({ ...form, forma_pago: e.target.value })} options={formasPago} />
          </div>

          {/* Resumen calculado */}
          {form.check_in && form.check_out && form.precio_noche > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-4 gap-4 text-center">
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
                <p className="text-xl font-bold text-blue-600">{formatMonto(Number(form.deposito), form.moneda)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo pendiente</p>
                <p className={`text-xl font-bold ${formSaldo > 0 ? 'text-amber-600' : 'text-costa-olivo'}`}>{formatMonto(formSaldo, form.moneda)}</p>
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
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="ropa_blanca"
                checked={form.ropa_blanca}
                onChange={(e) => setForm({ ...form, ropa_blanca: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="ropa_blanca" className="text-sm text-gray-700">Ropa blanca</label>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="lavadero"
                checked={form.lavadero}
                onChange={(e) => setForm({ ...form, lavadero: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="lavadero" className="text-sm text-gray-700">Lavadero</label>
            </div>
            <Input label="Limpieza final" type="number" min="0" value={form.limpieza_final || ''} onChange={(e) => setForm({ ...form, limpieza_final: Number(e.target.value) })} />
          </div>

          {/* Control de electricidad */}
          <div className="border rounded-lg p-4 bg-yellow-50/50">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
              <Zap size={16} className="text-yellow-600" />
              Control de Luz (110 kW cada 7 días, proporcional)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input label="KW Inicial" type="number" min="0" value={form.kw_inicial || ''} onChange={(e) => setForm({ ...form, kw_inicial: Number(e.target.value) })} />
              <Input label="KW Final" type="number" min="0" value={form.kw_final || ''} onChange={(e) => setForm({ ...form, kw_final: Number(e.target.value) })} />
              <Input label="Costo por KW" type="number" min="0" step="0.01" value={form.costo_kw || ''} onChange={(e) => setForm({ ...form, costo_kw: Number(e.target.value) })} />
              <div className="flex items-end">
                {form.kw_final > 0 && form.kw_inicial >= 0 && formNoches > 0 && (
                  <div className="w-full px-3 py-2 rounded-lg bg-white border text-center">
                    {(() => {
                      const consumido = form.kw_final - form.kw_inicial
                      const kwPorDia = 110 / 7
                      const incluido = Math.round(formNoches * kwPorDia)
                      const excedente = Math.max(0, consumido - incluido)
                      const aPagar = excedente * (form.costo_kw || 0)
                      return (
                        <div>
                          <p className="text-xs text-gray-500">Consumo: {consumido} kW</p>
                          <p className="text-xs text-gray-500">Incluido ({formNoches} días): {incluido} kW</p>
                          {excedente > 0 ? (
                            <p className="text-sm font-bold text-costa-coral">Excedente: {excedente} kW = {formatMonto(aPagar, 'ARS')}</p>
                          ) : (
                            <p className="text-sm font-bold text-costa-olivo">Sin excedente</p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={estadosReserva} />
          <Textarea label="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones de la reserva..." />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
