'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const auth = localStorage.getItem('admin-costa-auth')
    if (auth === 'authenticated') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'admincosta') {
      localStorage.setItem('admin-costa-auth', 'authenticated')
      setIsAuthenticated(true)
      setError('')
      router.push('/admin/propiedades')
    } else {
      setError('Clave incorrecta')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin-costa-auth')
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
              <p className="text-sm text-costa-gris mt-2">Acceso para propietarios</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-costa-navy mb-2">
                  Clave de acceso
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
                    placeholder="Ingresá la clave"
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
                {error && (
                  <p className="mt-2 text-sm text-costa-coral">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-costa-navy text-white rounded-lg font-medium hover:bg-costa-navy/90 transition-colors"
              >
                Ingresar
              </button>
            </form>

            {/* Link to public */}
            <div className="mt-6 text-center">
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
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 lg:ml-0 min-w-0">
          <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
