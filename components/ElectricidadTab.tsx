'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent, Button, Modal, Select } from '@/components/ui'
import { Plus, Zap, Pencil, Trash2, AlertTriangle, Check } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Propiedad {
  id: string
  nombre: string
  lote?: string
  barrio?: string
}

interface Gasto {
  id: number
  propiedad_id: string | null
  fecha: string
  tipo: string
  concepto: string
  monto: number
  detalle?: { concepto: string; monto: number }[] | null
}

interface Medicion {
  id: number
  propiedad_id: string
  fecha: string
  lectura: number
  consumo: number | null
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

// Datos demo
const demoMediciones: Medicion[] = [
  { id: 1, propiedad_id: 'demo-prop-1', fecha: '2025-10-27', lectura: 59409, consumo: 381, notas: null, created_at: '2025-10-27' },
  { id: 2, propiedad_id: 'demo-prop-1', fecha: '2025-09-27', lectura: 59028, consumo: 420, notas: null, created_at: '2025-09-27' },
  { id: 3, propiedad_id: 'demo-prop-1', fecha: '2025-08-27', lectura: 58608, consumo: 350, notas: null, created_at: '2025-08-27' },
  { id: 4, propiedad_id: 'demo-prop-1', fecha: '2025-07-27', lectura: 58258, consumo: 380, notas: null, created_at: '2025-07-27' },
  { id: 5, propiedad_id: 'demo-prop-1', fecha: '2025-06-27', lectura: 57878, consumo: 290, notas: null, created_at: '2025-06-27' },
  { id: 6, propiedad_id: 'demo-prop-1', fecha: '2025-05-27', lectura: 57588, consumo: 310, notas: null, created_at: '2025-05-27' },
]

export function ElectricidadTab({ propiedades, gastos, isDemo, userId }: Props) {
  const [propiedadId, setPropiedadId] = useState<string>('')
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    lectura: '',
    notas: ''
  })

  // Cargar mediciones cuando cambia la propiedad
  useEffect(() => {
    if (!propiedadId) {
      setMediciones([])
      return
    }

    if (isDemo) {
      setMediciones(demoMediciones.filter(m => m.propiedad_id === propiedadId))
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
        setMediciones(data)
      }
      setLoading(false)
    }

    fetchMediciones()
  }, [propiedadId, isDemo])

  // Propiedad seleccionada
  const propiedad = propiedades.find(p => p.id === propiedadId)
  const esDeportiva = propiedad?.nombre?.toLowerCase().includes('deportiva') || propiedad?.barrio?.toLowerCase() === 'deportiva'

  // Última medición
  const ultimaMedicion = mediciones[0]
  const penultimaMedicion = mediciones[1]

  // Extraer consumos de Eidico desde gastos
  const consumosEidico = useMemo(() => {
    if (!propiedadId) return []

    return gastos
      .filter(g => g.propiedad_id === propiedadId && g.tipo === 'expensa')
      .flatMap(g => {
        const items: { fecha: string; consumo: number; monto: number; medicion?: number }[] = []

        // Buscar en detalle
        if (g.detalle) {
          g.detalle.forEach(d => {
            if (d.concepto.toLowerCase().includes('electricidad') && !d.concepto.toLowerCase().includes('potencia')) {
              const consumoMatch = d.concepto.match(/Consumo\s*(\d+)\s*Kwh/i)
              const medicionMatch = d.concepto.match(/Medición\s*(\d+)/i)
              if (consumoMatch) {
                items.push({
                  fecha: g.fecha,
                  consumo: parseInt(consumoMatch[1]),
                  monto: d.monto,
                  medicion: medicionMatch ? parseInt(medicionMatch[1]) : undefined
                })
              }
            }
          })
        }

        // Buscar en concepto principal
        if (items.length === 0 && g.concepto.toLowerCase().includes('electricidad')) {
          const consumoMatch = g.concepto.match(/Consumo\s*(\d+)\s*Kwh/i)
          const medicionMatch = g.concepto.match(/Medición\s*(\d+)/i)
          if (consumoMatch) {
            items.push({
              fecha: g.fecha,
              consumo: parseInt(consumoMatch[1]),
              monto: g.monto,
              medicion: medicionMatch ? parseInt(medicionMatch[1]) : undefined
            })
          }
        }

        return items
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [propiedadId, gastos])

  // Datos para el gráfico (últimos 12 meses)
  const datosGrafico = useMemo(() => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return mediciones
      .slice(0, 12)
      .reverse()
      .map(m => ({
        mes: meses[new Date(m.fecha).getMonth()],
        consumo: m.consumo || 0
      }))
  }, [mediciones])

  // Comparar medición manual con Eidico
  const compararConEidico = (medicion: Medicion) => {
    const eidico = consumosEidico.find(e => {
      // Buscar por medición o por fecha aproximada
      if (e.medicion && e.medicion === medicion.lectura) return true
      const fechaMed = new Date(medicion.fecha)
      const fechaEid = new Date(e.fecha)
      const diffDias = Math.abs((fechaMed.getTime() - fechaEid.getTime()) / (1000 * 60 * 60 * 24))
      return diffDias < 45 // Dentro de 45 días
    })

    if (!eidico) return null

    const diferencia = (medicion.consumo || 0) - eidico.consumo
    return { eidico, diferencia }
  }

  // Handlers
  const openModal = (medicion?: Medicion) => {
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

    const lecturaNum = parseInt(form.lectura)

    // Calcular consumo basado en medición anterior
    let consumo = null
    if (editingId) {
      // Si estamos editando, buscar la medición anterior a esta
      const idx = mediciones.findIndex(m => m.id === editingId)
      const anterior = mediciones[idx + 1]
      if (anterior) {
        consumo = lecturaNum - anterior.lectura
      }
    } else {
      // Nueva medición: usar la última como anterior
      if (ultimaMedicion) {
        consumo = lecturaNum - ultimaMedicion.lectura
      }
    }

    const data = {
      propiedad_id: propiedadId,
      fecha: form.fecha,
      lectura: lecturaNum,
      consumo,
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

      if (nuevas) setMediciones(nuevas)
      closeModal()
    } catch (error) {
      console.error('Error guardando medición:', error)
    }

    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (isDemo) return
    if (!confirm('¿Eliminar esta medición?')) return

    await supabase.from('mediciones_electricidad').delete().eq('id', id)
    setMediciones(mediciones.filter(m => m.id !== id))
  }

  // Consumo calculado en tiempo real
  const consumoCalculado = useMemo(() => {
    if (!form.lectura || !ultimaMedicion) return null
    const lectura = parseInt(form.lectura)
    if (isNaN(lectura)) return null
    return lectura - ultimaMedicion.lectura
  }, [form.lectura, ultimaMedicion])

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
                  Resumen
                  {esDeportiva && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Deportiva +20%
                    </span>
                  )}
                </div>
                <Button size="sm" onClick={() => openModal()}>
                  <Plus size={14} />
                  Nueva Medición
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <p className="text-costa-gris text-sm">Cargando...</p>
              ) : ultimaMedicion ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-costa-gris">Última lectura</p>
                    <p className="text-lg font-bold text-costa-navy">{formatNumero(ultimaMedicion.lectura)}</p>
                    <p className="text-xs text-costa-gris">{formatFecha(ultimaMedicion.fecha)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-costa-gris">Último consumo</p>
                    <p className="text-lg font-bold text-costa-navy">{ultimaMedicion.consumo ? `${formatNumero(ultimaMedicion.consumo)} kWh` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-costa-gris">Total mediciones</p>
                    <p className="text-lg font-bold text-costa-navy">{mediciones.length}</p>
                  </div>
                </div>
              ) : (
                <p className="text-costa-gris text-sm">No hay mediciones registradas</p>
              )}
            </CardContent>
          </Card>

          {/* Historial */}
          {mediciones.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Historial de Mediciones</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-costa-beige/50">
                      <tr>
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-right">Lectura</th>
                        <th className="p-3 text-right">Consumo</th>
                        <th className="p-3 text-right">Eidico</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediciones.map((medicion) => {
                        const comparacion = compararConEidico(medicion)
                        return (
                          <tr key={medicion.id} className="border-t border-costa-beige">
                            <td className="p-3">{formatFecha(medicion.fecha)}</td>
                            <td className="p-3 text-right font-mono">{formatNumero(medicion.lectura)}</td>
                            <td className="p-3 text-right">
                              {medicion.consumo ? `${formatNumero(medicion.consumo)} kWh` : '-'}
                            </td>
                            <td className="p-3 text-right text-costa-gris">
                              {comparacion ? `${formatNumero(comparacion.eidico.consumo)} kWh` : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {comparacion ? (
                                comparacion.diferencia === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <Check size={14} /> OK
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 ${Math.abs(comparacion.diferencia) > 10 ? 'text-orange-500' : 'text-costa-gris'}`}>
                                    <AlertTriangle size={14} />
                                    {comparacion.diferencia > 0 ? '+' : ''}{comparacion.diferencia}
                                  </span>
                                )
                              ) : (
                                <span className="text-costa-gris">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openModal(medicion)}>
                                  <Pencil size={14} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(medicion.id)}>
                                  <Trash2 size={14} className="text-costa-coral" />
                                </Button>
                              </div>
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

      {/* Modal Nueva/Editar Medición */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? 'Editar Medición' : 'Nueva Medición'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-costa-navy mb-1">Fecha</label>
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
            {ultimaMedicion && !editingId && (
              <p className="text-xs text-costa-gris mt-1">
                Última lectura: {formatNumero(ultimaMedicion.lectura)} ({formatFecha(ultimaMedicion.fecha)})
              </p>
            )}
          </div>

          {consumoCalculado !== null && !editingId && (
            <div className="bg-costa-beige/30 p-3 rounded-lg">
              <p className="text-sm">
                <span className="text-costa-gris">Consumo calculado:</span>{' '}
                <span className={`font-bold ${consumoCalculado < 0 ? 'text-costa-coral' : 'text-costa-navy'}`}>
                  {formatNumero(consumoCalculado)} kWh
                </span>
              </p>
              {consumoCalculado < 0 && (
                <p className="text-xs text-costa-coral mt-1">
                  La lectura es menor que la anterior. Verificá el número.
                </p>
              )}
            </div>
          )}

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
