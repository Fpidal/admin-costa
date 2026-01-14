'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Building2, CalendarDays, Users, DollarSign, AlertCircle, Clock, CheckCircle, Receipt, Eye } from 'lucide-react'
import { demoReservas, demoGastos, getDemoStats } from '@/lib/demoData'

interface Propiedad {
  id: number
  nombre: string
}

interface Reserva {
  id: number | string
  huesped: string
  check_in: string
  check_out: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  monto: number
  cantidad_personas: number
  propiedad_id: number | string
  propiedades?: Propiedad | { id: string; nombre: string; direccion: string }
  inquilinos?: { nombre: string }
}

interface Gasto {
  id: number | string
  concepto: string
  monto: number
  fecha_vencimiento: string
  pagado: boolean
  tipo: string
  propiedad_id: number | string
  propiedades?: Propiedad | { id: string; nombre: string; direccion: string }
}

interface Cobro {
  id: number
  monto: number
  moneda: string
  aplicar_a: string
}

const formatMonto = (monto: number) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(monto)
}

const formatMontoUSD = (monto: number) => {
  return `U$D ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(monto)}`
}

const formatFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { userId } = useAuth()

  const [inquilinosCount, setInquilinosCount] = useState(0)
  const [reservasPendientes, setReservasPendientes] = useState(0)
  const [gastosRealizados, setGastosRealizados] = useState(0)
  const [gastosPendientesTotal, setGastosPendientesTotal] = useState(0)
  const [ingresosAlquiler, setIngresosAlquiler] = useState(0)
  const [expensasTotal, setExpensasTotal] = useState(0)
  const [proximasReservas, setProximasReservas] = useState<Reserva[]>([])
  const [gastosPendientesList, setGastosPendientesList] = useState<Gasto[]>([])
  const [alertas, setAlertas] = useState<{ tipo: string; titulo: string; mensaje: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      // Cargar datos demo
      const stats = getDemoStats()
      setInquilinosCount(stats.totalInquilinos)
      setReservasPendientes(stats.reservasPendientes)
      setGastosRealizados(stats.gastosPagados)
      setGastosPendientesTotal(stats.gastosPendientes)
      setIngresosAlquiler(stats.ingresosAlquiler)
      setExpensasTotal(stats.expensasPendientes)

      // Próximas reservas demo
      const hoy = new Date().toISOString().split('T')[0]
      const proximas = demoReservas
        .filter(r => r.fecha_inicio >= hoy)
        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
        .slice(0, 5) as unknown as Reserva[]
      setProximasReservas(proximas)

      // Gastos pendientes demo
      const gastosPend = demoGastos
        .filter(g => !g.pagado)
        .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
        .slice(0, 5) as unknown as Gasto[]
      setGastosPendientesList(gastosPend)

      // Alertas demo
      const alertasTemp: { tipo: string; titulo: string; mensaje: string }[] = []
      if (stats.reservasPendientes > 0) {
        alertasTemp.push({
          tipo: 'warning',
          titulo: 'Reservas pendientes',
          mensaje: `Hay ${stats.reservasPendientes} reserva${stats.reservasPendientes > 1 ? 's' : ''} pendiente${stats.reservasPendientes > 1 ? 's' : ''} de confirmar`
        })
      }
      // Gastos vencidos demo
      const gastosVencidos = demoGastos.filter(g => !g.pagado && g.fecha_vencimiento < hoy)
      gastosVencidos.forEach(gasto => {
        alertasTemp.push({
          tipo: 'danger',
          titulo: 'Gasto vencido',
          mensaje: `${gasto.concepto} venció el ${formatFecha(gasto.fecha_vencimiento)}`
        })
      })
      setAlertas(alertasTemp)

      setLoading(false)
      return
    }

    async function fetchData() {
      if (!userId) return

      try {
        const hoy = new Date().toISOString().split('T')[0]
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const inicioMesStr = inicioMes.toISOString().split('T')[0]

        // Inquilinos: contar cantidad_personas de todas las reservas activas
        const { data: reservasActivas } = await supabase
          .from('reservas')
          .select('cantidad_personas')
          .eq('user_id', userId)
          .in('estado', ['confirmada', 'pendiente'])
        const totalInquilinos = reservasActivas?.reduce((acc, r) => acc + (r.cantidad_personas || 1), 0) || 0
        setInquilinosCount(totalInquilinos)

        // Reservas pendientes
        const { count: resPendientes } = await supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('estado', 'pendiente')
        setReservasPendientes(resPendientes || 0)

        // Gastos realizados (pagados) - todos los gastos pagados
        const { data: gastosPagados } = await supabase
          .from('gastos')
          .select('monto')
          .eq('user_id', userId)
          .eq('pagado', true)
        const totalGastosRealizados = gastosPagados?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0
        setGastosRealizados(totalGastosRealizados)

        // Gastos pendientes (no pagados) - todos los gastos pendientes
        const { data: gastosPend } = await supabase
          .from('gastos')
          .select('monto')
          .eq('user_id', userId)
          .eq('pagado', false)
        const totalGastosPendientes = gastosPend?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0
        setGastosPendientesTotal(totalGastosPendientes)

        // Ingresos por alquiler (cobros del mes, solo alquiler)
        const { data: cobrosAlquiler } = await supabase
          .from('cobros')
          .select('monto, moneda')
          .eq('user_id', userId)
          .eq('aplicar_a', 'alquiler')
          .gte('fecha', inicioMesStr)
        const totalIngresosUSD = cobrosAlquiler?.filter(c => c.moneda === 'USD').reduce((acc, c) => acc + (c.monto || 0), 0) || 0
        setIngresosAlquiler(totalIngresosUSD)

        // Expensas pendientes (gastos de tipo expensa no pagados)
        const { data: expensas } = await supabase
          .from('gastos')
          .select('monto')
          .eq('user_id', userId)
          .eq('tipo', 'expensa')
          .eq('pagado', false)
        const totalExpensas = expensas?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0
        setExpensasTotal(totalExpensas)

        // Próximas reservas
        const { data: proxReservas } = await supabase
          .from('reservas')
          .select('*, propiedades(nombre), inquilinos(nombre)')
          .eq('user_id', userId)
          .gte('fecha_inicio', hoy)
          .in('estado', ['confirmada', 'pendiente'])
          .order('fecha_inicio', { ascending: true })
          .limit(5)
        setProximasReservas(proxReservas || [])

        // Lista de gastos pendientes
        const { data: gastosList } = await supabase
          .from('gastos')
          .select('*, propiedades(nombre)')
          .eq('user_id', userId)
          .eq('pagado', false)
          .order('fecha_vencimiento', { ascending: true })
          .limit(5)
        setGastosPendientesList(gastosList || [])

        // Alertas
        const alertasTemp: { tipo: string; titulo: string; mensaje: string }[] = []

        // Reservas pendientes de confirmar
        if ((resPendientes || 0) > 0) {
          alertasTemp.push({
            tipo: 'warning',
            titulo: 'Reservas pendientes',
            mensaje: `Hay ${resPendientes} reserva${(resPendientes || 0) > 1 ? 's' : ''} pendiente${(resPendientes || 0) > 1 ? 's' : ''} de confirmar`
          })
        }

        // Gastos vencidos
        const { data: gastosVencidos } = await supabase
          .from('gastos')
          .select('concepto, fecha_vencimiento')
          .eq('user_id', userId)
          .eq('pagado', false)
          .lt('fecha_vencimiento', hoy)

        gastosVencidos?.forEach(gasto => {
          alertasTemp.push({
            tipo: 'danger',
            titulo: 'Gasto vencido',
            mensaje: `${gasto.concepto} venció el ${formatFecha(gasto.fecha_vencimiento)}`
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
  }, [isDemo, userId])

  const stats = [
    { name: 'Inquilinos', value: inquilinosCount.toString(), icon: Users, color: 'text-costa-navy', bg: 'bg-costa-beige' },
    { name: 'Reservas pendientes', value: reservasPendientes.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Ingresos alquiler', value: formatMontoUSD(ingresosAlquiler), icon: DollarSign, color: 'text-costa-olivo', bg: 'bg-costa-olivo/10' },
  ]

  const statsGastos = [
    { name: 'Gastos realizados', value: formatMonto(gastosRealizados), icon: CheckCircle, color: 'text-costa-olivo', bg: 'bg-costa-olivo/10' },
    { name: 'Gastos pendientes', value: formatMonto(gastosPendientesTotal), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Expensas', value: formatMonto(expensasTotal), icon: Receipt, color: 'text-costa-navy', bg: 'bg-costa-beige' },
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

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-600" />
          <span className="text-amber-800 font-medium">Modo Demo</span>
          <span className="text-amber-600 text-sm">- Los datos mostrados son ficticios</span>
        </div>
      )}

      {/* Stats Grid - Reservas e Ingresos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

      {/* Stats Grid - Gastos y Expensas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statsGastos.map((stat) => (
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
                {proximasReservas.map((reserva: Reserva) => (
                  <div key={reserva.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{reserva.propiedades?.nombre || 'Propiedad'}</p>
                      <p className="text-sm text-gray-500">
                        {reserva.inquilinos?.nombre || '-'} • {formatFecha(reserva.fecha_inicio)} - {formatFecha(reserva.fecha_fin)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-costa-gris">{reserva.cantidad_personas || 1} pers.</span>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        reserva.estado === 'confirmada'
                          ? 'bg-costa-olivo/20 text-costa-olivo'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {reserva.estado === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                      </span>
                    </div>
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
            {gastosPendientesList.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay gastos pendientes</p>
            ) : (
              <div className="space-y-4">
                {gastosPendientesList.map((gasto) => (
                  <div key={gasto.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">
                        {gasto.concepto} {gasto.propiedades?.nombre ? `- ${gasto.propiedades.nombre}` : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        Vence: {gasto.fecha_vencimiento ? formatFecha(gasto.fecha_vencimiento) : 'Sin fecha'}
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

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <DashboardContent />
    </Suspense>
  )
}
