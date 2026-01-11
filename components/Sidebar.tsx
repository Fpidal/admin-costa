'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  Receipt,
  Info,
  Menu,
  X,
  LogOut,
  Globe
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Propiedades', href: '/admin/propiedades', icon: Building2 },
  { name: 'Reservas', href: '/admin/reservas', icon: CalendarDays },
  { name: 'Inquilinos', href: '/admin/inquilinos', icon: Users },
  { name: 'Administración', href: '/admin/gastos', icon: Receipt },
  { name: 'Info útil', href: '/admin/info-util', icon: Info },
]

interface SidebarProps {
  onLogout?: () => void
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

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
            <p className="text-[9px] font-light tracking-[0.08em] mt-1 whitespace-nowrap" style={{ color: '#5a6c7d' }}>
              Administrada por sus propietarios
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
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

          {/* Footer */}
          <div className="p-4 border-t border-costa-beige space-y-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-costa-gris hover:text-costa-navy hover:bg-costa-white/50 rounded-lg transition-colors"
            >
              <Globe size={16} />
              Ver sitio público
            </Link>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-costa-coral hover:bg-costa-coral/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
