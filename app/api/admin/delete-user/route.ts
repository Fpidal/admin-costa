import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Cliente admin de Supabase (solo para uso en servidor)
const supabaseAdmin = createClient(
  'https://dpghrdgippisgzvlahwi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId, adminId } = await request.json()

    if (!userId || !adminId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Verificar que quien hace la solicitud es admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', adminId)
      .single()

    if (adminError || !adminProfile?.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Eliminar el perfil de la tabla profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error eliminando perfil:', profileError)
      return NextResponse.json({ error: 'Error eliminando perfil: ' + profileError.message }, { status: 500 })
    }

    // Eliminar el usuario de Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error eliminando usuario de Auth:', authError)
      return NextResponse.json({ error: 'Error eliminando usuario de Auth: ' + authError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en delete-user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
