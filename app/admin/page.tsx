'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Building2, CalendarDays, Users, DollarSign, AlertCircle, Clock, CheckCircle, Receipt } from 'lucide-react'

interface Propiedad {
  id: number
  nombre: string
}

interface Reserva {
  id: number
  huesped: string
  check_in: string
  check_out: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  monto: number
  cantidad_personas: number
  propiedad_id: number
  propiedades?: Propiedad
  inquilinos?: { nombre: string }
}

interface Gasto {
  id: number
  concepto: string
  monto: number
  vencimiento: string
  estado: string
  tipo: string
  propiedad_id: number
  propiedades?: Propiedad
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

export default function Dashboard() {
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
    async function fetchData() {
      try {
        const hoy = new Date().toISOString().split('T')[0]
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const inicioMesStr = inicioMes.toISOString().split('T')[0]

        // Inquilinos: contar cantidad_personas de todas las reservas activas
        const { data: reservasActivas } = await supabase
          .from('reservas')
          .select('cantidad_personas')
          .in('estado', ['confirmada', 'pendiente'])
        const totalInquilinos = reservasActivas?.reduce((acc, r) => acc + (r.cantidad_personas || 1), 0) || 0
        setInquilinosCount(totalInquilinos)

        // Reservas pendientes
        const { count: resPendientes } = await supabase
          .from('reservas')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
        setReservasPendientes(resPendientes || 0)

        // Gastos realizados (pagados) del mes
        const { data: gastosPagados } = await supabase
          .from('gastos')
          .select('monto')
          .eq('estado', 'pagado')
          .gte('fecha_pago', inicioMesStr)
        const totalGastosRealizados = gastosPagados?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0
        setGastosRealizados(totalGastosRealizados)

        // Gastos pendientes (total)
        const { data: gastosPend } = await supabase
          .from('gastos')
          .select('monto')
          .eq('estado', 'pendiente')
        const totalGastosPendientes = gastosPend?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0
        setGastosPendientesTotal(totalGastosPendientes)

        // Ingresos por alquiler (cobros del mes, solo alquiler)
        const { data: cobrosAlquiler } = await supabase
          .from('cobros')
          .select('monto, moneda')
          .eq('aplicar_a', 'alquiler')
          .gte('fecha', inicioMesStr)
        const totalIngresosUSD = cobrosAlquiler?.filter(c => c.moneda === 'USD').reduce((acc, c) => acc + (c.monto || 0), 0) || 0
        setIngresosAlquiler(totalIngresosUSD)

        // Expensas (gastos de tipo expensa)
        const { data: expensas } = await supabase
          .from('gastos')
          .select('monto')
          .eq('tipo', 'expensa')
          .eq('estado', 'pendiente')
        const totalExpensas = expensas?.reduce((acc, g) => acc + (g.monto || 0), 0) || 0
        setExpensasTotal(totalExpensas)

        // Próximas reservas
        const { data: proxReservas } = await supabase
          .from('reservas')
          .select('*, propiedades(nombre), inquilinos(nombre)')
          .gte('fecha_inicio', hoy)
          .in('estado', ['confirmada', 'pendiente'])
          .order('fecha_inicio', { ascending: true })
          .limit(5)
        setProximasReservas(proxReservas || [])

        // Lista de gastos pendientes
        const { data: gastosList } = await supabase
          .from('gastos')
          .select('*, propiedades(nombre)')
          .eq('estado', 'pendiente')
          .order('vencimiento', { ascending: true })
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
                        {reserva.inquilinos?.nombre || '-'} • {formatFecha(reserva.check_in || reserva.fecha_inicio)} - {formatFecha(reserva.check_out || reserva.fecha_fin)}
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
