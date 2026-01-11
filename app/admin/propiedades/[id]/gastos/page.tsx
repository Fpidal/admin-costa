'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Modal, Input, Select, Textarea } from '@/components/ui'
import { ArrowLeft, Plus, Upload, Trash2, FileText, Home, Calendar, Filter } from 'lucide-react'
import Link from 'next/link'

interface Propiedad {
  id: number
  nombre: string
  direccion: string
}

interface Gasto {
  id: number
  propiedad_id: number
  fecha: string
  tipo: string
  concepto: string
  descripcion: string | null
  monto: number
  proveedor: string | null
  comprobante_url: string | null
  periodo: string | null
  fecha_vencimiento: string | null
  created_at: string
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

const tiposGasto = [
  { value: 'expensa', label: 'Expensa' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'arreglo', label: 'Arreglo' },
  { value: 'otro', label: 'Otro' },
]

const tiposGastoSinExpensa = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'arreglo', label: 'Arreglo' },
  { value: 'otro', label: 'Otro' },
]

const formatMonto = (monto: number) => {
  if (!monto && monto !== 0) return '-'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatFecha = (fecha: string) => {
  if (!fecha) return '-'
  return new Date(fecha).toLocaleDateString('es-AR')
}

const initialGastoForm = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'mantenimiento',
  concepto: '',
  descripcion: '',
  monto: 0,
  proveedor: '',
  fecha_vencimiento: '',
}

export default function GastosPage() {
  const params = useParams()
  const propiedadId = params.id as string

  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [gastoForm, setGastoForm] = useState(initialGastoForm)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear().toString())

  // Importador Eidico
  const [textoEidico, setTextoEidico] = useState('')
  const [expensasParseadas, setExpensasParseadas] = useState<ExpensaParseada[]>([])
  const [importando, setImportando] = useState(false)

  useEffect(() => {
    fetchData()
  }, [propiedadId])

  async function fetchData() {
    setLoading(true)

    // Fetch propiedad
    const { data: propiedadData } = await supabase
      .from('propiedades')
      .select('id, nombre, direccion')
      .eq('id', propiedadId)
      .single()

    if (propiedadData) setPropiedad(propiedadData)

    // Fetch gastos
    const { data: gastosData } = await supabase
      .from('gastos')
      .select('*')
      .eq('propiedad_id', propiedadId)
      .order('fecha', { ascending: false })

    if (gastosData) setGastos(gastosData)

    setLoading(false)
  }

  // Filtrar gastos
  const gastosFiltrados = gastos.filter(g => {
    const matchTipo = filtroTipo === 'todos' || g.tipo === filtroTipo
    const matchAnio = !filtroAnio || g.fecha.startsWith(filtroAnio)
    return matchTipo && matchAnio
  })

  // Totales por tipo
  const totalExpensas = gastosFiltrados.filter(g => g.tipo === 'expensa').reduce((acc, g) => acc + g.monto, 0)
  const totalMantenimiento = gastosFiltrados.filter(g => g.tipo === 'mantenimiento').reduce((acc, g) => acc + g.monto, 0)
  const totalArreglos = gastosFiltrados.filter(g => g.tipo === 'arreglo').reduce((acc, g) => acc + g.monto, 0)
  const totalOtros = gastosFiltrados.filter(g => g.tipo === 'otro').reduce((acc, g) => acc + g.monto, 0)
  const totalGeneral = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0)

  // Años disponibles para filtro
  const aniosDisponibles = [...new Set(gastos.map(g => g.fecha.substring(0, 4)))].sort().reverse()
  if (!aniosDisponibles.includes(new Date().getFullYear().toString())) {
    aniosDisponibles.unshift(new Date().getFullYear().toString())
  }

  async function handleSaveGasto(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('gastos').insert({
      propiedad_id: propiedadId,
      fecha: gastoForm.fecha,
      tipo: gastoForm.tipo,
      concepto: gastoForm.concepto,
      descripcion: gastoForm.descripcion || null,
      monto: Number(gastoForm.monto),
      proveedor: gastoForm.proveedor || null,
      fecha_vencimiento: gastoForm.fecha_vencimiento || null,
    })

    if (!error) {
      setModalOpen(false)
      setGastoForm(initialGastoForm)
      fetchData()
    }
    setSaving(false)
  }

  async function handleDeleteGasto(id: number) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    fetchData()
  }

  // Parser de Eidico
  function parsearEidico() {
    const lineas = textoEidico.split('\n').filter(l => l.trim())
    const expensas: ExpensaParseada[] = []

    for (const linea of lineas) {
      // Intentar parsear formato Eidico
      // Formato esperado: fecha|vencimiento|lote|concepto|debe|haber|saldo
      // Ejemplo: 10/11/2025763Electricidad $ 13989.46 fijos...$ 111.224,10$ 0,00$ 362.303,19

      // Buscar patrones de fecha (dd/mm/yyyy)
      const fechaMatch = linea.match(/(\d{2}\/\d{2}\/\d{4})/g)

      // Buscar patrones de monto ($ xxx.xxx,xx o $ xxx,xx)
      const montoMatch = linea.match(/\$\s*([\d.,]+)/g)

      // Buscar lote (3-4 dígitos después de la fecha)
      const loteMatch = linea.match(/\d{2}\/\d{2}\/\d{4}(\d{3,4})/i)

      if (fechaMatch && fechaMatch.length >= 1 && montoMatch && montoMatch.length >= 1) {
        // Extraer concepto (texto entre lote y primer monto)
        let concepto = linea
        if (loteMatch) {
          const loteIndex = linea.indexOf(loteMatch[1]) + loteMatch[1].length
          const montoIndex = linea.indexOf('$')
          if (montoIndex > loteIndex) {
            concepto = linea.substring(loteIndex, montoIndex).trim()
          }
        }

        // Parsear montos (quitar $, puntos de miles, cambiar coma por punto)
        const parseMonto = (str: string) => {
          const clean = str.replace('$', '').replace(/\./g, '').replace(',', '.').trim()
          return parseFloat(clean) || 0
        }

        const debe = montoMatch[0] ? parseMonto(montoMatch[0]) : 0
        const haber = montoMatch[1] ? parseMonto(montoMatch[1]) : 0
        const saldo = montoMatch[2] ? parseMonto(montoMatch[2]) : 0

        // Convertir fecha dd/mm/yyyy a yyyy-mm-dd
        const fechaVenc = fechaMatch[0]
        const [dia, mes, anio] = fechaVenc.split('/')
        const fechaISO = `${anio}-${mes}-${dia}`

        expensas.push({
          fecha_vencimiento: fechaISO,
          lote: loteMatch ? loteMatch[1] : '',
          concepto: concepto || 'Expensa',
          debe,
          haber,
          saldo,
          selected: debe > 0, // Solo seleccionar si hay monto a pagar
        })
      }
    }

    setExpensasParseadas(expensas)
  }

  async function importarExpensas() {
    const seleccionadas = expensasParseadas.filter(e => e.selected && e.debe > 0)
    if (seleccionadas.length === 0) {
      alert('No hay expensas seleccionadas para importar')
      return
    }

    setImportando(true)

    const gastosAInsertar = seleccionadas.map(e => ({
      propiedad_id: propiedadId,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'expensa',
      concepto: e.concepto,
      monto: e.debe,
      periodo: e.fecha_vencimiento.substring(0, 7).split('-').reverse().join('/'), // mm/yyyy
      fecha_vencimiento: e.fecha_vencimiento,
    }))

    const { error } = await supabase.from('gastos').insert(gastosAInsertar)

    if (!error) {
      setImportModalOpen(false)
      setTextoEidico('')
      setExpensasParseadas([])
      fetchData()
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  if (!propiedad) {
    return <div className="text-center py-10 text-gray-500">Propiedad no encontrada</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/propiedades" className="inline-flex items-center gap-2 text-costa-gris hover:text-costa-navy transition-colors">
          <ArrowLeft size={20} />
          Volver a Propiedades
        </Link>
      </div>

      <PageHeader
        title="Gastos"
        description={propiedad.nombre}
      />

      {/* Header con datos de la propiedad */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center gap-3">
            <Home className="text-costa-navy" size={24} />
            <div>
              <p className="font-medium text-costa-navy text-lg">{propiedad.nombre}</p>
              <p className="text-sm text-costa-gris">{propiedad.direccion}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Cargar gasto
        </Button>
        <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
          <Upload size={18} className="mr-2" />
          Importar expensas Eidico
        </Button>
      </div>

      {/* Filtros y Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter size={18} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              label="Tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              options={[{ value: 'todos', label: 'Todos' }, ...tiposGasto]}
            />
            <Select
              label="Año"
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              options={aniosDisponibles.map(a => ({ value: a, label: a }))}
            />
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Resumen {filtroAnio}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-costa-beige/30 rounded-lg">
                <p className="text-xs text-costa-gris mb-1">Expensas</p>
                <p className="font-semibold text-costa-navy">{formatMonto(totalExpensas)}</p>
              </div>
              <div className="text-center p-3 bg-costa-beige/30 rounded-lg">
                <p className="text-xs text-costa-gris mb-1">Mantenimiento</p>
                <p className="font-semibold text-costa-navy">{formatMonto(totalMantenimiento)}</p>
              </div>
              <div className="text-center p-3 bg-costa-beige/30 rounded-lg">
                <p className="text-xs text-costa-gris mb-1">Arreglos</p>
                <p className="font-semibold text-costa-navy">{formatMonto(totalArreglos)}</p>
              </div>
              <div className="text-center p-3 bg-costa-beige/30 rounded-lg">
                <p className="text-xs text-costa-gris mb-1">Otros</p>
                <p className="font-semibold text-costa-navy">{formatMonto(totalOtros)}</p>
              </div>
              <div className="text-center p-3 bg-costa-navy/10 rounded-lg">
                <p className="text-xs text-costa-gris mb-1">TOTAL</p>
                <p className="font-bold text-costa-navy text-lg">{formatMonto(totalGeneral)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de gastos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Gastos ({gastosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gastosFiltrados.length === 0 ? (
            <p className="text-center text-costa-gris py-8">No hay gastos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 text-sm font-medium text-costa-gris">Fecha</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris">Tipo</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris">Concepto</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris">Proveedor</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris text-right">Monto</th>
                    <th className="pb-3 text-sm font-medium text-costa-gris text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map((gasto) => (
                    <tr key={gasto.id} className="border-b last:border-0">
                      <td className="py-3 text-sm">
                        {formatFecha(gasto.fecha)}
                        {gasto.periodo && (
                          <span className="block text-xs text-costa-gris">Per: {gasto.periodo}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge variant={gasto.tipo === 'expensa' ? 'info' : gasto.tipo === 'arreglo' ? 'warning' : 'default'}>
                          {tiposGasto.find(t => t.value === gasto.tipo)?.label}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className="text-sm font-medium">{gasto.concepto}</span>
                        {gasto.descripcion && (
                          <p className="text-xs text-costa-gris">{gasto.descripcion}</p>
                        )}
                      </td>
                      <td className="py-3 text-sm text-costa-gris">
                        {gasto.proveedor || '-'}
                      </td>
                      <td className="py-3 text-sm font-medium text-right">
                        {formatMonto(gasto.monto)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDeleteGasto(gasto.id)}
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

      {/* Modal nuevo gasto */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Cargar Gasto">
        <form onSubmit={handleSaveGasto} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={gastoForm.fecha}
              onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })}
              required
            />
            <Select
              label="Tipo"
              value={gastoForm.tipo}
              onChange={(e) => setGastoForm({ ...gastoForm, tipo: e.target.value })}
              options={tiposGastoSinExpensa}
              required
            />
          </div>

          <Input
            label="Concepto"
            value={gastoForm.concepto}
            onChange={(e) => setGastoForm({ ...gastoForm, concepto: e.target.value })}
            placeholder="Ej: Reparación aire acondicionado"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monto"
              type="number"
              min="0"
              step="0.01"
              value={gastoForm.monto || ''}
              onChange={(e) => setGastoForm({ ...gastoForm, monto: Number(e.target.value) })}
              required
            />
            <Input
              label="Proveedor (opcional)"
              value={gastoForm.proveedor}
              onChange={(e) => setGastoForm({ ...gastoForm, proveedor: e.target.value })}
              placeholder="Nombre del proveedor"
            />
          </div>

          <Input
            label="Fecha vencimiento (opcional)"
            type="date"
            value={gastoForm.fecha_vencimiento}
            onChange={(e) => setGastoForm({ ...gastoForm, fecha_vencimiento: e.target.value })}
          />

          <Textarea
            label="Descripción (opcional)"
            value={gastoForm.descripcion}
            onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal importar Eidico */}
      <Modal isOpen={importModalOpen} onClose={() => { setImportModalOpen(false); setExpensasParseadas([]) }} title="Importar Expensas Eidico">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pegá los datos copiados de Eidico:
            </label>
            <textarea
              className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-costa-navy focus:border-transparent"
              placeholder="Pegá aquí los datos del estado de cuenta de Eidico..."
              value={textoEidico}
              onChange={(e) => setTextoEidico(e.target.value)}
            />
          </div>

          <Button type="button" variant="secondary" onClick={parsearEidico} disabled={!textoEidico.trim()}>
            Analizar datos
          </Button>

          {expensasParseadas.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-costa-beige/50 px-4 py-2 font-medium text-sm">
                Vista previa ({expensasParseadas.filter(e => e.selected).length} seleccionadas)
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">
                        <input
                          type="checkbox"
                          checked={expensasParseadas.every(e => e.selected)}
                          onChange={(e) => {
                            setExpensasParseadas(expensasParseadas.map(exp => ({ ...exp, selected: e.target.checked })))
                          }}
                        />
                      </th>
                      <th className="p-2 text-left">Vencimiento</th>
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
                        <td className="p-2">{formatFecha(exp.fecha_vencimiento)}</td>
                        <td className="p-2 truncate max-w-[200px]">{exp.concepto}</td>
                        <td className="p-2 text-right font-medium">{formatMonto(exp.debe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => { setImportModalOpen(false); setExpensasParseadas([]) }}>
              Cancelar
            </Button>
            {expensasParseadas.length > 0 && (
              <Button onClick={importarExpensas} disabled={importando || expensasParseadas.filter(e => e.selected).length === 0}>
                {importando ? 'Importando...' : `Importar ${expensasParseadas.filter(e => e.selected).length} expensas`}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
