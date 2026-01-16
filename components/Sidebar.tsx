'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  CalendarRange,
  Users,
  Receipt,
  Info,
  Menu,
  X,
  LogOut,
  Globe,
  Eye,
  Shield
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Propiedades', href: '/admin/propiedades', icon: Building2 },
  { name: 'Reservas', href: '/admin/reservas', icon: CalendarDays },
  { name: 'Calendario', href: '/admin/calendario', icon: CalendarRange },
  { name: 'Inquilinos', href: '/admin/inquilinos', icon: Users },
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Administración', href: '/admin/gastos', icon: Receipt },
  { name: 'Info útil', href: '/admin/info-util', icon: Info },
]

interface SidebarProps {
  onLogout?: () => void
  isDemo?: boolean
  isAdmin?: boolean
  userName?: string
  userEmail?: string
}

export default function Sidebar({ onLogout, isDemo = false, isAdmin = false, userName = '', userEmail = '' }: SidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Agregar ?demo=true a los links si estamos en modo demo
  const getHref = (href: string) => isDemo ? `${href}?demo=true` : href

  // Navegación con item de admin condicional
  const fullNavigation = isAdmin
    ? [...navigation, { name: 'Usuarios', href: '/admin/usuarios', icon: Shield }]
    : navigation

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white shadow-md">
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-costa-navy" style={{ fontFamily: 'var(--font-playfair)' }}>Admin Costa</span>
          {isDemo && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">DEMO</span>
          )}
        </div>
        {onLogout && !isDemo && (
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-costa-coral hover:bg-costa-coral/10"
            title="Cerrar sesión"
          >
            <LogOut size={22} />
          </button>
        )}
        {isDemo && <div className="w-10" />}
      </div>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-gradient-to-b from-costa-beige-light/95 to-costa-beige/90 backdrop-blur-sm
        border-r border-costa-beige
        transform transition-transform duration-200 ease-in-out
        shadow-lg
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-24 flex flex-col items-center justify-center px-4 border-b border-costa-beige text-center">
            <h1 className="text-2xl font-semibold tracking-wide" style={{ fontFamily: 'var(--font-playfair)', color: '#1e3a5f' }}>Admin Costa</h1>
            {isDemo ? (
              <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-100 rounded-full">
                <Eye size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Modo Demo</span>
              </div>
            ) : (
              <p className="text-sm font-normal mt-2" style={{ color: '#6b7c8a' }}>
                Administrada por sus dueños
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div className="px-3 py-3 border-b border-costa-beige flex gap-2">
            <Link
              href={isDemo ? "/?demo=true" : "/"}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-costa-gris hover:text-costa-navy hover:bg-costa-white/50 rounded-lg transition-colors border border-costa-beige"
            >
              <Globe size={14} />
              Ver sitio
            </Link>
            {onLogout && !isDemo && (
              <button
                onClick={onLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-costa-coral hover:bg-costa-coral/10 rounded-lg transition-colors border border-costa-coral/30"
              >
                <LogOut size={14} />
                Salir
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {fullNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={getHref(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-costa-white/80 text-costa-navy border-l-4 border-costa-navy rounded-r-lg shadow-sm'
                      : 'text-costa-navy hover:bg-costa-white/50 rounded-lg border-l-4 border-transparent'
                    }
                  `}
                >
                  <item.icon size={20} className={isActive ? 'text-costa-coral' : 'text-costa-gris'} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Usuario logueado */}
          {!isDemo && (userName || userEmail) && (
            <div className="px-3 py-3 border-t border-costa-beige">
              <div className="flex items-center gap-3 px-3 py-2 bg-costa-white/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-costa-navy text-white flex items-center justify-center text-sm font-medium">
                  {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {userName && (
                    <p className="text-sm font-medium text-costa-navy truncate">{userName}</p>
                  )}
                  <p className="text-xs text-costa-gris truncate">{userEmail}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </aside>
    </>
  )
}
