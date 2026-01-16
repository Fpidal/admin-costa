'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CalendarioPrecios } from '@/components/CalendarioPrecios'
import { PrecioCalendario, TEMPORADAS_PRESETS, generarFechasTemporada } from '@/lib/calcularPrecio'
import { Card, CardContent, Button, Modal, Badge } from '@/components/ui'
import { ArrowLeft, Save, Calendar, Copy, Sparkles, Trash2 } from 'lucide-react'

interface Propiedad {
  id: number
  nombre: string
  lote: string
}

interface Reserva {
  id: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
  inquilinos?: { nombre: string }
}

export default function PreciosPage() {
  const params = useParams()
  const router = useRouter()
  const propiedadId = params.id as string
  const { userId } = useAuth()

  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [precios, setPrecios] = useState<PrecioCalendario[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [anio, setAnio] = useState(new Date().getFullYear())

  // Modal de edición
  const [modalOpen, setModalOpen] = useState(false)
  const [rangoSeleccionado, setRangoSeleccionado] = useState<{ inicio: Date; fin: Date } | null>(null)
  const [formPrecio, setFormPrecio] = useState({
    precio_noche: 0,
    moneda: 'USD',
    minimo_noches: 1,
    disponible: true,
    temporada: '',
    notas: '',
  })

  // Modal de presets
  const [presetModalOpen, setPresetModalOpen] = useState(false)
  const [precioBase, setPrecioBase] = useState(200)

  useEffect(() => {
    if (userId && propiedadId) {
      fetchData()
    }
  }, [userId, propiedadId, anio])

  async function fetchData() {
    const [resProp, resPrecios, resReservas] = await Promise.all([
      supabase.from('propiedades').select('id, nombre, lote').eq('id', propiedadId).single(),
      supabase
        .from('precios_calendario')
        .select('*')
        .eq('propiedad_id', propiedadId)
        .gte('fecha_inicio', `${anio}-01-01`)
        .lte('fecha_fin', `${anio}-12-31`)
        .order('fecha_inicio'),
      supabase
        .from('reservas')
        .select('id, fecha_inicio, fecha_fin, estado, inquilinos(nombre)')
        .eq('propiedad_id', propiedadId)
        .in('estado', ['confirmada', 'pendiente'])
        .gte('fecha_fin', `${anio}-01-01`)
        .lte('fecha_inicio', `${anio}-12-31`)
        .order('fecha_inicio'),
    ])

    if (resProp.data) setPropiedad(resProp.data)
    if (resPrecios.data) setPrecios(resPrecios.data)
    if (resReservas.data) setReservas(resReservas.data)
    setLoading(false)
  }

  function handleSelectRange(inicio: Date, fin: Date) {
    setRangoSeleccionado({ inicio, fin })

    // Buscar si ya existe un precio en este rango
    const fechaInicioStr = inicio.toISOString().split('T')[0]
    const precioExistente = precios.find(
      p => fechaInicioStr >= p.fecha_inicio && fechaInicioStr <= p.fecha_fin
    )

    if (precioExistente) {
      setFormPrecio({
        precio_noche: precioExistente.precio_noche,
        moneda: precioExistente.moneda,
        minimo_noches: precioExistente.minimo_noches,
        disponible: precioExistente.disponible,
        temporada: precioExistente.temporada || '',
        notas: precioExistente.notas || '',
      })
    } else {
      setFormPrecio({
        precio_noche: 200,
        moneda: 'USD',
        minimo_noches: 1,
        disponible: true,
        temporada: '',
        notas: '',
      })
    }

    setModalOpen(true)
  }

  async function handleSavePrecio() {
    if (!rangoSeleccionado || !userId) return

    setSaving(true)

    const data = {
      propiedad_id: Number(propiedadId),
      fecha_inicio: rangoSeleccionado.inicio.toISOString().split('T')[0],
      fecha_fin: rangoSeleccionado.fin.toISOString().split('T')[0],
      precio_noche: formPrecio.precio_noche,
      moneda: formPrecio.moneda,
      minimo_noches: formPrecio.minimo_noches,
      disponible: formPrecio.disponible,
      temporada: formPrecio.temporada || null,
      notas: formPrecio.notas || null,
      user_id: userId,
    }

    // Eliminar precios existentes que se solapan
    await supabase
      .from('precios_calendario')
      .delete()
      .eq('propiedad_id', propiedadId)
      .gte('fecha_inicio', data.fecha_inicio)
      .lte('fecha_fin', data.fecha_fin)

    const { error } = await supabase.from('precios_calendario').insert([data])

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      setModalOpen(false)
      fetchData()
    }

    setSaving(false)
  }

  async function aplicarPreset(temporada: keyof typeof TEMPORADAS_PRESETS) {
    if (!userId) return

    setSaving(true)

    const fechas = generarFechasTemporada(anio, temporada, precioBase)

    for (const fecha of fechas) {
      // Eliminar existentes en el rango
      await supabase
        .from('precios_calendario')
        .delete()
        .eq('propiedad_id', propiedadId)
        .gte('fecha_inicio', fecha.inicio)
        .lte('fecha_fin', fecha.fin)

      // Insertar nuevo
      await supabase.from('precios_calendario').insert([{
        propiedad_id: Number(propiedadId),
        fecha_inicio: fecha.inicio,
        fecha_fin: fecha.fin,
        precio_noche: fecha.precio,
        moneda: 'USD',
        minimo_noches: temporada === 'alta' ? 3 : 1,
        disponible: true,
        temporada: temporada,
        user_id: userId,
      }])
    }

    setPresetModalOpen(false)
    fetchData()
    setSaving(false)
  }

  async function copiarAnioAnterior() {
    if (!userId) return

    setSaving(true)

    const { data: preciosAnteriores } = await supabase
      .from('precios_calendario')
      .select('*')
      .eq('propiedad_id', propiedadId)
      .gte('fecha_inicio', `${anio - 1}-01-01`)
      .lte('fecha_fin', `${anio - 1}-12-31`)

    if (preciosAnteriores && preciosAnteriores.length > 0) {
      for (const precio of preciosAnteriores) {
        const nuevaFechaInicio = precio.fecha_inicio.replace(String(anio - 1), String(anio))
        const nuevaFechaFin = precio.fecha_fin.replace(String(anio - 1), String(anio))

        await supabase.from('precios_calendario').insert([{
          propiedad_id: Number(propiedadId),
          fecha_inicio: nuevaFechaInicio,
          fecha_fin: nuevaFechaFin,
          precio_noche: precio.precio_noche,
          moneda: precio.moneda,
          minimo_noches: precio.minimo_noches,
          disponible: precio.disponible,
          temporada: precio.temporada,
          notas: precio.notas,
          user_id: userId,
        }])
      }

      fetchData()
      alert(`${preciosAnteriores.length} registros copiados de ${anio - 1}`)
    } else {
      alert(`No hay precios configurados en ${anio - 1}`)
    }

    setSaving(false)
  }

  async function eliminarPreciosAnio() {
    if (!confirm(`¿Eliminar todos los precios de ${anio}?`)) return

    setSaving(true)

    await supabase
      .from('precios_calendario')
      .delete()
      .eq('propiedad_id', propiedadId)
      .gte('fecha_inicio', `${anio}-01-01`)
      .lte('fecha_fin', `${anio}-12-31`)

    fetchData()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-costa-gris">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/propiedades">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-costa-navy">
              Calendario de Precios
            </h1>
            <p className="text-sm text-costa-gris">
              {propiedad?.nombre} {propiedad?.lote ? `- Lote ${propiedad.lote}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPresetModalOpen(true)}>
            <Sparkles size={14} />
            Aplicar Preset
          </Button>
          <Button variant="secondary" size="sm" onClick={copiarAnioAnterior} disabled={saving}>
            <Copy size={14} />
            Copiar de {anio - 1}
          </Button>
          <Button variant="ghost" size="sm" onClick={eliminarPreciosAnio} disabled={saving}>
            <Trash2 size={14} className="text-costa-coral" />
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">{precios.length}</p>
            <p className="text-xs text-costa-gris">Rangos configurados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">
              {precios.filter(p => p.temporada === 'alta').length}
            </p>
            <p className="text-xs text-costa-gris">Temporada alta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">
              {precios.length > 0 ? `$${Math.round(precios.reduce((a, p) => a + p.precio_noche, 0) / precios.length)}` : '-'}
            </p>
            <p className="text-xs text-costa-gris">Precio promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">
              {precios.filter(p => !p.disponible).length}
            </p>
            <p className="text-xs text-costa-gris">Bloqueados</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendario */}
      <Card>
        <CardContent className="py-4">
          <CalendarioPrecios
            precios={precios}
            reservas={reservas}
            anio={anio}
            onSelectRange={handleSelectRange}
            onChangeAnio={setAnio}
          />
        </CardContent>
      </Card>

      {/* Lista de rangos configurados */}
      {precios.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="font-semibold text-costa-navy mb-3">Rangos configurados en {anio}</h3>
            <div className="space-y-2">
              {precios.map((precio) => (
                <div
                  key={precio.id}
                  className="flex items-center justify-between p-2 bg-costa-beige/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-costa-gris" />
                    <span className="text-sm">
                      {new Date(precio.fecha_inicio).toLocaleDateString('es-AR')} -{' '}
                      {new Date(precio.fecha_fin).toLocaleDateString('es-AR')}
                    </span>
                    {precio.temporada && (
                      <Badge variant="default">{precio.temporada}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-costa-navy">
                      USD {precio.precio_noche}
                    </span>
                    {!precio.disponible && (
                      <Badge variant="danger">Bloqueado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de edición de precio */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Configurar Precio"
        size="sm"
      >
        <div className="space-y-4">
          {rangoSeleccionado && (
            <div className="text-center py-2 bg-costa-beige/30 rounded-lg">
              <p className="text-sm text-costa-gris">Rango seleccionado</p>
              <p className="font-semibold text-costa-navy">
                {rangoSeleccionado.inicio.toLocaleDateString('es-AR')} -{' '}
                {rangoSeleccionado.fin.toLocaleDateString('es-AR')}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Precio/noche</label>
              <input
                type="number"
                value={formPrecio.precio_noche}
                onChange={(e) => setFormPrecio({ ...formPrecio, precio_noche: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Moneda</label>
              <select
                value={formPrecio.moneda}
                onChange={(e) => setFormPrecio({ ...formPrecio, moneda: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mínimo noches</label>
              <input
                type="number"
                min="1"
                value={formPrecio.minimo_noches}
                onChange={(e) => setFormPrecio({ ...formPrecio, minimo_noches: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Temporada</label>
              <select
                value={formPrecio.temporada}
                onChange={(e) => setFormPrecio({ ...formPrecio, temporada: e.target.value })}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">Sin categoría</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
                <option value="especial">Especial</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formPrecio.disponible}
              onChange={(e) => setFormPrecio({ ...formPrecio, disponible: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Disponible para reservar</span>
          </label>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Notas</label>
            <textarea
              value={formPrecio.notas}
              onChange={(e) => setFormPrecio({ ...formPrecio, notas: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none"
              rows={2}
              placeholder="Notas opcionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePrecio} disabled={saving}>
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de presets */}
      <Modal
        isOpen={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        title="Aplicar Preset de Temporada"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Precio base (USD)</label>
            <input
              type="number"
              value={precioBase}
              onChange={(e) => setPrecioBase(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg"
            />
            <p className="text-xs text-costa-gris mt-1">
              Alta: 100%, Media: 80%, Baja: 60%
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-costa-navy">Seleccionar temporada:</p>
            {Object.entries(TEMPORADAS_PRESETS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => aplicarPreset(key as keyof typeof TEMPORADAS_PRESETS)}
                disabled={saving}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-costa-navy transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: config.color }}
                  ></span>
                  <span className="font-medium">{config.nombre}</span>
                </div>
                <span className="text-sm text-costa-gris">
                  ${Math.round(precioBase * config.multiplicador)}/noche
                </span>
              </button>
            ))}
          </div>

          <Button variant="ghost" className="w-full" onClick={() => setPresetModalOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
