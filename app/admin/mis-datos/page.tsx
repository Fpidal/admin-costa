'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, Button, Input } from '@/components/ui'
import { Check, FileSignature } from 'lucide-react'
import { DATOS_LOCADOR_DEMO, DATOS_LOCADOR_VACIOS, camposFaltantes, type DatosLocador } from '@/lib/datosLocador'

function MisDatosContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const { user, userId } = useAuth()

  const [datos, setDatos] = useState<DatosLocador>(isDemo ? DATOS_LOCADOR_DEMO : DATOS_LOCADOR_VACIOS)
  const [loading, setLoading] = useState(!isDemo)
  const [saving, setSaving] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (isDemo || !userId) return
    const cargar = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('nombre, dni, domicilio, telefono')
        .eq('id', userId)
        .single()
      if (data) {
        setDatos({
          nombre: data.nombre || '',
          dni: data.dni || '',
          domicilio: data.domicilio || '',
          telefono: data.telefono || '',
        })
      }
      setLoading(false)
    }
    cargar()
  }, [isDemo, userId])

  const cambiar = (campo: keyof DatosLocador, valor: string) => {
    setDatos({ ...datos, [campo]: valor })
    setGuardado(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isDemo) {
      alert('En la demo no se pueden guardar datos')
      return
    }
    if (!userId) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: datos.nombre.trim(),
        dni: datos.dni.trim() || null,
        domicilio: datos.domicilio.trim() || null,
        telefono: datos.telefono.trim() || null,
      })
      .eq('id', userId)
    setSaving(false)
    if (error) alert('Error al guardar: ' + error.message)
    else setGuardado(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>
  }

  const faltan = camposFaltantes(datos)

  return (
    <div className="max-w-xl">
      <PageHeader title="Mis datos" description="Son los datos del locador que salen en los contratos y en los PDF de reserva" />

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre y apellido"
              value={datos.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              placeholder="Como figura en el DNI"
            />
            <Input
              label="DNI"
              value={datos.dni}
              onChange={(e) => cambiar('dni', e.target.value)}
              placeholder="Ej: 25.021.513"
            />
            <Input
              label="Domicilio"
              value={datos.domicilio}
              onChange={(e) => cambiar('domicilio', e.target.value)}
              placeholder="Calle, número y localidad"
            />
            <Input
              label="Teléfono"
              value={datos.telefono}
              onChange={(e) => cambiar('telefono', e.target.value)}
              placeholder="Ej: 11 6879 2207"
            />
            {user?.email && !isDemo && (
              <Input label="Email" value={user.email} disabled />
            )}

            {faltan.length > 0 ? (
              <p className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                <FileSignature size={14} className="shrink-0 mt-0.5" />
                Para generar contratos falta completar: {faltan.join(', ')}.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-xs text-costa-olivo">
                <FileSignature size={14} />
                Datos completos para generar contratos.
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              {guardado && (
                <span className="flex items-center gap-1 text-sm text-costa-olivo"><Check size={14} /> Guardado</span>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MisDatosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <MisDatosContent />
    </Suspense>
  )
}
