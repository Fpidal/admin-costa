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
  Shield,
  Trash2,
  Images,
  UserCog,
  Sun,
  History,
} from 'lucide-react'
import { VERSION_ACTUAL } from '@/lib/versiones'
import { useState } from 'react'
import { CampanitaMensajes } from './CampanitaMensajes'

// Lo de todos los días, arriba; el resto en "Más". Solo cambia el menú:
// las direcciones de cada pantalla siguen siendo las mismas
const navigation = [
  { name: 'Temporada', href: '/admin/temporada', icon: Sun },
  { name: 'Reservas', href: '/admin/reservas', icon: CalendarDays },
  { name: 'Huéspedes', href: '/admin/inquilinos', icon: Users },
  { name: 'Casas', href: '/admin/propiedades', icon: Building2 },
  { name: 'Gastos', href: '/admin/gastos', icon: Receipt },
]

const navigationMas = [
  { name: 'Calendario', href: '/admin/calendario', icon: CalendarRange },
  { name: 'Piezas gráficas', href: '/admin/piezas', icon: Images },
  { name: 'Resumen', href: '/admin', icon: LayoutDashboard },
  { name: 'Info útil', href: '/admin/info-util', icon: Info },
  { name: 'Mis datos', href: '/admin/mis-datos', icon: UserCog },
  { name: 'Papelera', href: '/admin/papelera', icon: Trash2 },
  { name: 'Versiones', href: '/admin/versiones', icon: History },
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
  const fullNavigationMas = isAdmin
    ? [...navigationMas, { name: 'Usuarios', href: '/admin/usuarios', icon: Shield }]
    : navigationMas

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-3 bg-costa-esmeralda text-white shadow-md">
        <button
          className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <span className="text-base font-bold text-white truncate">Admin Costa</span>
          {isDemo && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex-shrink-0">DEMO</span>
          )}
        </div>
        {!isDemo && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <CampanitaMensajes />
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-white/80 hover:bg-white/10"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        )}
        {isDemo && <div className="w-10 flex-shrink-0" />}
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
        fixed inset-y-0 left-0 z-40 h-dvh
        w-64 shrink-0 bg-costa-esmeralda text-white
        transform transition-transform duration-200 ease-in-out
        shadow-lg
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="py-3.5 flex flex-col items-center justify-center px-4 border-b border-white/15 text-center">
            <h1 className="text-xl font-bold tracking-tight text-white">Admin Costa</h1>
            {isDemo ? (
              <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-amber-100 rounded-full">
                <Eye size={14} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Modo Demo</span>
              </div>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-widest mt-1 text-white/60">
                Administrada por sus dueños
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 border-b border-white/15 flex gap-2">
            <Link
              href={isDemo ? "/?demo=true" : "/"}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/20"
            >
              <Globe size={14} />
              Ver sitio
            </Link>
            {!isDemo && <CampanitaMensajes abrirHacia="derecha" />}
            {onLogout && !isDemo && (
              <button
                onClick={onLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/20"
              >
                <LogOut size={14} />
                Salir
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={getHref(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2 text-sm rounded-lg
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-costa-superficie text-costa-esmeralda font-bold shadow-sm'
                      : 'text-white/85 font-medium hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <item.icon size={19} className={isActive ? 'text-costa-esmeralda' : 'text-white/60'} />
                  {item.name}
                </Link>
              )
            })}

            <p className="px-4 pt-3 pb-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-white/45">Más</p>
            {fullNavigationMas.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={getHref(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-1 text-[0.8rem] rounded-lg
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-costa-superficie text-costa-esmeralda font-bold shadow-sm'
                      : 'text-white/65 font-medium hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <item.icon size={16} className={isActive ? 'text-costa-esmeralda' : 'text-white/45'} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Usuario logueado */}
          {!isDemo && (userName || userEmail) && (
            <div className="px-3 py-2 border-t border-white/15">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-white/10 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-costa-superficie text-costa-esmeralda flex items-center justify-center text-sm font-bold">
                  {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  {userName && (
                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                  )}
                  <p className="text-xs text-white/60 truncate">{userEmail}</p>
                </div>
              </div>
            </div>
          )}
          <Link href={getHref('/admin/versiones')} className="block px-4 pb-2 text-center text-[0.65rem] text-white/45 hover:text-white/80">
            Versión {VERSION_ACTUAL}
          </Link>

        </div>
      </aside>
    </>
  )
}
