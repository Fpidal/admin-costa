'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Building2, CalendarDays, Users, DollarSign, AlertCircle } from 'lucide-react'

interface Propiedad {
  id: number
  nombre: string
}

interface Reserva {
  id: number
  huesped: string
  check_in: string
  check_out: string
  estado: string
  monto: number
  propiedad_id: number
  propiedades?: Propiedad
}

interface Gasto {
  id: number
  concepto: string
  monto: number
  vencimiento: string
  estado: string
  propiedad_id: number
  propiedades?: Propiedad
}

interface Inquilino {
  id: number
  nombre: string
  fecha_fin: string
  estado: string
}

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default function Dashboard() {
  const [propiedadesCount, setPropiedadesCount] = useState(0)
  const [reservasCount, setReservasCount] = useState(0)
  const [inquilinosCount, setInquilinosCount] = useState(0)
  const [ingresosMes, setIngresosMes] = useState(0)
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([])
  const [gastosPendientes, setGastosPendientes] = useState<Gasto[]>([])
  const [alertas, setAlertas] = useState<{ tipo: string; titulo: string; mensaje: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Contar propiedades
        const { count: propCount } = await supabase
          .from('propiedades')
          .select('*', { count: 'exact', head: true })
        setPropiedadesCount(propCount || 0)

        // Contar reservas activas (confirmadas y pendientes)
        const { count: resCount } = await supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .in('estado', ['confirmada', 'pendiente'])
        setReservasCount(resCount || 0)

        // Contar inquilinos activos
        const { count: inqCount } = await supabase
          .from('inquilinos')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'activo')
        setInquilinosCount(inqCount || 0)

        // Ingresos del mes (reservas confirmadas)
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const { data: reservasMes } = await supabase
          .from('reservas')
          .select('monto')
          .eq('estado', 'confirmada')
          .gte('check_in', inicioMes.toISOString().split('T')[0])
        const totalIngresos = reservasMes?.reduce((acc, r) => acc + (r.monto || 0), 0) || 0
        setIngresosMes(totalIngresos)

        // Próximas reservas
        const hoy = new Date().toISOString().split('T')[0]
        const { data: proxReservas } = await supabase
          .from('reservas')
          .select('*, propiedades(nombre)')
          .gte('check_in', hoy)
          .in('estado', ['confirmada', 'pendiente'])
          .order('check_in', { ascending: true })
          .limit(5)
        setProximasReservas(proxReservas || [])

        // Gastos pendientes
        const { data: gastos } = await supabase
          .from('gastos')
          .select('*, propiedades(nombre)')
          .eq('estado', 'pendiente')
          .order('vencimiento', { ascending: true })
          .limit(5)
        setGastosPendientes(gastos || [])

        // Alertas: contratos por vencer (próximos 30 días)
        const en30Dias = new Date()
        en30Dias.setDate(en30Dias.getDate() + 30)
        const { data: inquilinosPorVencer } = await supabase
          .from('inquilinos')
          .select('nombre, fecha_fin')
          .eq('estado', 'activo')
          .lte('fecha_fin', en30Dias.toISOString().split('T')[0])
          .gte('fecha_fin', hoy)

        const alertasTemp: { tipo: string; titulo: string; mensaje: string }[] = []
        inquilinosPorVencer?.forEach(inq => {
          const diasRestantes = Math.ceil((new Date(inq.fecha_fin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          alertasTemp.push({
            tipo: 'warning',
            titulo: 'Contrato por vencer',
            mensaje: `El contrato de ${inq.nombre} vence en ${diasRestantes} días`
          })
        })

        // Gastos vencidos
        const { data: gastosVencidos } = await supabase
          .from('gastos')
          .select('concepto, vencimiento')
          .eq('estado', 'pendiente')
          .lt('vencimiento', hoy)

        gastosVencidos?.forEach(gasto => {
          alertasTemp.push({
            tipo: 'danger',
            titulo: 'Gasto vencido',
            mensaje: `${gasto.concepto} venció el ${formatFecha(gasto.vencimiento)}`
          })
        })

        setAlertas(alertasTemp)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const stats = [
    { name: 'Propiedades', value: propiedadesCount.toString(), icon: Building2, color: 'text-costa-navy', bg: 'bg-costa-beige' },
    { name: 'Reservas activas', value: reservasCount.toString(), icon: CalendarDays, color: 'text-costa-olivo', bg: 'bg-costa-beige' },
    { name: 'Inquilinos', value: inquilinosCount.toString(), icon: Users, color: 'text-costa-navy', bg: 'bg-costa-beige' },
    { name: 'Ingresos del mes', value: formatMonto(ingresosMes), icon: DollarSign, color: 'text-costa-olivo', bg: 'bg-costa-beige' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen general de tu gestión de propiedades"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-costa-gris">{stat.name}</p>
                <p className="text-2xl font-bold text-costa-navy">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bloque institucional */}
      <div className="mb-6 p-5 rounded-xl bg-costa-navy/5 border border-costa-navy/10">
        <h3 className="text-sm font-semibold text-costa-navy tracking-wide mb-2">Modelo de gestión</h3>
        <p className="text-costa-gris text-sm leading-relaxed">
          Propiedades administradas directamente por sus propietarios. Sin intermediarios. Sin comisiones ocultas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas reservas */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {proximasReservas.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay reservas próximas</p>
            ) : (
              <div className="space-y-4">
                {proximasReservas.map((reserva) => (
                  <div key={reserva.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{reserva.propiedades?.nombre || 'Propiedad'}</p>
                      <p className="text-sm text-gray-500">
                        {reserva.huesped} • {formatFecha(reserva.check_in)} - {formatFecha(reserva.check_out)}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      reserva.estado === 'confirmada'
                        ? 'bg-costa-olivo/20 text-costa-olivo'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {reserva.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gastos pendientes */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPendientes.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay gastos pendientes</p>
            ) : (
              <div className="space-y-4">
                {gastosPendientes.map((gasto) => (
                  <div key={gasto.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">
                        {gasto.concepto} {gasto.propiedades?.nombre ? `- ${gasto.propiedades.nombre}` : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        Vence: {gasto.vencimiento ? formatFecha(gasto.vencimiento) : 'Sin fecha'}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900">{formatMonto(gasto.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay alertas</p>
            ) : (
              <div className="space-y-3">
                {alertas.map((alerta, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      alerta.tipo === 'danger' ? 'bg-costa-coral/10' : 'bg-costa-beige'
                    }`}
                  >
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      alerta.tipo === 'danger' ? 'text-costa-coral' : 'text-costa-gris'
                    }`} />
                    <div>
                      <p className={`font-medium ${
                        alerta.tipo === 'danger' ? 'text-costa-coral' : 'text-costa-navy'
                      }`}>{alerta.titulo}</p>
                      <p className={`text-sm ${
                        alerta.tipo === 'danger' ? 'text-costa-coral' : 'text-costa-gris'
                      }`}>{alerta.mensaje}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
