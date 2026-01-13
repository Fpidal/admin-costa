'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { Users, Shield, ShieldOff, UserCheck, UserX, Mail, Calendar } from 'lucide-react'

interface Profile {
  id: string
  email: string
  nombre: string
  telefono: string
  is_admin: boolean
  activo: boolean
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

    if (!error) {
      setUsuarios(usuarios.map(u =>
        u.id === userId ? { ...u, activo: !activo } : u
      ))
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
        <div className="flex items-center gap-2 text-sm text-costa-gris">
          <Users size={16} />
          <span>{usuarios.length} usuarios registrados</span>
        </div>
      </PageHeader>

      <div className="grid gap-4">
        {usuarios.map((usuario) => (
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
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
