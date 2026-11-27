import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, adminDelPedido } from '@/lib/adminServidor'

// Borra un usuario. Solo el administrador, verificado por su sesión.
export async function POST(request: NextRequest) {
  try {
    const sb = getSupabaseAdmin()
    const adminId = await adminDelPedido(request, sb)
    if (!adminId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Falta el usuario' }, { status: 400 })
    if (userId === adminId) return NextResponse.json({ error: 'No podés borrar tu propia cuenta' }, { status: 400 })

    const { count } = await sb.from('propiedades').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    if (count) return NextResponse.json({ error: 'Tiene casas cargadas: desactivalo en vez de borrarlo' }, { status: 400 })

    await sb.from('profiles').delete().eq('id', userId)
    const { error } = await sb.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: 'No se pudo borrar: ' + error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en delete-user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
