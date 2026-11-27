// Secciones que el super admin le puede habilitar a cada usuario. La base
// controla lo mismo (función tiene_permiso en sql/27), así que esconder el menú
// es solo comodidad: sin el permiso, la base tampoco devuelve los datos.

export type Permiso = 'casas' | 'precios' | 'reservas' | 'gastos' | 'informes' | 'piezas'

export const PERMISOS: { clave: Permiso; nombre: string; detalle: string }[] = [
  { clave: 'casas', nombre: 'Casas', detalle: 'Cargar sus casas, fotos y publicarlas en la web' },
  { clave: 'precios', nombre: 'Precios', detalle: 'Precios por temporada y calendario' },
  { clave: 'reservas', nombre: 'Reservas y cobros', detalle: 'Reservas, huéspedes, pagos, contrato' },
  { clave: 'gastos', nombre: 'Gastos', detalle: 'Gastos, expensas y electricidad' },
  { clave: 'informes', nombre: 'Informes', detalle: 'Estadísticas y balance del año' },
  { clave: 'piezas', nombre: 'Piezas gráficas', detalle: 'Imágenes para redes y fichas PDF' },
]

export const ATAJOS: { nombre: string; permisos: Permiso[] }[] = [
  { nombre: 'Solo publicar', permisos: ['casas', 'precios'] },
  { nombre: 'Dueño completo', permisos: PERMISOS.map(p => p.clave) },
  { nombre: 'Nada', permisos: [] },
]

// Qué permiso pide cada sección del panel (las que no están, las ve cualquiera)
const POR_RUTA: [string, Permiso[]][] = [
  ['/admin/temporada', ['reservas']],
  ['/admin/reservas', ['reservas']],
  ['/admin/inquilinos', ['reservas']],
  ['/admin/calendario', ['reservas']],
  ['/admin/gastos', ['gastos']],
  ['/admin/propiedades', ['casas', 'precios']],
  ['/admin/piezas', ['piezas']],
  ['/admin/usuarios', []], // solo admin
]

export interface Acceso { esAdmin: boolean; permisos: string[] }

export const puede = (a: Acceso, ...p: Permiso[]) => a.esAdmin || p.some(x => a.permisos.includes(x))

/** ¿Puede abrir esta ruta del panel? */
export function puedeVer(a: Acceso, ruta: string): boolean {
  if (a.esAdmin) return true
  if (ruta === '/admin') return puede(a, 'informes')
  const regla = POR_RUTA.find(([r]) => ruta === r || ruta.startsWith(r + '/'))
  if (!regla) return true
  return regla[1].length > 0 && puede(a, ...regla[1])
}

/** Primera pantalla que puede abrir, para mandarlo ahí al entrar. */
export function inicioPara(a: Acceso): string {
  const orden = ['/admin/temporada', '/admin/propiedades', '/admin/gastos', '/admin', '/admin/piezas', '/admin/mis-datos']
  return orden.find(r => puedeVer(a, r)) || '/admin/mis-datos'
}
