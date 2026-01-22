'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { Users, Shield, ShieldOff, UserCheck, UserX, Mail, Calendar, MapPin, Home, Clock, CheckCircle, Trash2 } from 'lucide-react'

interface Profile {
  id: string
  email: string
  nombre: string
  telefono: string
  barrio: string
  lote: string
  is_admin: boolean
  activo: boolean
  autorizado: boolean
  created_at: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  async function checkAdminAndFetch() {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

    // Verificar si es admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setIsAdmin(true)

    // Obtener todos los usuarios
    const { data: usuarios } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (usuarios) setUsuarios(usuarios)
    setLoading(false)
  }

  async function toggleActivo(userId: string, activo: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ activo: !activo })
      .eq('id', userId)

    if (error) {
      alert('Error al cambiar estado: ' + error.message)
    } else {
      setUsuarios(usuarios.map(u =>
        u.id === userId ? { ...u, activo: !activo } : u
      ))
    }
  }

  async function rechazarUsuario(userId: string, nombre: string) {
    if (!confirm(`¿Estás seguro de rechazar y eliminar a "${nombre}"?\n\nEsto eliminará su solicitud permanentemente.`)) return

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, adminId: currentUserId })
      })

      const data = await response.json()

      if (!response.ok) {
        alert('Error al eliminar: ' + (data.error || 'Error desconocido'))
      } else {
        setUsuarios(usuarios.filter(u => u.id !== userId))
      }
    } catch (error) {
      alert('Error al eliminar usuario')
      console.error(error)
    }
  }

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !isAdmin })
      .eq('id', userId)

    if (!error) {
      setUsuarios(usuarios.map(u =>
        u.id === userId ? { ...u, is_admin: !isAdmin } : u
      ))
    }
  }

  async function toggleAutorizado(userId: string, autorizado: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ autorizado: !autorizado })
      .eq('id', userId)

    if (!error) {
      setUsuarios(usuarios.map(u =>
        u.id === userId ? { ...u, autorizado: !autorizado } : u
      ))
    }
  }

  // Separar usuarios pendientes de autorizados
  const usuariosPendientes = usuarios.filter(u => u.autorizado === false)
  const usuariosAutorizados = usuarios.filter(u => u.autorizado !== false)

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldOff size={48} className="mx-auto text-costa-coral mb-4" />
            <h2 className="text-xl font-bold text-costa-navy mb-2">Acceso Restringido</h2>
            <p className="text-costa-gris">No tenés permisos para ver esta sección.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        description="Administrá los usuarios registrados en la plataforma"
      >
        <div className="flex items-center gap-4 text-sm">
          {usuariosPendientes.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Clock size={16} />
              {usuariosPendientes.length} pendiente{usuariosPendientes.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1 text-costa-gris">
            <Users size={16} />
            {usuarios.length} total
          </span>
        </div>
      </PageHeader>

      {/* Solicitudes pendientes */}
      {usuariosPendientes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-amber-600 mb-4 flex items-center gap-2">
            <Clock size={20} />
            Solicitudes Pendientes de Autorización
          </h2>
          <div className="grid gap-4">
            {usuariosPendientes.map((usuario) => (
              <Card key={usuario.id} className="border-amber-200 bg-amber-50/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                        <Clock size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-costa-navy">
                            {usuario.nombre || 'Sin nombre'}
                          </h3>
                          <Badge variant="warning">Pendiente</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-costa-gris mt-1">
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {usuario.email}
                          </span>
                          {usuario.barrio && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {usuario.barrio}
                            </span>
                          )}
                          {usuario.lote && (
                            <span className="flex items-center gap-1">
                              <Home size={14} />
                              Lote {usuario.lote}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-costa-gris mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatFecha(usuario.created_at)}
                          </span>
                          {usuario.telefono && (
                            <span>Tel: {usuario.telefono}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => toggleAutorizado(usuario.id, false)}
                        className="bg-costa-olivo hover:bg-costa-olivo/90"
                      >
                        <CheckCircle size={16} />
                        Autorizar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => rechazarUsuario(usuario.id, usuario.nombre || usuario.email)}
                        title="Rechazar y eliminar solicitud"
                      >
                        <UserX size={16} />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Usuarios autorizados */}
      <div>
        <h2 className="text-lg font-bold text-costa-navy mb-4 flex items-center gap-2">
          <Users size={20} />
          Usuarios Autorizados
        </h2>
        <div className="grid gap-4">
          {usuariosAutorizados.map((usuario) => (
            <Card key={usuario.id} className={!usuario.activo ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${usuario.is_admin ? 'bg-costa-navy text-white' : 'bg-costa-beige text-costa-navy'}`}>
                      {usuario.is_admin ? <Shield size={24} /> : <Users size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-costa-navy">
                          {usuario.nombre || 'Sin nombre'}
                        </h3>
                        {usuario.is_admin && (
                          <Badge variant="info">Admin</Badge>
                        )}
                        {!usuario.activo && (
                          <Badge variant="danger">Inactivo</Badge>
                        )}
                        {usuario.id === currentUserId && (
                          <Badge variant="success">Tú</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-costa-gris mt-1">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {usuario.email}
                        </span>
                        {usuario.barrio && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {usuario.barrio}
                          </span>
                        )}
                        {usuario.lote && (
                          <span className="flex items-center gap-1">
                            <Home size={14} />
                            Lote {usuario.lote}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatFecha(usuario.created_at)}
                        </span>
                      </div>
                      {usuario.telefono && (
                        <p className="text-sm text-costa-gris mt-1">Tel: {usuario.telefono}</p>
                      )}
                    </div>
                  </div>

                  {usuario.id !== currentUserId && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={usuario.activo ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => toggleActivo(usuario.id, usuario.activo)}
                        title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {usuario.activo ? (
                          <>
                            <UserX size={16} />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck size={16} />
                            Activar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAdmin(usuario.id, usuario.is_admin)}
                        title={usuario.is_admin ? 'Quitar admin' : 'Hacer admin'}
                      >
                        {usuario.is_admin ? (
                          <ShieldOff size={16} className="text-costa-coral" />
                        ) : (
                          <Shield size={16} className="text-costa-navy" />
                        )}
                      </Button>
                      {!usuario.activo && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => rechazarUsuario(usuario.id, usuario.nombre || usuario.email)}
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
