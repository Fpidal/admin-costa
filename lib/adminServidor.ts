// Solo para rutas del servidor (app/api/admin): cliente con la clave de servicio
// y verificación de que quien llama es el administrador, a partir de su sesión
// (el token que manda el navegador), nunca de un id que venga en el pedido.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dpghrdgippisgzvlahwi.supabase.co'

export function getSupabaseAdmin(): SupabaseClient {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!clave) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  return createClient(URL_SUPABASE, clave, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Devuelve el id del admin que hace el pedido, o null si no es admin activo. */
export async function adminDelPedido(req: NextRequest, sb: SupabaseClient): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  const { data: perfil } = await sb.from('profiles').select('is_admin, activo').eq('id', user.id).single()
  return perfil?.is_admin && perfil.activo !== false ? user.id : null
}
