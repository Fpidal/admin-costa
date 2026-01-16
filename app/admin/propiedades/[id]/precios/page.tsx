'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CalendarioPrecios } from '@/components/CalendarioPrecios'
import { PanelReglasPrecios } from '@/components/PanelReglasPrecios'
import { PriceRule, calculateYearMetrics, findUncoveredDays } from '@/lib/priceRules'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react'

interface Propiedad {
  id: string
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
  const propiedadId = params.id as string
  const { userId } = useAuth()

  const [propiedad, setPropiedad] = useState<Propiedad | null>(null)
  const [rules, setRules] = useState<PriceRule[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => {
    if (userId && propiedadId) {
      fetchData()
    }
  }, [userId, propiedadId, anio])

  async function fetchData() {
    setLoading(true)
    const [resProp, resRules, resReservas] = await Promise.all([
      supabase.from('propiedades').select('id, nombre, lote').eq('id', propiedadId).single(),
      supabase
        .from('price_rules')
        .select('*')
        .eq('property_id', propiedadId)
        .order('priority', { ascending: false }),
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
    if (resRules.data) {
      setRules(resRules.data.map((r: any) => ({
        ...r,
        applies_to_days: r.applies_to_days || [],
      })))
    }
    if (resReservas.data) {
      setReservas(resReservas.data.map((r: any) => ({
        id: r.id,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        estado: r.estado,
        inquilinos: r.inquilinos ? { nombre: r.inquilinos.nombre } : undefined
      })))
    }
    setLoading(false)
  }

  async function handleSaveRules(newRules: PriceRule[]) {
    if (!userId) return
    setSaving(true)

    try {
      // Eliminar reglas existentes de esta propiedad
      await supabase
        .from('price_rules')
        .delete()
        .eq('property_id', propiedadId)

      // Insertar nuevas reglas
      const rulesToInsert = newRules.map(rule => ({
        property_id: propiedadId,
        name: rule.name,
        category: rule.category,
        price_per_night: rule.price_per_night,
        start_date: rule.start_date,
        end_date: rule.end_date,
        applies_to_days: rule.applies_to_days || [],
        min_nights: rule.min_nights,
        priority: rule.priority,
        active: rule.active,
        user_id: userId,
      }))

      if (rulesToInsert.length > 0) {
        const { error } = await supabase.from('price_rules').insert(rulesToInsert)
        if (error) throw error
      }

      await fetchData()
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    }

    setSaving(false)
  }

  async function handleDeleteRule(ruleId: string) {
    if (!ruleId.startsWith('temp-')) {
      await supabase.from('price_rules').delete().eq('id', ruleId)
    }
    await fetchData()
  }

  // Calcular métricas
  const metrics = calculateYearMetrics(anio, rules)
  const uncoveredDays = findUncoveredDays(anio, rules)

  // Handler para seleccionar rango (no usado en esta versión pero requerido por el componente)
  function handleSelectRange(inicio: Date, fin: Date) {
    // Podría abrir un modal para crear regla en ese rango
    console.log('Rango seleccionado:', inicio, fin)
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
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">{metrics.activeRules}</p>
            <p className="text-xs text-costa-gris">Reglas activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">{metrics.highSeasonDays}</p>
            <p className="text-xs text-costa-gris">Días temp. alta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-costa-navy">
              ${metrics.averagePrice}
            </p>
            <p className="text-xs text-costa-gris">Precio promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              {metrics.coveragePercent === 100 ? (
                <CheckCircle size={16} className="text-costa-olivo" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500" />
              )}
              <p className="text-2xl font-bold text-costa-navy">{metrics.coveragePercent}%</p>
            </div>
            <p className="text-xs text-costa-gris">Cobertura año</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de días sin precio */}
      {uncoveredDays.length > 0 && uncoveredDays.length <= 30 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle size={16} />
            <span>
              {uncoveredDays.length} días sin precio configurado en {anio}
            </span>
          </div>
        </div>
      )}

      {/* Layout principal: Calendario + Panel de reglas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario (1/3) */}
        <Card>
          <CardContent className="py-4">
            <CalendarioPrecios
              rules={rules}
              reservas={reservas}
              anio={anio}
              onSelectRange={handleSelectRange}
              onChangeAnio={setAnio}
            />
          </CardContent>
        </Card>

        {/* Panel de reglas (2/3) */}
        <Card className="lg:col-span-2">
          <CardContent className="py-4">
            <PanelReglasPrecios
              rules={rules}
              propertyId={propiedadId}
              year={anio}
              onSave={handleSaveRules}
              onDelete={handleDeleteRule}
              saving={saving}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
