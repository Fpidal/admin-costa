'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Lock, Eye, EyeOff, Mail, User, MapPin, Home, Clock } from 'lucide-react'

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInactive, setIsInactive] = useState(false)
  const [isPendingAuth, setIsPendingAuth] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [barrio, setBarrio] = useState('')
  const [lote, setLote] = useState('')
  const [telefono, setTelefono] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Lista de barrios
  const barrios = [
    'Deportiva 1', 'Deportiva 2', 'Golf 1', 'Golf 2', 'Bosque',
    'Senderos 1', 'Senderos 2', 'Senderos 3', 'Senderos 4',
    'Residencial 1', 'Residencial 2', 'Maritimo 1', 'Maritimo 2', 'Maritimo 3'
  ]

  const router = useRouter()

  // Función para verificar sesión
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('activo, is_admin, autorizado, nombre, email')
        .eq('id', session.user.id)
        .single()

      if (!profile) {
        // Usuario eliminado - cerrar sesión
        await supabase.auth.signOut()
        setIsAuthenticated(false)
      } else if (profile.activo === false) {
        setIsInactive(true)
        setIsAuthenticated(false)
      } else if (profile.autorizado === false) {
        setIsPendingAuth(true)
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
        setIsAdmin(profile.is_admin || false)
        setUserName(profile.nombre || '')
        setUserEmail(profile.email || session.user.email || '')
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    // En modo demo, autenticar automáticamente
    if (isDemo) {
      setIsAuthenticated(true)
      setIsLoading(false)
      return
    }

    checkSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsSettingNewPassword(true)
        setIsAuthenticated(false)
        setIsLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        setIsAdmin(false)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [isDemo, isSettingNewPassword])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message)
      setSubmitting(false)
    } else if (data.user) {
      // Obtener perfil directamente
      const { data: profile } = await supabase
        .from('profiles')
        .select('activo, is_admin, autorizado, nombre, email')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // Usuario eliminado
        await supabase.auth.signOut()
        setError('Tu cuenta ha sido eliminada. Contactá al administrador.')
        setSubmitting(false)
        return
      }

      if (profile.activo === false) {
        setIsInactive(true)
        setSubmitting(false)
        return
      }

      if (profile.autorizado === false) {
        setIsPendingAuth(true)
        setSubmitting(false)
        return
      }

      setIsAdmin(profile.is_admin || false)
      setUserName(profile.nombre || '')
      setUserEmail(profile.email || data.user.email || '')
      setIsAuthenticated(true)
      setSubmitting(false)
      router.push('/admin/propiedades')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!barrio) {
      setError('Seleccioná tu barrio')
      return
    }
    if (!lote) {
      setError('Ingresá tu número de lote')
      return
    }

    setSubmitting(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre,
          barrio: barrio,
          lote: lote,
          telefono: telefono,
        }
      }
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else {
      // Actualizar profile con los datos adicionales
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre: nombre,
          email: email,
          barrio: barrio,
          lote: lote,
          telefono: telefono,
          autorizado: false, // Pendiente de autorización
        })
      }
      setMessage('¡Solicitud enviada! Tu cuenta está pendiente de autorización. Te notificaremos cuando sea aprobada.')
      setSubmitting(false)
      // Limpiar formulario
      setEmail('')
      setPassword('')
      setNombre('')
      setBarrio('')
      setLote('')
      setTelefono('')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Te enviamos un email con instrucciones para restablecer tu contraseña.')
    }
    setSubmitting(false)
  }

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else {
      setMessage('¡Contraseña actualizada correctamente!')
      setPassword('')
      setConfirmPassword('')
      setIsSettingNewPassword(false)
      setSubmitting(false)
      // Redirigir al admin
      router.push('/admin/propiedades')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-costa-beige">
        <div className="text-costa-gris">Cargando...</div>
      </div>
    )
  }

  if (isInactive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-costa-beige to-costa-beige-light">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-costa-coral/10 flex items-center justify-center">
              <Lock size={32} className="text-costa-coral" />
            </div>
            <h1 className="text-2xl font-semibold text-costa-navy mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
              Cuenta Desactivada
            </h1>
            <p className="text-costa-gris mb-6">
              Tu cuenta ha sido desactivada. Contactá al administrador para más información.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setIsInactive(false)
                router.push('/')
              }}
              className="w-full py-3 bg-costa-navy text-white rounded-lg font-medium hover:bg-costa-navy/90 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isPendingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-costa-beige to-costa-beige-light">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={32} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-semibold text-costa-navy mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
              Autorización Pendiente
            </h1>
            <p className="text-costa-gris mb-6">
              Tu solicitud está siendo revisada. Te notificaremos por email cuando tu cuenta sea autorizada.
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                setIsPendingAuth(false)
                router.push('/')
              }}
              className="w-full py-3 bg-costa-navy text-white rounded-lg font-medium hover:bg-costa-navy/90 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Pantalla para establecer nueva contraseña (después de recovery)
  if (isSettingNewPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-costa-beige to-costa-beige-light">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>
                Admin Costa
              </h1>
              <p className="text-sm text-costa-gris mt-2">
                Crear nueva contraseña
              </p>
            </div>

            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-costa-navy mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-costa-gris" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-costa-gris hover:text-costa-navy"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-costa-navy mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-costa-gris" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                    placeholder="Repetir contraseña"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-costa-coral bg-costa-coral/10 p-3 rounded-lg">{error}</p>
              )}

              {message && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{message}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-costa-navy text-white rounded-lg font-medium hover:bg-costa-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-costa-beige to-costa-beige-light">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>
                Admin Costa
              </h1>
              <p className="text-sm text-costa-gris mt-2">
                {isResettingPassword
                  ? 'Restablecer contraseña'
                  : isRegistering
                    ? 'Crear cuenta nueva'
                    : 'Acceso para propietarios'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={isResettingPassword ? handleResetPassword : isRegistering ? handleRegister : handleLogin} className="space-y-4">
              {/* Campos de registro */}
              {isRegistering && !isResettingPassword && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-costa-navy mb-2">
                      Nombre completo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-costa-gris" />
                      </div>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                        placeholder="Tu nombre completo"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-costa-navy mb-2">
                        Barrio
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin size={18} className="text-costa-gris" />
                        </div>
                        <select
                          value={barrio}
                          onChange={(e) => setBarrio(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all appearance-none bg-white"
                          required
                        >
                          <option value="">Seleccionar...</option>
                          {barrios.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-costa-navy mb-2">
                        Lote
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Home size={18} className="text-costa-gris" />
                        </div>
                        <input
                          type="text"
                          value={lote}
                          onChange={(e) => setLote(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                          placeholder="Ej: 123"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-costa-navy mb-2">
                      Teléfono (opcional)
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full px-4 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                      placeholder="Ej: 11 1234-5678"
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-costa-navy mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-costa-gris" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                    required
                    autoFocus={!isRegistering}
                  />
                </div>
              </div>

              {/* Contraseña (ocultar en reset) */}
              {!isResettingPassword && (
                <div>
                  <label className="block text-sm font-medium text-costa-navy mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className="text-costa-gris" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-costa-beige rounded-lg focus:ring-2 focus:ring-costa-navy focus:border-transparent transition-all"
                      placeholder={isRegistering ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-costa-gris hover:text-costa-navy"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <p className="text-sm text-costa-coral bg-costa-coral/10 p-3 rounded-lg">{error}</p>
              )}

              {/* Success message */}
              {message && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{message}</p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-costa-navy text-white rounded-lg font-medium hover:bg-costa-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Procesando...'
                  : isResettingPassword
                    ? 'Enviar email'
                    : isRegistering
                      ? 'Crear cuenta'
                      : 'Ingresar'}
              </button>
            </form>

            {/* Forgot password link (solo en login) */}
            {!isRegistering && !isResettingPassword && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setIsResettingPassword(true)
                    setError('')
                    setMessage('')
                  }}
                  className="text-sm text-costa-gris hover:text-costa-navy hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Toggle login/register */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setIsResettingPassword(false)
                  setError('')
                  setMessage('')
                }}
                className="text-sm text-costa-navy hover:underline"
              >
                {isResettingPassword
                  ? 'Volver a iniciar sesión'
                  : isRegistering
                    ? '¿Ya tenés cuenta? Iniciá sesión'
                    : '¿No tenés cuenta? Registrate'}
              </button>
            </div>

            {/* Link to public */}
            <div className="mt-4 text-center">
              <a
                href="/"
                className="text-sm text-costa-gris hover:text-costa-navy transition-colors"
              >
                Volver al sitio público
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Fondo de playa fijo */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(https://dpghrdgippisgzvlahwi.supabase.co/storage/v1/object/public/Imagenes/foto%20playa%20costa.JPG)' }}
      >
        <div className="absolute inset-0 bg-costa-beige/80" />
      </div>

      <div className="flex min-h-screen max-w-full">
        <Sidebar onLogout={handleLogout} isDemo={isDemo} isAdmin={isAdmin} userName={userName} userEmail={userEmail} />
        <main className="flex-1 lg:ml-0 min-w-0">
          <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-costa-beige">
        <div className="text-costa-gris">Cargando...</div>
      </div>
    }>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  )
}
