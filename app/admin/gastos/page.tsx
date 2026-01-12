'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { demoGastos, demoPropiedades } from '@/lib/demoData'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select } from '@/components/ui'
import { Plus, Pencil, Trash2, Upload, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface Propiedad {
  id: string
  nombre: string
}

interface ProveedorServicio {
  id: number
  nombre: string
  apellido?: string
  rubro?: string
  telefono?: string
}

interface DetalleExpensa {
  concepto: string
  monto: number
  fecha_vencimiento?: string
}

interface Gasto {
  id: number
  propiedad_id: string | null
  fecha: string
  tipo: string
  concepto: string
  descripcion: string | null
  monto: number
  proveedor: string | null
  periodo: string | null
  fecha_vencimiento: string | null
  pagado: boolean
  detalle: DetalleExpensa[] | null
  propiedades?: Propiedad
}

interface ExpensaParseada {
  fecha_vencimiento: string
  lote: string
  concepto: string
  debe: number
  haber: number
  saldo: number
  selected: boolean
}

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR')
}

const initialForm = {
  propiedad_id: '',
  concepto: '',
  proveedor: '',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0],
  observaciones: '',
}

const initialNuevoProveedor = {
  nombre: '',
  apellido: '',
  rubro: '',
  telefono: '',
}

function AdministracionContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const [gastos, setGastos] = useState<Gasto[]>([])
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [proveedores, setProveedores] = useState<ProveedorServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [nuevoProveedor, setNuevoProveedor] = useState(initialNuevoProveedor)
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false)
  const [proveedorConfirmado, setProveedorConfirmado] = useState(false)

  // Estados para importador de expensas Eidico
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importPropiedadId, setImportPropiedadId] = useState('')
  const [textoEidico, setTextoEidico] = useState('')
  const [expensasParseadas, setExpensasParseadas] = useState<ExpensaParseada[]>([])
  const [importando, setImportando] = useState(false)
  const [expandedGastos, setExpandedGastos] = useState<Set<number>>(new Set())

  // Modal de detalle
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [gastoSeleccionado, setGastoSeleccionado] = useState<Gasto | null>(null)

  // Filtros
  const [filtroMes, setFiltroMes] = useState<string>('')
  const [filtroAnio, setFiltroAnio] = useState<string>(new Date().getFullYear().toString())
  const [filtroTipo, setFiltroTipo] = useState<string>('')

  // Opciones de filtros
  const meses = [
    { value: '', label: 'Todos' },
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ]

  const anios = [
    { value: '', label: 'Todos' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
  ]

  const tiposGasto = [
    { value: '', label: 'Todos' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Arreglos', label: 'Arreglos' },
    { value: 'Ampliación', label: 'Ampliación' },
    { value: 'Reparaciones', label: 'Reparaciones' },
    { value: 'Multas', label: 'Multas' },
    { value: 'expensa', label: 'Expensas' },
    { value: 'Otros', label: 'Otros' },
  ]

  // Gastos filtrados
  const gastosFiltrados = gastos.filter(gasto => {
    const fechaGasto = new Date(gasto.fecha)
    const mesGasto = String(fechaGasto.getMonth() + 1).padStart(2, '0')
    const anioGasto = String(fechaGasto.getFullYear())

    if (filtroMes && mesGasto !== filtroMes) return false
    if (filtroAnio && anioGasto !== filtroAnio) return false
    if (filtroTipo && gasto.concepto !== filtroTipo && gasto.tipo !== filtroTipo) return false

    return true
  })

  useEffect(() => {
    if (isDemo) {
      setGastos(demoGastos as unknown as Gasto[])
      setPropiedades(demoPropiedades.map(p => ({ id: p.id, nombre: p.nombre })))
      setProveedores([])
      setLoading(false)
      return
    }
    fetchData()
  }, [isDemo])

  async function fetchData() {
    const [resGastos, resPropiedades, resProveedores] = await Promise.all([
      supabase.from('gastos').select('*, propiedades(id, nombre)').order('fecha', { ascending: false }),
      supabase.from('propiedades').select('id, nombre').order('nombre'),
      supabase.from('proveedores_servicios').select('*').order('nombre')
    ])

    if (resGastos.data) setGastos(resGastos.data)
    if (resPropiedades.data) setPropiedades(resPropiedades.data)
    if (resProveedores.data) setProveedores(resProveedores.data)
    setLoading(false)
  }

  function openModal(gasto?: Gasto) {
    if (gasto) {
      setEditingId(gasto.id)
      setForm({
        propiedad_id: gasto.propiedad_id || '',
        concepto: gasto.concepto || '',
        proveedor: gasto.proveedor || '',
        monto: gasto.monto || 0,
        fecha: gasto.fecha || '',
        observaciones: gasto.descripcion || '',
      })
      setProveedorConfirmado(!!gasto.proveedor)
    } else {
      setEditingId(null)
      setForm(initialForm)
      setProveedorConfirmado(false)
    }
    setMostrarNuevoProveedor(false)
    setNuevoProveedor(initialNuevoProveedor)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(initialForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let proveedorNombre = form.proveedor

    // Si es nuevo proveedor, guardarlo primero
    if (mostrarNuevoProveedor && nuevoProveedor.nombre.trim()) {
      const nombreCompleto = nuevoProveedor.apellido
        ? `${nuevoProveedor.nombre.trim()} ${nuevoProveedor.apellido.trim()}`
        : nuevoProveedor.nombre.trim()

      const { error: provError } = await supabase
        .from('proveedores_servicios')
        .insert([{
          nombre: nuevoProveedor.nombre.trim(),
          apellido: nuevoProveedor.apellido.trim() || null,
          rubro: nuevoProveedor.rubro.trim() || null,
          telefono: nuevoProveedor.telefono.trim() || null,
        }])

      if (provError) {
        // Si ya existe, no es error
        if (!provError.message.includes('duplicate')) {
          alert('Error al crear proveedor: ' + provError.message)
          setSaving(false)
          return
        }
      }
      proveedorNombre = nombreCompleto
    }

    // Mapear concepto a tipo válido
    const tipoMap: Record<string, string> = {
      'Mantenimiento': 'mantenimiento',
      'Arreglos': 'arreglo',
      'Ampliación': 'otro',
      'Reparaciones': 'arreglo',
      'Multas': 'otro',
      'Otros': 'otro',
    }

    const data = {
      propiedad_id: form.propiedad_id || null,
      proveedor: proveedorNombre || null,
      concepto: form.concepto || 'Gasto',
      tipo: tipoMap[form.concepto] || 'otro',
      monto: Number(form.monto),
      fecha: form.fecha,
      descripcion: form.observaciones || null,
    }

    if (editingId) {
      const { error } = await supabase.from('gastos').update(data).eq('id', editingId)
      if (error) alert('Error al actualizar: ' + error.message)
    } else {
      const { error } = await supabase.from('gastos').insert([data])
      if (error) alert('Error al crear: ' + error.message)
    }

    setSaving(false)
    closeModal()
    fetchData()
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) alert('Error al eliminar: ' + error.message)
    else fetchData()
  }

  async function marcarPagado(id: number) {
    const { error } = await supabase.from('gastos').update({ pagado: true }).eq('id', id)
    if (error) alert('Error: ' + error.message)
    else fetchData()
  }

  // Parser de Eidico - formato: Fecha | Lote | Concepto | Debe | Haber | Saldo
  function parsearEidico() {
    const lineas = textoEidico.split('\n').filter(l => l.trim())
    const expensas: ExpensaParseada[] = []

    const parseMonto = (str: string) => {
      if (!str) return 0
      const clean = str.replace('$', '').replace(/\./g, '').replace(',', '.').trim()
      return parseFloat(clean) || 0
    }

    for (const linea of lineas) {
      // Verificar que la línea tiene una fecha al inicio
      const fechaMatch = linea.match(/^(\d{2}\/\d{2}\/\d{4})/)
      if (!fechaMatch) continue

      // Separar por tabs o múltiples espacios
      const columnas = linea.split(/\t+|\s{2,}/).map(c => c.trim()).filter(c => c)

      // Necesitamos al menos: fecha, lote, concepto, debe
      if (columnas.length < 4) continue

      const fecha = columnas[0]
      const lote = columnas[1]

      // El concepto puede tener $ internos (como "Electricidad $ 13989.46 fijos...")
      // Buscamos las últimas 3 columnas que son montos (Debe, Haber, Saldo)
      // Recorremos desde el final para encontrar los montos
      let debe = 0
      let haber = 0
      let saldo = 0
      let conceptoEnd = columnas.length

      // Buscar las últimas 3 columnas que parecen montos (empiezan con $ o son números)
      const montoRegex = /^\$\s*[\d.,]+$/
      const montosEncontrados: number[] = []

      for (let i = columnas.length - 1; i >= 2 && montosEncontrados.length < 3; i--) {
        if (montoRegex.test(columnas[i])) {
          montosEncontrados.unshift(parseMonto(columnas[i]))
          conceptoEnd = i
        }
      }

      if (montosEncontrados.length >= 1) {
        debe = montosEncontrados[0] || 0
        haber = montosEncontrados[1] || 0
        saldo = montosEncontrados[2] || 0
      }

      // El concepto es todo lo que está entre lote y los montos
      const concepto = columnas.slice(2, conceptoEnd).join(' ').trim()

      // Procesar concepto según tipo
      let conceptoLimpio = concepto

      // Para Electricidad: extraer medición y consumo
      if (concepto.toLowerCase().includes('electricidad') && !concepto.toLowerCase().includes('potencia')) {
        const medicionMatch = concepto.match(/Medición\s*(\d+)/i)
        const consumoMatch = concepto.match(/Consumo\s*Kwh[:\s]*(\d+)/i)
        conceptoLimpio = 'Electricidad'
        if (medicionMatch) conceptoLimpio += ` - Medición ${medicionMatch[1]}`
        if (consumoMatch) conceptoLimpio += ` - Consumo ${consumoMatch[1]} Kwh`
      }
      // Para Potencia: extraer medición
      else if (concepto.toLowerCase().includes('potencia')) {
        const medicionMatch = concepto.match(/Medición\s*([\d.,]+)/i)
        conceptoLimpio = 'Potencia electricidad'
        if (medicionMatch) conceptoLimpio += ` - Medición ${medicionMatch[1]}`
      }
      // Para Agua: extraer medición y consumo
      else if (concepto.toLowerCase().includes('agua')) {
        const medicionMatch = concepto.match(/Medición[:\s]*(\d+)/i)
        const consumoMatch = concepto.match(/Consumo\s*m3[:\s]*(\d+)/i)
        conceptoLimpio = 'Agua'
        if (medicionMatch) conceptoLimpio += ` - Medición ${medicionMatch[1]}`
        if (consumoMatch) conceptoLimpio += ` - Consumo ${consumoMatch[1]} m³`
      }
      // Para otros conceptos: limpiar
      else {
        // Si tiene " - " tomamos la primera parte
        if (concepto.includes(' - ')) {
          conceptoLimpio = concepto.split(' - ')[0].trim()
        }
        // Si tiene ", " tomamos la primera parte
        if (conceptoLimpio.includes(', ')) {
          conceptoLimpio = conceptoLimpio.split(', ')[0].trim()
        }
        // Quitar cualquier $ y números sueltos del concepto
        conceptoLimpio = conceptoLimpio.replace(/\$\s*[\d.,]+/g, '').trim()
        // Si quedó vacío, usar el original
        if (!conceptoLimpio) conceptoLimpio = concepto
      }

      const [dia, mes, anio] = fecha.split('/')
      const fechaISO = `${anio}-${mes}-${dia}`

      if (debe > 0) {
        expensas.push({
          fecha_vencimiento: fechaISO,
          lote,
          concepto: conceptoLimpio,
          debe,
          haber,
          saldo,
          selected: true,
        })
      }
    }

    setExpensasParseadas(expensas)
  }

  async function importarExpensas() {
    if (!importPropiedadId) {
      alert('Seleccioná una propiedad')
      return
    }

    const seleccionadas = expensasParseadas.filter(e => e.selected && e.debe > 0)
    if (seleccionadas.length === 0) {
      alert('No hay expensas seleccionadas para importar')
      return
    }

    setImportando(true)

    // Calcular el total
    const totalMonto = seleccionadas.reduce((acc, e) => acc + e.debe, 0)

    // Obtener el período
    const primerFecha = seleccionadas[0].fecha_vencimiento
    const [anio, mes] = primerFecha.split('-')
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const mesNombre = meses[parseInt(mes) - 1]
    const periodo = `${mesNombre} ${anio}`

    // Crear el array de detalle
    const detalle = seleccionadas.map(e => ({
      concepto: e.concepto,
      monto: e.debe,
      fecha_vencimiento: e.fecha_vencimiento,
    }))

    // Crear un solo registro agrupado
    const gastoAgrupado = {
      propiedad_id: importPropiedadId,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'expensa',
      concepto: `Expensas ${periodo}`,
      monto: totalMonto,
      periodo: periodo,
      pagado: false,
      detalle: detalle,
    }

    const { error } = await supabase.from('gastos').insert([gastoAgrupado])

    if (!error) {
      setImportModalOpen(false)
      setTextoEidico('')
      setExpensasParseadas([])
      setImportPropiedadId('')
      fetchData()
      alert(`Expensas de ${periodo} importadas correctamente`)
    } else {
      alert('Error al importar: ' + error.message)
    }

    setImportando(false)
  }

  function toggleExpensaSeleccion(index: number) {
    const updated = [...expensasParseadas]
    updated[index].selected = !updated[index].selected
    setExpensasParseadas(updated)
  }

  function closeImportModal() {
    setImportModalOpen(false)
    setTextoEidico('')
    setExpensasParseadas([])
    setImportPropiedadId('')
  }

  function toggleGastoExpanded(id: number) {
    const newExpanded = new Set(expandedGastos)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedGastos(newExpanded)
  }

  function abrirDetalle(gasto: Gasto) {
    setGastoSeleccionado(gasto)
    setDetalleModalOpen(true)
  }

  // Cálculos
  const totalGastos = gastosFiltrados.reduce((acc, g) => acc + (g.monto || 0), 0)
  const totalPendiente = gastosFiltrados.filter(g => !g.pagado).reduce((acc, g) => acc + (g.monto || 0), 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-costa-gris">Cargando...</div></div>
  }

  return (
    <div>
      <PageHeader title="Administración" description="Control de gastos y expensas">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
            <Upload size={16} />
            Importar Expensas
          </Button>
          <Button onClick={() => openModal()}>
            <Plus size={16} />
            Nuevo Gasto
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-costa-gris">Total Gastos</p>
            <p className="text-xl font-bold text-costa-navy">{formatMonto(totalGastos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-costa-gris">Pendiente de Pago</p>
            <p className="text-xl font-bold text-costa-coral">{formatMonto(totalPendiente)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-costa-gris">Filtrar:</span>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="px-3 py-1.5 text-sm border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy"
            >
              {meses.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="px-3 py-1.5 text-sm border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy"
            >
              {anios.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy"
            >
              {tiposGasto.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {(filtroMes || filtroAnio || filtroTipo) && (
              <button
                onClick={() => { setFiltroMes(''); setFiltroAnio(''); setFiltroTipo('') }}
                className="text-xs text-costa-coral hover:underline"
              >
                Limpiar filtros
              </button>
            )}
            <span className="ml-auto text-sm text-costa-gris">
              {gastosFiltrados.length} resultado{gastosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Gastos */}
      <Card>
        <CardHeader><CardTitle>Gastos y Expensas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {gastosFiltrados.length === 0 ? (
            <div className="py-8 text-center text-costa-gris">No hay gastos registrados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-costa-beige/50 border-b border-costa-beige">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Detalle</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Propiedad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-costa-gris uppercase">Fecha</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Monto</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-costa-gris uppercase">Estado</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-costa-gris uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-costa-beige">
                  {gastosFiltrados.map((gasto) => (
                    <React.Fragment key={gasto.id}>
                      <tr className="hover:bg-costa-beige/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">{gasto.concepto}</Badge>
                              {gasto.detalle && gasto.detalle.length > 0 && (
                                <span className="text-xs text-costa-gris">({gasto.detalle.length} items)</span>
                              )}
                            </div>
                            {gasto.detalle && gasto.detalle.length > 0 && (
                              <button
                                onClick={() => toggleGastoExpanded(gasto.id)}
                                className="p-1 hover:bg-costa-beige rounded transition-colors"
                              >
                                {expandedGastos.has(gasto.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-costa-navy">{gasto.descripcion || '-'}</td>
                        <td className="px-4 py-3 text-costa-gris">{gasto.propiedades?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-costa-gris">{formatFecha(gasto.fecha)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-costa-navy">{formatMonto(gasto.monto)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={gasto.pagado ? 'success' : 'warning'}>
                            {gasto.pagado ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {gasto.detalle && gasto.detalle.length > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => abrirDetalle(gasto)} title="Ver detalle">
                                <ChevronDown size={14} />
                              </Button>
                            )}
                            {!gasto.pagado && (
                              <Button variant="primary" size="sm" onClick={() => marcarPagado(gasto.id)}>
                                <Check size={14} className="mr-1" />
                                Pagar
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openModal(gasto)}><Pencil size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(gasto.id)}><Trash2 size={14} className="text-costa-gris" /></Button>
                          </div>
                        </td>
                      </tr>
                      {/* Fila expandible con detalle */}
                      {gasto.detalle && gasto.detalle.length > 0 && expandedGastos.has(gasto.id) && (
                        <tr className="bg-costa-beige/20">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="ml-8 border-l-2 border-costa-navy/20 pl-4">
                              <p className="text-xs font-medium text-costa-gris mb-2">Detalle de conceptos:</p>
                              <div className="space-y-1">
                                {gasto.detalle.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-costa-beige/50 last:border-0">
                                    <span className="text-costa-navy">{item.concepto}</span>
                                    <span className="font-medium text-costa-navy">{formatMonto(item.monto)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-costa-navy/20 font-semibold">
                                <span className="text-costa-navy">Total</span>
                                <span className="text-costa-navy">{formatMonto(gasto.monto)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nuevo/Editar Gasto */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Gasto' : 'Nuevo Gasto'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Propiedad primero */}
          <Select
            label="Propiedad"
            value={form.propiedad_id}
            onChange={(e) => setForm({ ...form, propiedad_id: e.target.value })}
            options={propiedades.map(p => ({ value: p.id, label: p.nombre }))}
            required
          />

          {/* Tipo */}
          <Select
            label="Tipo"
            value={form.concepto}
            onChange={(e) => setForm({ ...form, concepto: e.target.value })}
            options={[
              { value: 'Mantenimiento', label: 'Mantenimiento' },
              { value: 'Arreglos', label: 'Arreglos' },
              { value: 'Ampliación', label: 'Ampliación' },
              { value: 'Reparaciones', label: 'Reparaciones' },
              { value: 'Multas', label: 'Multas' },
              { value: 'Otros', label: 'Otros' },
            ]}
            required
          />

          {/* Proveedor */}
          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Proveedor</label>
            {!mostrarNuevoProveedor ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent"
                    value={form.proveedor}
                    onChange={(e) => {
                      setForm({ ...form, proveedor: e.target.value })
                      setProveedorConfirmado(false)
                    }}
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre}>
                        {p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre}
                        {p.rubro ? ` (${p.rubro})` : ''}
                      </option>
                    ))}
                  </select>
                  {form.proveedor && (
                    <button
                      type="button"
                      onClick={() => setProveedorConfirmado(true)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        proveedorConfirmado
                          ? 'bg-green-500 text-white'
                          : 'bg-costa-beige text-costa-navy hover:bg-costa-navy hover:text-white'
                      }`}
                      title="Confirmar proveedor"
                    >
                      <Check size={18} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="text-sm text-costa-navy hover:underline"
                  onClick={() => setMostrarNuevoProveedor(true)}
                >
                  + Agregar nuevo proveedor
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-costa-beige/30 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    className="px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent"
                    placeholder="Nombre *"
                    value={nuevoProveedor.nombre}
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })}
                    autoFocus
                  />
                  <input
                    type="text"
                    className="px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent"
                    placeholder="Apellido"
                    value={nuevoProveedor.apellido}
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, apellido: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    className="px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent"
                    placeholder="Rubro (ej: Electricista)"
                    value={nuevoProveedor.rubro}
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, rubro: e.target.value })}
                  />
                  <input
                    type="tel"
                    className="px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent"
                    placeholder="Teléfono"
                    value={nuevoProveedor.telefono}
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, telefono: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="text-sm text-costa-gris hover:underline"
                  onClick={() => {
                    setMostrarNuevoProveedor(false)
                    setNuevoProveedor(initialNuevoProveedor)
                  }}
                >
                  ← Volver a seleccionar existente
                </button>
              </div>
            )}
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Importe" type="number" min="0" value={form.monto} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} required />
            <Input label="Fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
          </div>

          {/* Detalle */}
          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Detalle</label>
            <textarea
              className="w-full px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent resize-none"
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-costa-beige">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Importar Expensas Eidico */}
      <Modal isOpen={importModalOpen} onClose={closeImportModal} title="Importar Expensas Eidico" size="lg">
        <div className="space-y-4">
          {/* Botones de acción arriba */}
          <div className="flex justify-between items-center pb-3 border-b border-costa-beige">
            <div className="flex items-center gap-2">
              {expensasParseadas.length > 0 && (
                <span className="text-sm text-costa-gris">
                  Total: <span className="font-bold text-costa-navy">{formatMonto(expensasParseadas.filter(e => e.selected).reduce((acc, e) => acc + e.debe, 0))}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={closeImportModal}>
                Cancelar
              </Button>
              {expensasParseadas.length > 0 && (
                <Button size="sm" onClick={importarExpensas} disabled={importando || expensasParseadas.filter(e => e.selected).length === 0 || !importPropiedadId}>
                  {importando ? 'Importando...' : `Importar registro`}
                </Button>
              )}
            </div>
          </div>

          <Select
            label="Propiedad"
            value={importPropiedadId}
            onChange={(e) => setImportPropiedadId(e.target.value)}
            options={propiedades.map(p => ({ value: p.id, label: p.nombre }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pegá los datos copiados de Eidico:
            </label>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-costa-navy focus:border-transparent"
              placeholder="Pegá aquí los datos del estado de cuenta de Eidico..."
              value={textoEidico}
              onChange={(e) => setTextoEidico(e.target.value)}
            />
          </div>

          <Button type="button" variant="secondary" onClick={parsearEidico} disabled={!textoEidico.trim()}>
            Procesar datos
          </Button>

          {expensasParseadas.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-costa-beige/50 px-4 py-2 font-medium text-sm flex justify-between items-center">
                <span>Vista previa ({expensasParseadas.filter(e => e.selected).length} seleccionadas)</span>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expensasParseadas.every(e => e.selected)}
                    onChange={(e) => {
                      setExpensasParseadas(expensasParseadas.map(exp => ({ ...exp, selected: e.target.checked })))
                    }}
                  />
                  Seleccionar todas
                </label>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left w-10"></th>
                      <th className="p-2 text-left">Concepto</th>
                      <th className="p-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensasParseadas.map((exp, idx) => (
                      <tr key={idx} className={`border-t ${exp.debe === 0 ? 'opacity-50' : ''}`}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={exp.selected}
                            onChange={() => toggleExpensaSeleccion(idx)}
                            disabled={exp.debe === 0}
                          />
                        </td>
                        <td className="p-2">{exp.concepto}</td>
                        <td className="p-2 text-right font-medium">{formatMonto(exp.debe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
          )}
        </div>
      </Modal>

      {/* Modal Detalle de Expensa */}
      <Modal isOpen={detalleModalOpen} onClose={() => setDetalleModalOpen(false)} title={gastoSeleccionado?.concepto || 'Detalle'} size="lg">
        {gastoSeleccionado && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-costa-gris">Propiedad:</span>
              <span className="font-medium">{gastoSeleccionado.propiedades?.nombre || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-costa-gris">Estado:</span>
              <Badge variant={gastoSeleccionado.pagado ? 'success' : 'warning'}>
                {gastoSeleccionado.pagado ? 'Pagado' : 'Pendiente'}
              </Badge>
            </div>

            {gastoSeleccionado.detalle && gastoSeleccionado.detalle.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-costa-beige/50 px-4 py-2 font-medium text-sm">
                  Desglose de conceptos
                </div>
                <div className="divide-y divide-costa-beige">
                  {gastoSeleccionado.detalle.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-4 py-2 text-sm">
                      <span>{item.concepto}</span>
                      <span className="font-medium">{formatMonto(item.monto)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-costa-navy/10 px-4 py-2 flex justify-between items-center font-bold">
                  <span>Total</span>
                  <span>{formatMonto(gastoSeleccionado.monto)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              {!gastoSeleccionado.pagado && (
                <Button onClick={() => { marcarPagado(gastoSeleccionado.id); setDetalleModalOpen(false); }}>
                  <Check size={16} className="mr-1" />
                  Marcar como Pagado
                </Button>
              )}
              <Button variant="ghost" onClick={() => setDetalleModalOpen(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function AdministracionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <AdministracionContent />
    </Suspense>
  )
}
