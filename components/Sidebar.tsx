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
  X
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Propiedades', href: '/propiedades', icon: Building2 },
  { name: 'Reservas', href: '/reservas', icon: CalendarDays },
  { name: 'Inquilinos', href: '/inquilinos', icon: Users },
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Gastos', href: '/gastos', icon: Receipt },
  { name: 'Info útil', href: '/info-util', icon: Info },
]

export default function Sidebar() {
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
        w-64 bg-costa-blanco border-r border-costa-agua
        transform transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-costa-agua">
            <h1 className="text-xl font-bold text-costa-navy">Admin Costa</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-costa-navy text-white'
                      : 'text-costa-navy hover:bg-costa-agua'
                    }
                  `}
                >
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-costa-gris'} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-costa-agua">
            <p className="text-xs text-costa-gris text-center">
              Admin Costa v1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
