'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { demoPropiedades, demoReservas } from '@/lib/demoData'

interface Propiedad {
  id: string
  nombre: string
  lote: string | null
  direccion: string | null
}

interface Reserva {
  id: string
  propiedad_id: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  inquilinos?: { nombre: string }
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function CalendarioPage() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { userId } = useAuth()

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState(new Date().getMonth())
  const [anioActual, setAnioActual] = useState(new Date().getFullYear())

  useEffect(() => {
    if (isDemo) {
      setPropiedades(demoPropiedades.map(p => ({
        id: p.id,
        nombre: p.nombre,
        lote: null,
        direccion: null,
      })))
      setReservas(demoReservas
        .filter(r => r.estado === 'confirmada' || r.estado === 'pendiente')
        .map(r => ({
          id: r.id,
          propiedad_id: r.propiedad_id,
          fecha_inicio: r.fecha_inicio,
          fecha_fin: r.fecha_fin,
          estado: r.estado,
          inquilinos: r.inquilinos ? { nombre: (r.inquilinos as any).nombre } : undefined
        })))
      setLoading(false)
      return
    }

    if (userId) {
      fetchData()
    }
  }, [userId, isDemo])

  async function fetchData() {
    const [resProp, resReservas] = await Promise.all([
      supabase
        .from('propiedades')
        .select('id, nombre, lote, direccion')
        .eq('user_id', userId)
        .order('nombre'),
      supabase
        .from('reservas')
        .select('id, propiedad_id, fecha_inicio, fecha_fin, estado, inquilinos(nombre)')
        .eq('user_id', userId)
        .in('estado', ['confirmada', 'pendiente'])
        .order('fecha_inicio')
    ])

    if (resProp.data) setPropiedades(resProp.data)
    if (resReservas.data) {
      setReservas(resReservas.data.map((r: any) => ({
        id: r.id,
        propiedad_id: r.propiedad_id,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        estado: r.estado,
        inquilinos: r.inquilinos ? { nombre: r.inquilinos.nombre } : undefined
      })))
    }
    setLoading(false)
  }

  // Generar días del mes
  const getDiasMes = () => {
    const primerDia = new Date(anioActual, mesActual, 1)
    const ultimoDia = new Date(anioActual, mesActual + 1, 0)
    const diasEnMes = ultimoDia.getDate()
    const primerDiaSemana = primerDia.getDay()

    const dias: (number | null)[] = []
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push(null)
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(dia)
    }
    return dias
  }

  // Obtener reservas de una propiedad para una fecha
  const getReservaFecha = (propiedadId: string, dia: number): Reserva | null => {
    const fecha = new Date(anioActual, mesActual, dia)
    const fechaStr = fecha.toISOString().split('T')[0]

    return reservas.find(r =>
      r.propiedad_id === propiedadId &&
      fechaStr >= r.fecha_inicio &&
      fechaStr <= r.fecha_fin
    ) || null
  }

  // Navegar mes anterior
  const mesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11)
      setAnioActual(anioActual - 1)
    } else {
      setMesActual(mesActual - 1)
    }
  }

  // Navegar mes siguiente
  const mesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0)
      setAnioActual(anioActual + 1)
    } else {
      setMesActual(mesActual + 1)
    }
  }

  // Color según estado
  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'bg-costa-olivo text-white'
      case 'pendiente': return 'bg-costa-coral text-white'
      default: return 'bg-costa-navy text-white'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-costa-gris">Cargando...</div>
      </div>
    )
  }

  const diasMes = getDiasMes()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario de Reservas"
        description="Visualizá las reservas de todas tus propiedades"
      />

      {/* Navegación del mes */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={mesAnterior}
              className="p-2 hover:bg-costa-beige rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-costa-navy">
              {MESES[mesActual]} {anioActual}
            </h2>
            <button
              onClick={mesSiguiente}
              className="p-2 hover:bg-costa-beige rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-costa-olivo"></span>
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-costa-coral"></span>
              <span>Pendiente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {propiedades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Home size={48} className="mx-auto text-costa-gris mb-4" />
            <p className="text-costa-gris">No tenés propiedades cargadas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {propiedades.map((propiedad) => {
            const reservasPropiedad = reservas.filter(r => r.propiedad_id === propiedad.id)

            return (
              <Card key={propiedad.id}>
                <CardContent className="py-4">
                  {/* Nombre de la propiedad */}
                  <h3 className="font-semibold text-costa-navy mb-4">
                    {propiedad.nombre}
                    {propiedad.lote && ` - Lote ${propiedad.lote}`}
                    {propiedad.direccion && <span className="text-sm font-normal text-costa-gris ml-2">({propiedad.direccion})</span>}
                  </h3>

                  {/* Calendario */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[320px]">
                      {/* Encabezado días */}
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {DIAS_SEMANA.map((dia, i) => (
                          <div key={i} className="text-center text-xs font-medium text-costa-gris py-1">
                            {dia}
                          </div>
                        ))}
                      </div>

                      {/* Días del mes */}
                      <div className="grid grid-cols-7 gap-1">
                        {diasMes.map((dia, i) => {
                          if (!dia) {
                            return <div key={i} className="h-10"></div>
                          }

                          const reserva = getReservaFecha(propiedad.id, dia)
                          const hoy = new Date()
                          const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()

                          return (
                            <div
                              key={i}
                              className={`
                                h-10 rounded border text-xs flex flex-col items-center justify-center
                                ${esHoy ? 'border-costa-coral border-2' : 'border-gray-200'}
                                ${reserva ? getColorEstado(reserva.estado) : 'bg-white'}
                              `}
                              title={reserva ? `${reserva.inquilinos?.nombre || 'Reserva'} - ${reserva.estado}` : ''}
                            >
                              <span className={`font-medium ${reserva ? '' : 'text-costa-navy'}`}>{dia}</span>
                              {reserva && (
                                <span className="text-[8px] truncate w-full text-center px-0.5 leading-none">
                                  {reserva.inquilinos?.nombre?.split(' ')[0] || 'Res.'}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Lista de reservas del mes */}
                  {reservasPropiedad.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-costa-beige">
                      <p className="text-xs font-medium text-costa-gris mb-2">Reservas:</p>
                      <div className="flex flex-wrap gap-2">
                        {reservasPropiedad
                          .filter(r => {
                            const inicio = new Date(r.fecha_inicio)
                            const fin = new Date(r.fecha_fin)
                            const inicioMes = new Date(anioActual, mesActual, 1)
                            const finMes = new Date(anioActual, mesActual + 1, 0)
                            return inicio <= finMes && fin >= inicioMes
                          })
                          .map(r => (
                            <div
                              key={r.id}
                              className={`px-2 py-1 rounded text-xs ${getColorEstado(r.estado)}`}
                            >
                              {r.inquilinos?.nombre || 'Sin nombre'}: {new Date(r.fecha_inicio).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} - {new Date(r.fecha_fin).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
