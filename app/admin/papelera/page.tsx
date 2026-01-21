'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, Button } from '@/components/ui'
import { Trash2, RotateCcw, AlertTriangle, CalendarDays, Users, Home } from 'lucide-react'

interface ReservaEliminada {
  id: number
  fecha_inicio: string
  fecha_fin: string
  eliminado_at: string
  propiedades?: { nombre: string }
  inquilinos?: { nombre: string }
}

interface InquilinoEliminado {
  id: number
  nombre: string
  documento: string
  telefono: string
  email: string
  eliminado_at: string
}

interface PropiedadEliminada {
  id: string
  nombre: string
  direccion: string
  lote: string
  eliminado_at: string
}

export default function PapeleraPage() {
  const { userId } = useAuth()
  const [activeTab, setActiveTab] = useState<'reservas' | 'inquilinos' | 'propiedades'>('reservas')
  const [reservas, setReservas] = useState<ReservaEliminada[]>([])
  const [inquilinos, setInquilinos] = useState<InquilinoEliminado[]>([])
  const [propiedades, setPropiedades] = useState<PropiedadEliminada[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) fetchData()
  }, [userId])

  async function fetchData() {
    setLoading(true)
    const [resReservas, resInquilinos, resPropiedades] = await Promise.all([
      supabase
        .from('reservas')
        .select('id, fecha_inicio, fecha_fin, eliminado_at, propiedades(nombre), inquilinos(nombre)')
        .eq('user_id', userId)
        .not('eliminado_at', 'is', null)
        .order('eliminado_at', { ascending: false }),
      supabase
        .from('inquilinos')
        .select('id, nombre, documento, telefono, email, eliminado_at')
        .eq('user_id', userId)
        .not('eliminado_at', 'is', null)
        .order('eliminado_at', { ascending: false }),
      supabase
        .from('propiedades')
        .select('id, nombre, direccion, lote, eliminado_at')
        .eq('user_id', userId)
        .not('eliminado_at', 'is', null)
        .order('eliminado_at', { ascending: false }),
    ])

    if (resReservas.data) {
      setReservas(resReservas.data.map((r: any) => ({
        id: r.id,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        eliminado_at: r.eliminado_at,
        propiedades: r.propiedades ? { nombre: r.propiedades.nombre } : undefined,
        inquilinos: r.inquilinos ? { nombre: r.inquilinos.nombre } : undefined,
      })))
    }
    if (resInquilinos.data) setInquilinos(resInquilinos.data as InquilinoEliminado[])
    if (resPropiedades.data) setPropiedades(resPropiedades.data as PropiedadEliminada[])
    setLoading(false)
  }

  // Restaurar elemento
  async function handleRestore(tipo: 'reservas' | 'inquilinos' | 'propiedades', id: number | string) {
    const { error } = await supabase
      .from(tipo)
      .update({ eliminado_at: null })
      .eq('id', id)

    if (error) {
      alert('Error al restaurar: ' + error.message)
    } else {
      fetchData()
    }
  }

  // Eliminar permanentemente
  async function handleDeletePermanent(tipo: 'reservas' | 'inquilinos' | 'propiedades', id: number | string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar PERMANENTEMENTE "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return

    const { error } = await supabase
      .from(tipo)
      .delete()
      .eq('id', id)

    if (error) {
      if (error.message.includes('foreign key constraint')) {
        alert('No se puede eliminar porque tiene datos relacionados. Eliminá primero los datos asociados.')
      } else {
        alert('Error al eliminar: ' + error.message)
      }
    } else {
      fetchData()
    }
  }

  // Vaciar papelera de un tipo
  async function handleVaciarPapelera(tipo: 'reservas' | 'inquilinos' | 'propiedades') {
    const items = tipo === 'reservas' ? reservas : tipo === 'inquilinos' ? inquilinos : propiedades
    if (items.length === 0) return

    if (!confirm(`¿Estás seguro de vaciar la papelera de ${tipo}?\n\nSe eliminarán ${items.length} elementos PERMANENTEMENTE.`)) return

    const ids = items.map(i => i.id)
    const { error } = await supabase
      .from(tipo)
      .delete()
      .in('id', ids)

    if (error) {
      alert('Error al vaciar papelera: ' + error.message)
    } else {
      fetchData()
    }
  }

  const formatFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-AR')
  const formatFechaHora = (fecha: string) => new Date(fecha).toLocaleString('es-AR')

  const totalItems = reservas.length + inquilinos.length + propiedades.length

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Papelera"
        description="Elementos eliminados que podés restaurar o eliminar permanentemente"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('reservas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'reservas'
              ? 'border-costa-navy text-costa-navy'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays size={16} />
          Reservas ({reservas.length})
        </button>
        <button
          onClick={() => setActiveTab('inquilinos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'inquilinos'
              ? 'border-costa-navy text-costa-navy'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} />
          Inquilinos ({inquilinos.length})
        </button>
        <button
          onClick={() => setActiveTab('propiedades')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'propiedades'
              ? 'border-costa-navy text-costa-navy'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Home size={16} />
          Propiedades ({propiedades.length})
        </button>
      </div>

      {totalItems === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trash2 size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">La papelera está vacía</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Reservas */}
          {activeTab === 'reservas' && (
            <Card>
              <CardContent className="py-4">
                {reservas.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay reservas eliminadas</p>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button variant="ghost" size="sm" onClick={() => handleVaciarPapelera('reservas')} className="text-red-600 border-red-300 hover:bg-red-50">
                        <Trash2 size={14} className="mr-1" />
                        Vaciar papelera
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {reservas.map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-costa-navy">
                              {r.propiedades?.nombre || 'Propiedad eliminada'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {r.inquilinos?.nombre || 'Sin inquilino'} · {formatFecha(r.fecha_inicio)} al {formatFecha(r.fecha_fin)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Eliminado: {formatFechaHora(r.eliminado_at)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleRestore('reservas', r.id)} className="text-green-600 border-green-300 hover:bg-green-50">
                              <RotateCcw size={14} className="mr-1" />
                              Restaurar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePermanent('reservas', r.id, `Reserva ${r.propiedades?.nombre}`)} className="text-red-600 border-red-300 hover:bg-red-50">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Inquilinos */}
          {activeTab === 'inquilinos' && (
            <Card>
              <CardContent className="py-4">
                {inquilinos.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay inquilinos eliminados</p>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button variant="ghost" size="sm" onClick={() => handleVaciarPapelera('inquilinos')} className="text-red-600 border-red-300 hover:bg-red-50">
                        <Trash2 size={14} className="mr-1" />
                        Vaciar papelera
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {inquilinos.map((i) => (
                        <div key={i.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-costa-navy">{i.nombre}</p>
                            <p className="text-sm text-gray-600">
                              {i.documento && `DNI: ${i.documento}`} {i.telefono && `· ${i.telefono}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              Eliminado: {formatFechaHora(i.eliminado_at)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleRestore('inquilinos', i.id)} className="text-green-600 border-green-300 hover:bg-green-50">
                              <RotateCcw size={14} className="mr-1" />
                              Restaurar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePermanent('inquilinos', i.id, i.nombre)} className="text-red-600 border-red-300 hover:bg-red-50">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Propiedades */}
          {activeTab === 'propiedades' && (
            <Card>
              <CardContent className="py-4">
                {propiedades.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No hay propiedades eliminadas</p>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button variant="ghost" size="sm" onClick={() => handleVaciarPapelera('propiedades')} className="text-red-600 border-red-300 hover:bg-red-50">
                        <Trash2 size={14} className="mr-1" />
                        Vaciar papelera
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {propiedades.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-costa-navy">{p.nombre}</p>
                            <p className="text-sm text-gray-600">
                              {p.lote && `Lote ${p.lote}`} {p.direccion && `· ${p.direccion}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              Eliminado: {formatFechaHora(p.eliminado_at)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleRestore('propiedades', p.id)} className="text-green-600 border-green-300 hover:bg-green-50">
                              <RotateCcw size={14} className="mr-1" />
                              Restaurar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePermanent('propiedades', p.id, p.nombre)} className="text-red-600 border-red-300 hover:bg-red-50">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Los elementos permanecen en la papelera hasta que los elimines manualmente.</p>
          <p className="mt-1">Al restaurar, el elemento vuelve a aparecer en su sección original.</p>
        </div>
      </div>
    </div>
  )
}
