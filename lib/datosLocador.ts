// Datos del locador que salen en el contrato y en los PDF de reserva. Cada
// usuario los carga en "Mis datos" (tabla profiles).

export interface DatosLocador {
  nombre: string
  dni: string
  domicilio: string
  telefono: string
}

export const DATOS_LOCADOR_VACIOS: DatosLocador = { nombre: '', dni: '', domicilio: '', telefono: '' }

// En la demo no hay perfil: se usan datos de ejemplo
export const DATOS_LOCADOR_DEMO: DatosLocador = {
  nombre: 'Propietario Demo',
  dni: '00.000.000',
  domicilio: 'Calle Ejemplo 123',
  telefono: '11 0000 0000',
}

const CAMPOS_CONTRATO: { campo: keyof DatosLocador; label: string }[] = [
  { campo: 'nombre', label: 'nombre y apellido' },
  { campo: 'dni', label: 'DNI' },
  { campo: 'domicilio', label: 'domicilio' },
  { campo: 'telefono', label: 'teléfono' },
]

// Lo que falta cargar para poder generar el contrato
export function camposFaltantes(d: DatosLocador): string[] {
  return CAMPOS_CONTRATO.filter(c => !d[c.campo]?.trim()).map(c => c.label)
}
