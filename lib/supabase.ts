import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dpghrdgippisgzvlahwi.supabase.co'
const supabaseAnonKey = 'sb_publishable_jYyD3hx7m55tmzQCzz9vgw_iZPgnJNn'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente para la web pública: nunca usa la sesión del panel, así siempre lee
// como visitante (casas publicadas y sus precios), esté o no logueado el dueño
export const supabasePublico = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-publico' },
})
