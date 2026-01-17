'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { ArrowLeft, Calendar, User, Home, DollarSign, Clock, FileText, Wallet, Users, Phone, Mail, MapPin } from 'lucide-react'
import { CobrosContent } from '@/components/CobrosContent'

interface Propiedad {
  id: string
  nombre: string
  direccion: string | null
  lote: string | null
}

interface Inquilino {
  id: string
  nombre: string
  documento: string
  telefono: string
  email: string
  domicilio: string | null
}

interface Acompanante {
  nombre: string
  apellido: string
  documento: string
  edad: number | string
}

interface Reserva {
  id: string
  propiedad_id: string
  inquilino_id: string | null
  fecha_inicio: string
  fecha_fin: string
  horario_ingreso: string
  horario_salida: string
  cantidad_personas: number
  precio_noche: number
  monto_usd: number
  moneda: string
  deposito: number
  deposito_pesos: number
  sena: number
  forma_pago: string
  ropa_blanca: boolean
  limpieza_final: number
  monto_lavadero: number
  kw_inicial: number
  estado: string
  notas: string
  acompanantes: Acompanante[]
  propiedades?: Propiedad
  inquilinos?: Inquilino
}

type TabType = 'detalle' | 'cobros'

function ReservaDetalleContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reservaId = params.id as string
  const { userId } = useAuth()

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('detalle')

  useEffect(() => {
    if (userId && reservaId) {
      fetchReserva()
    }
  }, [userId, reservaId])

  async function fetchReserva() {
    const { data, error } = await supabase
      .from('reservas')
      .select(`
        *,
        propiedades (id, nombre, direccion, lote),
        inquilinos (id, nombre, documento, telefono, email, domicilio)
      `)
      .eq('id', reservaId)
      .single()

    if (data) {
      setReserva(data as Reserva)
    }
    setLoading(false)
  }

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'success'
      case 'pendiente': return 'warning'
      case 'cancelada': return 'danger'
      default: return 'default'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const calcularNoches = () => {
    if (!reserva) return 0
    const inicio = new Date(reserva.fecha_inicio)
    const fin = new Date(reserva.fecha_fin)
    return Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-costa-gris">Cargando...</div>
      </div>
    )
  }

  if (!reserva) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/reservas">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-costa-navy">Reserva no encontrada</h1>
        </div>
      </div>
    )
  }

  const noches = calcularNoches()
  const totalEstimado = noches * (reserva.precio_noche || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/reservas">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-costa-navy">
              Reserva #{String(reserva.id).slice(-6).toUpperCase()}
            </h1>
            <p className="text-sm text-costa-gris">
              {reserva.propiedades?.nombre} {reserva.propiedades?.lote ? `- Lote ${reserva.propiedades.lote}` : ''}
            </p>
          </div>
        </div>
        <Badge variant={getColorEstado(reserva.estado) as any}>
          {reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-costa-beige">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('detalle')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'detalle'
                ? 'bg-costa-navy text-white'
                : 'text-costa-gris hover:text-costa-navy hover:bg-costa-beige/50'
            }`}
          >
            <FileText size={16} />
            Detalle
          </button>
          <button
            onClick={() => setActiveTab('cobros')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'cobros'
                ? 'bg-costa-navy text-white'
                : 'text-costa-gris hover:text-costa-navy hover:bg-costa-beige/50'
            }`}
          >
            <Wallet size={16} />
            Gestión de Cobros
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'detalle' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fechas y Propiedad */}
            <Card>
              <CardContent className="py-4 space-y-4">
                <h3 className="font-semibold text-costa-navy flex items-center gap-2">
                  <Calendar size={18} className="text-costa-coral" />
                  Fechas y Alojamiento
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-costa-gris">Check-in</p>
                    <p className="font-medium text-costa-navy">{formatDate(reserva.fecha_inicio)}</p>
                    {reserva.horario_ingreso && (
                      <p className="text-sm text-costa-gris flex items-center gap-1">
                        <Clock size={12} /> {reserva.horario_ingreso}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-costa-gris">Check-out</p>
                    <p className="font-medium text-costa-navy">{formatDate(reserva.fecha_fin)}</p>
                    {reserva.horario_salida && (
                      <p className="text-sm text-costa-gris flex items-center gap-1">
                        <Clock size={12} /> {reserva.horario_salida}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-costa-beige">
                  <div className="flex items-center gap-2">
                    <Home size={16} className="text-costa-gris" />
                    <span className="font-medium">{reserva.propiedades?.nombre}</span>
                  </div>
                  {reserva.propiedades?.lote && (
                    <p className="text-sm text-costa-gris ml-6">Lote {reserva.propiedades.lote}</p>
                  )}
                  {reserva.propiedades?.direccion && (
                    <p className="text-sm text-costa-gris ml-6">{reserva.propiedades.direccion}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-costa-beige">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-costa-gris" />
                    <span>{reserva.cantidad_personas} personas</span>
                  </div>
                  <div className="text-costa-navy font-semibold">
                    {noches} noches
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inquilino */}
            <Card>
              <CardContent className="py-4 space-y-4">
                <h3 className="font-semibold text-costa-navy flex items-center gap-2">
                  <User size={18} className="text-costa-coral" />
                  Inquilino
                </h3>

                {reserva.inquilinos ? (
                  <div className="space-y-3">
                    <p className="font-medium text-lg text-costa-navy">{reserva.inquilinos.nombre}</p>

                    {reserva.inquilinos.documento && (
                      <p className="text-sm text-costa-gris">
                        DNI: {reserva.inquilinos.documento}
                      </p>
                    )}

                    <div className="space-y-2 pt-2">
                      {reserva.inquilinos.telefono && (
                        <a
                          href={`tel:${reserva.inquilinos.telefono}`}
                          className="flex items-center gap-2 text-sm text-costa-navy hover:text-costa-coral transition-colors"
                        >
                          <Phone size={14} />
                          {reserva.inquilinos.telefono}
                        </a>
                      )}
                      {reserva.inquilinos.email && (
                        <a
                          href={`mailto:${reserva.inquilinos.email}`}
                          className="flex items-center gap-2 text-sm text-costa-navy hover:text-costa-coral transition-colors"
                        >
                          <Mail size={14} />
                          {reserva.inquilinos.email}
                        </a>
                      )}
                      {reserva.inquilinos.domicilio && (
                        <p className="flex items-center gap-2 text-sm text-costa-gris">
                          <MapPin size={14} />
                          {reserva.inquilinos.domicilio}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-costa-gris">Sin inquilino asignado</p>
                )}

                {/* Acompanantes */}
                {reserva.acompanantes && reserva.acompanantes.length > 0 && (
                  <div className="pt-3 border-t border-costa-beige">
                    <p className="text-xs text-costa-gris mb-2">Acompanantes ({reserva.acompanantes.length})</p>
                    <div className="space-y-1">
                      {reserva.acompanantes.map((a, i) => (
                        <p key={i} className="text-sm">
                          {a.nombre} {a.apellido}
                          {a.documento && <span className="text-costa-gris"> - DNI: {a.documento}</span>}
                          {a.edad && <span className="text-costa-gris"> ({a.edad} años)</span>}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Montos */}
            <Card>
              <CardContent className="py-4 space-y-4">
                <h3 className="font-semibold text-costa-navy flex items-center gap-2">
                  <DollarSign size={18} className="text-costa-coral" />
                  Montos
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-costa-gris">Precio por noche</span>
                    <span className="font-medium">{reserva.moneda} {reserva.precio_noche?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-costa-gris">Noches</span>
                    <span className="font-medium">{noches}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-costa-beige">
                    <span className="text-costa-gris">Subtotal alojamiento</span>
                    <span className="font-medium">{reserva.moneda} {totalEstimado.toLocaleString()}</span>
                  </div>

                  {reserva.deposito > 0 && (
                    <div className="flex justify-between">
                      <span className="text-costa-gris">Depósito (USD)</span>
                      <span className="font-medium">USD {reserva.deposito?.toLocaleString()}</span>
                    </div>
                  )}
                  {reserva.deposito_pesos > 0 && (
                    <div className="flex justify-between">
                      <span className="text-costa-gris">Depósito (ARS)</span>
                      <span className="font-medium">ARS {reserva.deposito_pesos?.toLocaleString()}</span>
                    </div>
                  )}
                  {reserva.sena > 0 && (
                    <div className="flex justify-between">
                      <span className="text-costa-gris">Seña</span>
                      <span className="font-medium">{reserva.moneda} {reserva.sena?.toLocaleString()}</span>
                    </div>
                  )}
                  {reserva.limpieza_final > 0 && (
                    <div className="flex justify-between">
                      <span className="text-costa-gris">Limpieza final</span>
                      <span className="font-medium">ARS {reserva.limpieza_final?.toLocaleString()}</span>
                    </div>
                  )}
                  {reserva.monto_lavadero > 0 && (
                    <div className="flex justify-between">
                      <span className="text-costa-gris">Lavadero</span>
                      <span className="font-medium">ARS {reserva.monto_lavadero?.toLocaleString()}</span>
                    </div>
                  )}

                  {reserva.monto_usd > 0 && (
                    <div className="flex justify-between pt-2 border-t border-costa-beige font-semibold text-costa-navy">
                      <span>Total USD</span>
                      <span>USD {reserva.monto_usd?.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-costa-beige">
                  <p className="text-xs text-costa-gris">Forma de pago</p>
                  <p className="font-medium capitalize">{reserva.forma_pago || 'No especificada'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Extras y Notas */}
            <Card>
              <CardContent className="py-4 space-y-4">
                <h3 className="font-semibold text-costa-navy flex items-center gap-2">
                  <FileText size={18} className="text-costa-coral" />
                  Extras y Notas
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-costa-gris">Ropa blanca:</span>
                    <Badge variant={reserva.ropa_blanca ? 'success' : 'default'}>
                      {reserva.ropa_blanca ? 'Incluida' : 'No incluida'}
                    </Badge>
                  </div>

                  {reserva.kw_inicial > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-costa-gris">KW inicial:</span>
                      <span className="font-medium">{reserva.kw_inicial}</span>
                    </div>
                  )}

                  {reserva.notas && (
                    <div className="pt-3 border-t border-costa-beige">
                      <p className="text-xs text-costa-gris mb-1">Notas</p>
                      <p className="text-sm whitespace-pre-wrap">{reserva.notas}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/reservas">
                  <Button variant="secondary">
                    <ArrowLeft size={14} />
                    Volver a Reservas
                  </Button>
                </Link>
                <Button onClick={() => setActiveTab('cobros')}>
                  <Wallet size={14} />
                  Gestionar Cobros
                </Button>
                <Link href="/admin/calendario">
                  <Button variant="ghost">
                    <Calendar size={14} />
                    Ver Calendario
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <CobrosContent reservaId={reservaId} showNavigation={false} showHeader={true} />
      )}
    </div>
  )
}

export default function ReservaDetallePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <ReservaDetalleContent />
    </Suspense>
  )
}
