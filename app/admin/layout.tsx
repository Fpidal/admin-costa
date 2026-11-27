import type { Metadata, Viewport } from 'next'
import PanelAdmin from './PanelAdmin'

// El panel tiene su propio botón para el celular: al agregarlo a la pantalla
// de inicio abre directo en /admin (la web pública abre en la portada).
export const metadata: Metadata = {
  title: 'Costa Directo · Panel',
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'Costa Directo', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#14504c',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <PanelAdmin>{children}</PanelAdmin>
}
