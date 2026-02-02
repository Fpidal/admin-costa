'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Select } from '@/components/ui'
import { Plus, Zap, Pencil, Trash2, AlertTriangle, Check, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Propiedad {
  id: string
  nombre: string
  lote?: string
  barrio?: string
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
  monto: number
  detalle?: DetalleExpensa[] | null
}

// Datos extraídos de Eidico
interface DatoElectricidad {
  id: string
  fechaGasto: string      // Fecha del gasto/expensa
  fechaMedicion: string   // Fecha de la medición (al dd/mm/yyyy)
  medicion: number        // Número del medidor
  consumo: number         // kWh consumidos
  monto: number           // Monto en pesos
  fuente: 'eidico' | 'manual'
}

// Medición manual para comparar
interface MedicionManual {
  id: number
  propiedad_id: string
  fecha: string
  lectura: number
  notas: string | null
  created_at: string
}

interface Props {
  propiedades: Propiedad[]
  gastos: Gasto[]
  isDemo: boolean
  userId: string | null | undefined
}

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR')
}

const formatNumero = (num: number) => {
  return new Intl.NumberFormat('es-AR').format(num)
}

// Convertir fecha dd/mm/yyyy a yyyy-mm-dd
const convertirFecha = (fechaStr: string): string => {
  const match = fechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    const [, dia, mes, anio] = match
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }
  return fechaStr
}

export function ElectricidadTab({ propiedades, gastos, isDemo, userId }: Props) {
  const [propiedadId, setPropiedadId] = useState<string>('')
  const [medicionesManuales, setMedicionesManuales] = useState<MedicionManual[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    lectura: '',
    notas: ''
  })

  // Cargar mediciones manuales cuando cambia la propiedad
  useEffect(() => {
    if (!propiedadId || isDemo) {
      setMedicionesManuales([])
      return
    }

    async function fetchMediciones() {
      setLoading(true)
      const { data, error } = await supabase
        .from('mediciones_electricidad')
        .select('*')
        .eq('propiedad_id', propiedadId)
        .order('fecha', { ascending: false })

      if (data && !error) {
        setMedicionesManuales(data)
      }
      setLoading(false)
    }

    fetchMediciones()
  }, [propiedadId, isDemo])

  // Propiedad seleccionada
  const propiedad = propiedades.find(p => p.id === propiedadId)
  const esDeportiva = propiedad?.nombre?.toLowerCase().includes('deportiva') || propiedad?.barrio?.toLowerCase() === 'deportiva'

  // Extraer datos de electricidad desde gastos importados de Eidico
  const datosElectricidad = useMemo((): DatoElectricidad[] => {
    if (!propiedadId) return []

    const datos: DatoElectricidad[] = []

    gastos
      .filter(g => g.propiedad_id === propiedadId && g.tipo === 'expensa')
      .forEach(g => {
        // Buscar en detalle
        if (g.detalle) {
          g.detalle.forEach((d, idx) => {
            if (d.concepto.toLowerCase().includes('electricidad') && !d.concepto.toLowerCase().includes('potencia')) {
              const medicionMatch = d.concepto.match(/Medición\s*(\d+)/i)
              const fechaMedMatch = d.concepto.match(/al\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
              const consumoMatch = d.concepto.match(/Consumo\s*(?:Kwh)?\s*(\d+)/i) || d.concepto.match(/Consumo\s*(\d+)\s*Kwh/i)

              if (medicionMatch && consumoMatch) {
                datos.push({
                  id: `${g.id}-${idx}`,
                  fechaGasto: g.fecha,
                  fechaMedicion: fechaMedMatch ? convertirFecha(fechaMedMatch[1]) : g.fecha,
                  medicion: parseInt(medicionMatch[1]),
                  consumo: parseInt(consumoMatch[1]),
                  monto: d.monto,
                  fuente: 'eidico'
                })
              }
            }
          })
        }

        // Buscar en concepto principal si no hay detalle
        if (g.concepto.toLowerCase().includes('electricidad') && !g.concepto.toLowerCase().includes('potencia')) {
          const medicionMatch = g.concepto.match(/Medición\s*(\d+)/i)
          const fechaMedMatch = g.concepto.match(/al\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
          const consumoMatch = g.concepto.match(/Consumo\s*(?:Kwh)?\s*(\d+)/i) || g.concepto.match(/Consumo\s*(\d+)\s*Kwh/i)

          // Verificar que no se haya agregado ya desde detalle
          const yaExiste = datos.some(d => d.id.startsWith(`${g.id}-`))

          if (medicionMatch && consumoMatch && !yaExiste) {
            datos.push({
              id: `${g.id}-main`,
              fechaGasto: g.fecha,
              fechaMedicion: fechaMedMatch ? convertirFecha(fechaMedMatch[1]) : g.fecha,
              medicion: parseInt(medicionMatch[1]),
              consumo: parseInt(consumoMatch[1]),
              monto: g.monto,
              fuente: 'eidico'
            })
          }
        }
      })

    // Ordenar por fecha de medición (más reciente primero)
    return datos.sort((a, b) => new Date(b.fechaMedicion).getTime() - new Date(a.fechaMedicion).getTime())
  }, [propiedadId, gastos])

  // Último dato
  const ultimoDato = datosElectricidad[0]

  // Datos para el gráfico (últimos 12 registros)
  const datosGrafico = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return datosElectricidad
      .slice(0, 12)
      .reverse()
      .map(d => ({
        mes: meses[new Date(d.fechaMedicion).getMonth()],
        consumo: d.consumo
      }))
  }, [datosElectricidad])

  // Buscar medición manual para comparar con dato de Eidico
  const buscarMedicionManual = (dato: DatoElectricidad) => {
    // Buscar medición manual cercana a la fecha de medición de Eidico
    return medicionesManuales.find(m => {
      const fechaManual = new Date(m.fecha)
      const fechaEidico = new Date(dato.fechaMedicion)
      const diffDias = Math.abs((fechaManual.getTime() - fechaEidico.getTime()) / (1000 * 60 * 60 * 24))
      return diffDias < 15 // Dentro de 15 días
    })
  }

  // Handlers
  const openModal = (medicion?: MedicionManual) => {
    if (medicion) {
      setEditingId(medicion.id)
      setForm({
        fecha: medicion.fecha,
        lectura: medicion.lectura.toString(),
        notas: medicion.notas || ''
      })
    } else {
      setEditingId(null)
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        lectura: '',
        notas: ''
      })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm({ fecha: new Date().toISOString().split('T')[0], lectura: '', notas: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propiedadId || !form.lectura || isDemo) return

    setSaving(true)

    const data = {
      propiedad_id: propiedadId,
      fecha: form.fecha,
      lectura: parseInt(form.lectura),
      consumo: null,
      notas: form.notas || null,
      user_id: userId
    }

    try {
      if (editingId) {
        await supabase.from('mediciones_electricidad').update(data).eq('id', editingId)
      } else {
        await supabase.from('mediciones_electricidad').insert(data)
      }

      // Recargar mediciones
      const { data: nuevas } = await supabase
        .from('mediciones_electricidad')
        .select('*')
        .eq('propiedad_id', propiedadId)
        .order('fecha', { ascending: false })

      if (nuevas) setMedicionesManuales(nuevas)
      closeModal()
    } catch (error) {
      console.error('Error guardando medición:', error)
    }

    setSaving(false)
  }

  const handleDeleteManual = async (id: number) => {
    if (isDemo) return
    if (!confirm('¿Eliminar esta medición manual?')) return

    await supabase.from('mediciones_electricidad').delete().eq('id', id)
    setMedicionesManuales(medicionesManuales.filter(m => m.id !== id))
  }

  // Calcular totales
  const totalConsumo = datosElectricidad.reduce((acc, d) => acc + d.consumo, 0)
  const totalMonto = datosElectricidad.reduce((acc, d) => acc + d.monto, 0)
  const promedioConsumo = datosElectricidad.length > 0 ? Math.round(totalConsumo / datosElectricidad.length) : 0

  return (
    <div className="space-y-4">
      {/* Selector de propiedad */}
      <Card>
        <CardContent className="py-4">
          <Select
            label="Seleccionar Propiedad"
            value={propiedadId}
            onChange={(e) => setPropiedadId(e.target.value)}
            options={[
              { value: '', label: 'Elegir propiedad...' },
              ...propiedades.map(p => ({ value: p.id, label: p.nombre }))
            ]}
          />
        </CardContent>
      </Card>

      {propiedadId && (
        <>
          {/* Resumen */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" />
                  Resumen de Consumo
                  {esDeportiva && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Deportiva +20%
                    </span>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => openModal()}>
                  <Plus size={14} />
                  Mi Medición
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {datosElectricidad.length === 0 ? (
                <div className="text-center py-6 text-costa-gris">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay datos de electricidad importados</p>
                  <p className="text-xs mt-1">Importá expensas de Eidico en la solapa "Gastos y Expensas"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-costa-gris">Última medición</p>
                    <p className="text-lg font-bold text-costa-navy">{formatNumero(ultimoDato.medicion)}</p>
                    <p className="text-xs text-costa-gris">{formatFecha(ultimoDato.fechaMedicion)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-costa-gris">Último consumo</p>
                    <p className="text-lg font-bold text-costa-navy">{formatNumero(ultimoDato.consumo)} kWh</p>
                    <p className="text-xs text-costa-gris">{formatMonto(ultimoDato.monto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-costa-gris">Promedio mensual</p>
                    <p className="text-lg font-bold text-costa-navy">{formatNumero(promedioConsumo)} kWh</p>
                  </div>
                  <div>
                    <p className="text-xs text-costa-gris">Total registros</p>
                    <p className="text-lg font-bold text-costa-navy">{datosElectricidad.length}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de datos de Eidico */}
          {datosElectricidad.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Historial de Consumo (desde Eidico)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-costa-beige/50">
                      <tr>
                        <th className="p-3 text-left">Fecha Medición</th>
                        <th className="p-3 text-right">Medidor</th>
                        <th className="p-3 text-right">Consumo</th>
                        <th className="p-3 text-right">Monto</th>
                        <th className="p-3 text-center">Mi Medición</th>
                        <th className="p-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosElectricidad.map((dato) => {
                        const medManual = buscarMedicionManual(dato)
                        const diferencia = medManual ? medManual.lectura - dato.medicion : null

                        return (
                          <tr key={dato.id} className="border-t border-costa-beige">
                            <td className="p-3">
                              <span>{formatFecha(dato.fechaMedicion)}</span>
                            </td>
                            <td className="p-3 text-right font-mono">{formatNumero(dato.medicion)}</td>
                            <td className="p-3 text-right font-medium">{formatNumero(dato.consumo)} kWh</td>
                            <td className="p-3 text-right text-costa-gris">{formatMonto(dato.monto)}</td>
                            <td className="p-3 text-center font-mono">
                              {medManual ? formatNumero(medManual.lectura) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {medManual ? (
                                diferencia === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                    <Check size={14} /> Coincide
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 text-xs ${Math.abs(diferencia!) > 100 ? 'text-costa-coral' : 'text-orange-500'}`}>
                                    <AlertTriangle size={14} />
                                    {diferencia! > 0 ? '+' : ''}{formatNumero(diferencia!)}
                                  </span>
                                )
                              ) : (
                                <span className="text-costa-gris text-xs">Sin verificar</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mediciones manuales */}
          {medicionesManuales.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Mis Mediciones Manuales</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-costa-beige/50">
                      <tr>
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-right">Lectura</th>
                        <th className="p-3 text-left">Notas</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicionesManuales.map((m) => (
                        <tr key={m.id} className="border-t border-costa-beige">
                          <td className="p-3">{formatFecha(m.fecha)}</td>
                          <td className="p-3 text-right font-mono">{formatNumero(m.lectura)}</td>
                          <td className="p-3 text-costa-gris text-xs">{m.notas || '-'}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openModal(m)}>
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteManual(m.id)}>
                                <Trash2 size={14} className="text-costa-coral" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráfico */}
          {datosGrafico.length > 1 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Evolución del Consumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGrafico}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`${formatNumero(Number(value) || 0)} kWh`, 'Consumo']}
                      />
                      <Bar dataKey="consumo" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal Nueva Medición Manual */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? "Editar Medición" : "Agregar Mi Medición"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-costa-gris">
            Registrá tu lectura del medidor para compararla con lo que cobra Eidico.
          </p>

          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Fecha de la medición</label>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Lectura del medidor</label>
            <input
              type="number"
              value={form.lectura}
              onChange={(e) => setForm({ ...form, lectura: e.target.value })}
              className="w-full px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy"
              placeholder="Ej: 59850"
              required
            />
            {ultimoDato && (
              <p className="text-xs text-costa-gris mt-1">
                Última de Eidico: {formatNumero(ultimoDato.medicion)} ({formatFecha(ultimoDato.fechaMedicion)})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Notas (opcional)</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full px-3 py-2 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy resize-none"
              rows={2}
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-costa-beige">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || isDemo}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
