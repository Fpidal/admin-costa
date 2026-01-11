'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { ArrowLeft, Plus, FileText, Receipt, Calculator, Trash2, DollarSign, Calendar, User, Home } from 'lucide-react'
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
  estado: string
  propiedades?: { id: number; nombre: string; direccion: string }
  inquilinos?: { id: number; nombre: string; documento: string; telefono: string; email: string }
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
  recibo_generado: boolean
  created_at: string
}

interface Liquidacion {
  id: number
  reserva_id: number
  deposito_recibido: number
  consumo_energia: number
  roturas: number
  otros_descuentos: number
  notas: string | null
  monto_devolver: number
  fecha_liquidacion: string
}

const conceptos = [
  { value: 'sena', label: 'Seña' },
  { value: 'saldo', label: 'Saldo de alquiler' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'otro', label: 'Otro' },
]

const mediosPago = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
]

const monedas = [
  { value: 'ARS', label: 'Pesos ($)' },
  { value: 'USD', label: 'Dólares (U$D)' },
]

const formatMonto = (monto: number, moneda: string = 'ARS') => {
  if (!monto && monto !== 0) return '-'
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(monto)
  return moneda === 'USD' ? `U$D ${formatted}` : `$ ${formatted}`
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
  concepto: '',
  descripcion: '',
  monto: 0,
  moneda: 'ARS',
  medio_pago: 'efectivo',
}

const initialLiquidacion = {
  deposito_recibido: 0,
  consumo_energia: 0,
  roturas: 0,
  otros_descuentos: 0,
  notas: '',
}

export default function CobrosPage() {
  const params = useParams()
  const router = useRouter()
  const reservaId = params.id as string

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [cobros, setCobros] = useState<Cobro[]>([])
  const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [liquidacionModalOpen, setLiquidacionModalOpen] = useState(false)
  const [cobroForm, setCobroForm] = useState(initialCobroForm)
  const [liquidacionForm, setLiquidacionForm] = useState(initialLiquidacion)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [reservaId])

  async function fetchData() {
    setLoading(true)

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
        consumo_energia: liquidacionData.consumo_energia || 0,
        roturas: liquidacionData.roturas || 0,
        otros_descuentos: liquidacionData.otros_descuentos || 0,
        notas: liquidacionData.notas || '',
      })
    }

    setLoading(false)
  }

  // Cálculos
  const noches = reserva ? calcularNoches(reserva.fecha_inicio, reserva.fecha_fin) : 0
  const totalAlquiler = reserva ? noches * (reserva.precio_noche || 0) : 0
  const totalLimpieza = reserva?.limpieza_final || 0
  const totalDeposito = reserva?.deposito || 0
  const totalGeneral = totalAlquiler + totalLimpieza + totalDeposito

  const totalCobrado = cobros.reduce((acc, c) => acc + (c.monto || 0), 0)
  const saldoPendiente = totalGeneral - totalCobrado

  // Cobrado por concepto
  const cobradoSena = cobros.filter(c => c.concepto === 'sena').reduce((acc, c) => acc + c.monto, 0)
  const cobradoSaldo = cobros.filter(c => c.concepto === 'saldo').reduce((acc, c) => acc + c.monto, 0)
  const cobradoDeposito = cobros.filter(c => c.concepto === 'deposito').reduce((acc, c) => acc + c.monto, 0)
  const cobradoLimpieza = cobros.filter(c => c.concepto === 'limpieza').reduce((acc, c) => acc + c.monto, 0)
  const cobradoOtro = cobros.filter(c => c.concepto === 'otro').reduce((acc, c) => acc + c.monto, 0)

  // Liquidación
  const montoDevolver = liquidacionForm.deposito_recibido - liquidacionForm.consumo_energia - liquidacionForm.roturas - liquidacionForm.otros_descuentos

  async function handleSaveCobro(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('cobros').insert({
      reserva_id: reservaId,
      fecha: cobroForm.fecha,
      concepto: cobroForm.concepto,
      descripcion: cobroForm.descripcion || null,
      monto: Number(cobroForm.monto),
      moneda: cobroForm.moneda,
      medio_pago: cobroForm.medio_pago,
      recibo_generado: false,
    })

    if (!error) {
      setModalOpen(false)
      setCobroForm(initialCobroForm)
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
      deposito_recibido: Number(liquidacionForm.deposito_recibido),
      consumo_energia: Number(liquidacionForm.consumo_energia),
      roturas: Number(liquidacionForm.roturas),
      otros_descuentos: Number(liquidacionForm.otros_descuentos),
      notas: liquidacionForm.notas || null,
      monto_devolver: montoDevolver,
      fecha_liquidacion: new Date().toISOString().split('T')[0],
    }

    if (liquidacion) {
      await supabase.from('liquidaciones').update(data).eq('id', liquidacion.id)
    } else {
      await supabase.from('liquidaciones').insert(data)
    }

    setLiquidacionModalOpen(false)
    fetchData()
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

    // Número de recibo
    doc.setFontSize(12)
    doc.text(`N° ${cobro.id.toString().padStart(6, '0')}`, pageWidth - margin, 35, { align: 'right' })

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
    doc.text('Concepto:', margin, y)
    doc.setFont('helvetica', 'normal')
    const conceptoLabel = conceptos.find(c => c.value === cobro.concepto)?.label || cobro.concepto
    doc.text(conceptoLabel, margin + 35, y)

    if (cobro.descripcion) {
      y += 8
      doc.text(cobro.descripcion, margin + 35, y)
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

    doc.save(`Recibo_${cobro.id}_${reserva.inquilinos?.nombre?.replace(/\s/g, '_') || 'pago'}.pdf`)

    // Marcar como generado
    supabase.from('cobros').update({ recibo_generado: true }).eq('id', cobro.id).then(() => fetchData())
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  if (!reserva) {
    return <div className="text-center py-10 text-gray-500">Reserva no encontrada</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reservas" className="inline-flex items-center gap-2 text-costa-gris hover:text-costa-navy transition-colors">
          <ArrowLeft size={20} />
          Volver a Reservas
        </Link>
      </div>

      <PageHeader
        title="Gestión de Cobros"
        description={`Reserva #${reserva.id} - ${reserva.propiedades?.nombre}`}
      />

      {/* Header con datos de la reserva */}
      <Card className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Home className="text-costa-navy mt-1" size={20} />
              <div>
                <p className="font-medium text-costa-navy">{reserva.propiedades?.nombre}</p>
                <p className="text-sm text-costa-gris">{reserva.propiedades?.direccion}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="text-costa-navy mt-1" size={20} />
              <div>
                <p className="font-medium text-costa-navy">{reserva.inquilinos?.nombre}</p>
                <p className="text-sm text-costa-gris">{reserva.inquilinos?.documento}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="text-costa-navy mt-1" size={20} />
              <div>
                <p className="font-medium text-costa-navy">{formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)}</p>
                <p className="text-sm text-costa-gris">{noches} noches • {reserva.cantidad_personas} personas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conceptos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator size={20} />
              Conceptos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-costa-gris">Alquiler ({noches} noches)</span>
                <span className="font-medium">{formatMonto(totalAlquiler, reserva.moneda)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-costa-gris">Limpieza final</span>
                <span className="font-medium">{formatMonto(totalLimpieza, 'ARS')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-costa-gris">Depósito</span>
                <span className="font-medium">{formatMonto(totalDeposito, reserva.moneda)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-costa-beige/50 px-2 rounded">
                <span className="font-semibold text-costa-navy">TOTAL</span>
                <span className="font-bold text-costa-navy">{formatMonto(totalGeneral, reserva.moneda)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de cobros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign size={20} />
              Resumen Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {cobradoSena > 0 && (
                <div className="flex justify-between">
                  <span className="text-costa-gris">Seña</span>
                  <span>{formatMonto(cobradoSena)}</span>
                </div>
              )}
              {cobradoSaldo > 0 && (
                <div className="flex justify-between">
                  <span className="text-costa-gris">Saldo</span>
                  <span>{formatMonto(cobradoSaldo)}</span>
                </div>
              )}
              {cobradoDeposito > 0 && (
                <div className="flex justify-between">
                  <span className="text-costa-gris">Depósito</span>
                  <span>{formatMonto(cobradoDeposito)}</span>
                </div>
              )}
              {cobradoLimpieza > 0 && (
                <div className="flex justify-between">
                  <span className="text-costa-gris">Limpieza</span>
                  <span>{formatMonto(cobradoLimpieza)}</span>
                </div>
              )}
              {cobradoOtro > 0 && (
                <div className="flex justify-between">
                  <span className="text-costa-gris">Otros</span>
                  <span>{formatMonto(cobradoOtro)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Total cobrado</span>
                <span className="text-costa-olivo">{formatMonto(totalCobrado)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Saldo pendiente</span>
                <span className={saldoPendiente > 0 ? 'text-costa-coral' : 'text-costa-olivo'}>
                  {formatMonto(saldoPendiente)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liquidación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt size={20} />
                Liquidación Final
              </span>
              <Button size="sm" variant="secondary" onClick={() => setLiquidacionModalOpen(true)}>
                {liquidacion ? 'Editar' : 'Cargar'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liquidacion ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-costa-gris">Depósito recibido</span>
                  <span>{formatMonto(liquidacion.deposito_recibido)}</span>
                </div>
                <div className="flex justify-between text-costa-coral">
                  <span>- Energía</span>
                  <span>{formatMonto(liquidacion.consumo_energia)}</span>
                </div>
                <div className="flex justify-between text-costa-coral">
                  <span>- Roturas</span>
                  <span>{formatMonto(liquidacion.roturas)}</span>
                </div>
                <div className="flex justify-between text-costa-coral">
                  <span>- Otros</span>
                  <span>{formatMonto(liquidacion.otros_descuentos)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold text-costa-olivo">
                  <span>A devolver</span>
                  <span>{formatMonto(liquidacion.monto_devolver)}</span>
                </div>
                {liquidacion.notas && (
                  <p className="text-xs text-costa-gris mt-2 italic">{liquidacion.notas}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-costa-gris">Sin liquidación cargada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de cobros */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pagos Registrados</span>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={18} className="mr-2" />
              Registrar Pago
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cobros.length === 0 ? (
            <p className="text-center text-costa-gris py-8">No hay pagos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-sm font-medium text-costa-gris">Fecha</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris">Concepto</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris">Medio</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris text-right">Monto</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cobros.map((cobro) => (
                    <tr key={cobro.id} className="border-b last:border-0">
                      <td className="py-3 text-sm">{formatFecha(cobro.fecha)}</td>
                      <td className="py-3">
                        <span className="text-sm font-medium">
                          {conceptos.find(c => c.value === cobro.concepto)?.label}
                        </span>
                        {cobro.descripcion && (
                          <p className="text-xs text-costa-gris">{cobro.descripcion}</p>
                        )}
                      </td>
                      <td className="py-3 text-sm text-costa-gris">
                        {mediosPago.find(m => m.value === cobro.medio_pago)?.label}
                      </td>
                      <td className="py-3 text-sm font-medium text-right">
                        {formatMonto(cobro.monto, cobro.moneda)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => generarReciboPDF(cobro)}
                            className="p-1.5 text-costa-navy hover:bg-costa-beige rounded transition-colors"
                            title="Generar recibo PDF"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCobro(cobro.id)}
                            className="p-1.5 text-costa-coral hover:bg-costa-coral/10 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Pago">
        <form onSubmit={handleSaveCobro} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={cobroForm.fecha}
              onChange={(e) => setCobroForm({ ...cobroForm, fecha: e.target.value })}
              required
            />
            <Select
              label="Concepto"
              value={cobroForm.concepto}
              onChange={(e) => setCobroForm({ ...cobroForm, concepto: e.target.value })}
              options={conceptos}
              required
            />
          </div>

          <Textarea
            label="Descripción (opcional)"
            value={cobroForm.descripcion}
            onChange={(e) => setCobroForm({ ...cobroForm, descripcion: e.target.value })}
            rows={2}
          />

          <div className="grid grid-cols-3 gap-4">
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
            <Select
              label="Medio de pago"
              value={cobroForm.medio_pago}
              onChange={(e) => setCobroForm({ ...cobroForm, medio_pago: e.target.value })}
              options={mediosPago}
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
          <Input
            label="Depósito recibido"
            type="number"
            min="0"
            value={liquidacionForm.deposito_recibido || ''}
            onChange={(e) => setLiquidacionForm({ ...liquidacionForm, deposito_recibido: Number(e.target.value) })}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Consumo energía"
              type="number"
              min="0"
              value={liquidacionForm.consumo_energia || ''}
              onChange={(e) => setLiquidacionForm({ ...liquidacionForm, consumo_energia: Number(e.target.value) })}
            />
            <Input
              label="Roturas"
              type="number"
              min="0"
              value={liquidacionForm.roturas || ''}
              onChange={(e) => setLiquidacionForm({ ...liquidacionForm, roturas: Number(e.target.value) })}
            />
            <Input
              label="Otros descuentos"
              type="number"
              min="0"
              value={liquidacionForm.otros_descuentos || ''}
              onChange={(e) => setLiquidacionForm({ ...liquidacionForm, otros_descuentos: Number(e.target.value) })}
            />
          </div>

          <Textarea
            label="Notas"
            value={liquidacionForm.notas}
            onChange={(e) => setLiquidacionForm({ ...liquidacionForm, notas: e.target.value })}
            rows={2}
          />

          <div className="p-3 bg-costa-beige/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Monto a devolver:</span>
              <span className={`text-xl font-bold ${montoDevolver >= 0 ? 'text-costa-olivo' : 'text-costa-coral'}`}>
                {formatMonto(montoDevolver)}
              </span>
            </div>
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
    </div>
  )
}
