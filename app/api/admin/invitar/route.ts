import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, adminDelPedido } from '@/lib/adminServidor'
import { PERMISOS } from '@/lib/permisos'

// Invita a un usuario nuevo (le llega un mail para crear su contraseña) con las
// secciones que tildó el admin. Con "soloLink" no manda mail: devuelve el link
// para pasárselo por WhatsApp (sirve también para reenviar la invitación).
export async function POST(request: NextRequest) {
  try {
    const sb = getSupabaseAdmin()
    const adminId = await adminDelPedido(request, sb)
    if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const nombre = String(body.nombre || '').trim()
    const validos = new Set(PERMISOS.map(p => p.clave))
    const permisos = (Array.isArray(body.permisos) ? body.permisos : []).filter((p: string) => validos.has(p as never))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })

    const redirectTo = `${request.nextUrl.origin}/admin?bienvenida=1`
    let userId: string | undefined
    let link: string | undefined

    if (body.soloLink) {
      // Link de invitación (o de ingreso, si ya existe) sin mandar mail
      let r = await sb.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo, data: { nombre } } })
      if (r.error) r = await sb.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 400 })
      userId = r.data.user?.id
      link = r.data.properties?.action_link
    } else {
      const { data, error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo, data: { nombre } })
      if (error) {
        const yaExiste = /already|registered|exists/i.test(error.message)
        return NextResponse.json({ error: yaExiste ? 'Ese email ya tiene cuenta' : 'No se pudo mandar el mail: ' + error.message }, { status: 400 })
      }
      userId = data.user?.id
    }
    if (!userId) return NextResponse.json({ error: 'No se pudo crear el usuario' }, { status: 500 })

    // Perfil habilitado con las secciones elegidas (al reenviar no se tocan los permisos)
    const cambios: Record<string, unknown> = { id: userId, email, autorizado: true, activo: true }
    if (nombre) cambios.nombre = nombre
    if (!body.reenviar) cambios.permisos = permisos
    const { error: errPerfil } = await sb.from('profiles').upsert(cambios)
    if (errPerfil) return NextResponse.json({ error: 'Usuario creado, pero falló el perfil: ' + errPerfil.message }, { status: 500 })

    return NextResponse.json({ ok: true, userId, link })
  } catch (error) {
    console.error('Error en invitar:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
