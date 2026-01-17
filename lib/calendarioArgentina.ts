// Calendario de Argentina: Feriados, Fines de Semana Largos y Fechas Especiales

export interface Feriado {
  id?: string
  fecha: string // YYYY-MM-DD
  nombre: string
  tipo: 'inamovible' | 'trasladable' | 'puente' | 'no_laborable' | 'custom'
  esFinDeSemanaLargo: boolean
  esCustom?: boolean
}

export interface FeriadoCustom {
  id?: string
  fecha: string
  nombre: string
  tipo: 'inamovible' | 'trasladable' | 'puente' | 'no_laborable' | 'custom'
  user_id?: string
  created_at?: string
}

export interface FeriadoInfo {
  nombre: string
  tipo: 'inamovible' | 'trasladable' | 'puente' | 'no_laborable'
}

// Feriados inamovibles (misma fecha todos los años)
const FERIADOS_INAMOVIBLES: Record<string, FeriadoInfo> = {
  '01-01': { nombre: 'Año Nuevo', tipo: 'inamovible' },
  '02-24': { nombre: 'Carnaval', tipo: 'inamovible' }, // Calculado dinámicamente
  '02-25': { nombre: 'Carnaval', tipo: 'inamovible' }, // Calculado dinámicamente
  '03-24': { nombre: 'Día de la Memoria', tipo: 'inamovible' },
  '04-02': { nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'inamovible' },
  '05-01': { nombre: 'Día del Trabajador', tipo: 'inamovible' },
  '05-25': { nombre: 'Día de la Revolución de Mayo', tipo: 'inamovible' },
  '06-17': { nombre: 'Paso a la Inmortalidad del Gral. Güemes', tipo: 'inamovible' },
  '06-20': { nombre: 'Paso a la Inmortalidad del Gral. Belgrano', tipo: 'inamovible' },
  '07-09': { nombre: 'Día de la Independencia', tipo: 'inamovible' },
  '08-17': { nombre: 'Paso a la Inmortalidad del Gral. San Martín', tipo: 'trasladable' },
  '10-12': { nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'trasladable' },
  '11-20': { nombre: 'Día de la Soberanía Nacional', tipo: 'trasladable' },
  '12-08': { nombre: 'Inmaculada Concepción de María', tipo: 'inamovible' },
  '12-25': { nombre: 'Navidad', tipo: 'inamovible' },
}

// Feriados con turismo (puentes) - días no laborables opcionales
const DIAS_NO_LABORABLES: Record<string, FeriadoInfo> = {
  '12-24': { nombre: 'Nochebuena (mediodía)', tipo: 'no_laborable' },
  '12-31': { nombre: 'Fin de Año (mediodía)', tipo: 'no_laborable' },
}

/**
 * Calcula la fecha de Pascua usando el algoritmo de Computus
 */
export function calcularPascua(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month, day)
}

/**
 * Calcula las fechas de Carnaval (lunes y martes, 48 y 47 días antes de Pascua)
 */
export function calcularCarnaval(year: number): { lunes: Date; martes: Date } {
  const pascua = calcularPascua(year)
  const lunes = new Date(pascua)
  lunes.setDate(pascua.getDate() - 48)
  const martes = new Date(pascua)
  martes.setDate(pascua.getDate() - 47)
  return { lunes, martes }
}

/**
 * Calcula Jueves y Viernes Santo
 */
export function calcularSemanaSanta(year: number): { jueves: Date; viernes: Date } {
  const pascua = calcularPascua(year)
  const jueves = new Date(pascua)
  jueves.setDate(pascua.getDate() - 3)
  const viernes = new Date(pascua)
  viernes.setDate(pascua.getDate() - 2)
  return { jueves, viernes }
}

/**
 * Aplica regla de traslado: si cae martes/miércoles → lunes anterior, jueves/viernes → lunes siguiente
 */
function aplicarTraslado(fecha: Date): Date {
  const dia = fecha.getDay() // 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
  const resultado = new Date(fecha)

  if (dia === 2 || dia === 3) {
    // Martes o miércoles → lunes anterior
    resultado.setDate(fecha.getDate() - (dia - 1))
  } else if (dia === 4 || dia === 5) {
    // Jueves o viernes → lunes siguiente
    resultado.setDate(fecha.getDate() + (8 - dia))
  }

  return resultado
}

/**
 * Verifica si una fecha es parte de un fin de semana largo (3+ días)
 */
function esFinDeSemanaLargo(fecha: Date, feriados: Set<string>): boolean {
  const formatFecha = (d: Date) => d.toISOString().split('T')[0]

  // Verificar si el viernes, sábado, domingo y lunes tienen feriados
  const dia = fecha.getDay()

  // Para cada día, verificar si forma un puente de 3+ días
  const verificar = (offset: number) => {
    const d = new Date(fecha)
    d.setDate(fecha.getDate() + offset)
    return feriados.has(formatFecha(d)) || d.getDay() === 0 || d.getDay() === 6
  }

  // Si es viernes y lunes es feriado → fin de semana largo
  if (dia === 5 && verificar(3)) return true
  // Si es lunes y es feriado → fin de semana largo
  if (dia === 1 && feriados.has(formatFecha(fecha))) return true
  // Si es jueves y viernes es feriado → fin de semana largo (4 días)
  if (dia === 4 && verificar(1)) return true

  return false
}

/**
 * Genera todos los feriados de un año
 */
export function generarFeriadosAnio(year: number): Feriado[] {
  const feriados: Feriado[] = []
  const formatFecha = (d: Date) => d.toISOString().split('T')[0]
  const feriadosSet = new Set<string>()

  // 1. Agregar feriados inamovibles
  Object.entries(FERIADOS_INAMOVIBLES).forEach(([mmdd, info]) => {
    const fecha = `${year}-${mmdd}`
    // Excluir Carnaval (se calcula dinámicamente)
    if (!mmdd.startsWith('02-2') || info.nombre !== 'Carnaval') {
      if (info.tipo === 'trasladable') {
        const fechaOriginal = new Date(`${fecha}T00:00:00`)
        const fechaTrasladada = aplicarTraslado(fechaOriginal)
        const fechaFinal = formatFecha(fechaTrasladada)
        feriados.push({
          fecha: fechaFinal,
          nombre: info.nombre,
          tipo: info.tipo,
          esFinDeSemanaLargo: false
        })
        feriadosSet.add(fechaFinal)
      } else {
        feriados.push({
          fecha,
          nombre: info.nombre,
          tipo: info.tipo,
          esFinDeSemanaLargo: false
        })
        feriadosSet.add(fecha)
      }
    }
  })

  // 2. Agregar Carnaval (móvil)
  const carnaval = calcularCarnaval(year)
  feriados.push({
    fecha: formatFecha(carnaval.lunes),
    nombre: 'Carnaval (Lunes)',
    tipo: 'inamovible',
    esFinDeSemanaLargo: true
  })
  feriados.push({
    fecha: formatFecha(carnaval.martes),
    nombre: 'Carnaval (Martes)',
    tipo: 'inamovible',
    esFinDeSemanaLargo: true
  })
  feriadosSet.add(formatFecha(carnaval.lunes))
  feriadosSet.add(formatFecha(carnaval.martes))

  // 3. Agregar Semana Santa (móvil)
  const semanaSanta = calcularSemanaSanta(year)
  feriados.push({
    fecha: formatFecha(semanaSanta.jueves),
    nombre: 'Jueves Santo',
    tipo: 'inamovible',
    esFinDeSemanaLargo: true
  })
  feriados.push({
    fecha: formatFecha(semanaSanta.viernes),
    nombre: 'Viernes Santo',
    tipo: 'inamovible',
    esFinDeSemanaLargo: true
  })
  feriadosSet.add(formatFecha(semanaSanta.jueves))
  feriadosSet.add(formatFecha(semanaSanta.viernes))

  // 4. Agregar días no laborables
  Object.entries(DIAS_NO_LABORABLES).forEach(([mmdd, info]) => {
    const fecha = `${year}-${mmdd}`
    feriados.push({
      fecha,
      nombre: info.nombre,
      tipo: info.tipo,
      esFinDeSemanaLargo: false
    })
  })

  // 5. Marcar fines de semana largos
  feriados.forEach(f => {
    const fecha = new Date(`${f.fecha}T00:00:00`)
    f.esFinDeSemanaLargo = esFinDeSemanaLargo(fecha, feriadosSet)
  })

  // Ordenar por fecha
  feriados.sort((a, b) => a.fecha.localeCompare(b.fecha))

  return feriados
}

/**
 * Obtiene los fines de semana largos del año
 */
export function obtenerFinesDeSemanaLargos(year: number): Array<{
  nombre: string
  fechaInicio: string
  fechaFin: string
  dias: number
}> {
  const feriados = generarFeriadosAnio(year)
  const fdsLargos: Array<{
    nombre: string
    fechaInicio: string
    fechaFin: string
    dias: number
  }> = []

  // Agrupar feriados consecutivos o que forman puente
  const feriadosMap = new Map(feriados.map(f => [f.fecha, f]))

  // Analizar cada feriado para ver si forma un fin de semana largo
  const procesados = new Set<string>()

  feriados.forEach(feriado => {
    if (procesados.has(feriado.fecha)) return

    const fechaBase = new Date(`${feriado.fecha}T00:00:00`)
    const dia = fechaBase.getDay()

    // Si es lunes, verificar sábado y domingo previos
    if (dia === 1) {
      const inicio = new Date(fechaBase)
      inicio.setDate(fechaBase.getDate() - 2) // Sábado
      fdsLargos.push({
        nombre: feriado.nombre,
        fechaInicio: inicio.toISOString().split('T')[0],
        fechaFin: feriado.fecha,
        dias: 3
      })
      procesados.add(feriado.fecha)
    }
    // Si es viernes, verificar sábado y domingo siguientes
    else if (dia === 5) {
      const fin = new Date(fechaBase)
      fin.setDate(fechaBase.getDate() + 2) // Domingo
      fdsLargos.push({
        nombre: feriado.nombre,
        fechaInicio: feriado.fecha,
        fechaFin: fin.toISOString().split('T')[0],
        dias: 3
      })
      procesados.add(feriado.fecha)
    }
    // Si es jueves y viernes es feriado también
    else if (dia === 4) {
      const viernes = new Date(fechaBase)
      viernes.setDate(fechaBase.getDate() + 1)
      const viernesStr = viernes.toISOString().split('T')[0]

      if (feriadosMap.has(viernesStr)) {
        const domingo = new Date(fechaBase)
        domingo.setDate(fechaBase.getDate() + 3)
        fdsLargos.push({
          nombre: `${feriado.nombre} + ${feriadosMap.get(viernesStr)?.nombre}`,
          fechaInicio: feriado.fecha,
          fechaFin: domingo.toISOString().split('T')[0],
          dias: 4
        })
        procesados.add(feriado.fecha)
        procesados.add(viernesStr)
      }
    }
  })

  return fdsLargos
}

/**
 * Verifica si una fecha específica es feriado
 */
export function esFeriado(fecha: string, year?: number): Feriado | null {
  const y = year || new Date(fecha).getFullYear()
  const feriados = generarFeriadosAnio(y)
  return feriados.find(f => f.fecha === fecha) || null
}

/**
 * Obtiene información del mes con feriados marcados
 */
export function obtenerInfoMes(year: number, month: number): Map<string, Feriado> {
  const feriados = generarFeriadosAnio(year)
  const mesStr = String(month + 1).padStart(2, '0')
  const feriadosMes = new Map<string, Feriado>()

  feriados.forEach(f => {
    if (f.fecha.startsWith(`${year}-${mesStr}`)) {
      feriadosMes.set(f.fecha, f)
    }
  })

  return feriadosMes
}

/**
 * Genera texto resumen de feriados del año
 */
export function resumenFeriadosAnio(year: number): string {
  const feriados = generarFeriadosAnio(year)
  const fdsLargos = obtenerFinesDeSemanaLargos(year)

  let resumen = `Feriados ${year}:\n\n`

  feriados.forEach(f => {
    const fecha = new Date(`${f.fecha}T00:00:00`)
    const fechaStr = fecha.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    })
    resumen += `${fechaStr}: ${f.nombre}${f.esFinDeSemanaLargo ? ' (FDS largo)' : ''}\n`
  })

  resumen += `\n\nFines de semana largos (${fdsLargos.length}):\n`
  fdsLargos.forEach(fds => {
    resumen += `- ${fds.nombre}: ${fds.dias} días\n`
  })

  return resumen
}

/**
 * Combina feriados oficiales con feriados personalizados
 * Los feriados personalizados pueden reemplazar o agregar a los oficiales
 */
export function combinarFeriados(
  year: number,
  feriadosCustom: FeriadoCustom[]
): Feriado[] {
  const feriadosOficiales = generarFeriadosAnio(year)

  // Crear mapa de feriados por fecha
  const feriadosMap = new Map<string, Feriado>()

  // Primero agregar los oficiales
  feriadosOficiales.forEach(f => {
    feriadosMap.set(f.fecha, f)
  })

  // Luego agregar/reemplazar con los personalizados
  feriadosCustom.forEach(fc => {
    if (fc.fecha.startsWith(String(year))) {
      feriadosMap.set(fc.fecha, {
        id: fc.id,
        fecha: fc.fecha,
        nombre: fc.nombre,
        tipo: fc.tipo,
        esFinDeSemanaLargo: false, // Se recalculará
        esCustom: true
      })
    }
  })

  // Convertir a array y ordenar
  const resultado = Array.from(feriadosMap.values())
  resultado.sort((a, b) => a.fecha.localeCompare(b.fecha))

  return resultado
}

/**
 * Obtiene info del mes combinando feriados oficiales y personalizados
 */
export function obtenerInfoMesConCustom(
  year: number,
  month: number,
  feriadosCustom: FeriadoCustom[]
): Map<string, Feriado> {
  const feriados = combinarFeriados(year, feriadosCustom)
  const mesStr = String(month + 1).padStart(2, '0')
  const feriadosMes = new Map<string, Feriado>()

  feriados.forEach(f => {
    if (f.fecha.startsWith(`${year}-${mesStr}`)) {
      feriadosMes.set(f.fecha, f)
    }
  })

  return feriadosMes
}
