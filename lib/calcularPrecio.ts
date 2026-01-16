// Tipos
export interface PrecioCalendario {
  id: number
  propiedad_id: number
  fecha_inicio: string
  fecha_fin: string
  precio_noche: number
  moneda: string
  minimo_noches: number
  disponible: boolean
  temporada: string | null
  notas: string | null
}

export interface PrecioCalculado {
  noches: number
  precioPromedio: number
  total: number
  desglose: { fecha: string; precio: number; temporada?: string }[]
  moneda: string
  disponible: boolean
  minimoNochesRequerido: number
}

// Presets de temporadas Argentina
export const TEMPORADAS_PRESETS = {
  alta: {
    nombre: 'Temporada Alta',
    color: '#ef4444', // rojo
    periodos: [
      { inicio: '12-15', fin: '02-28' }, // 15 Dic - 28 Feb
      { inicio: '07-01', fin: '07-31' }, // Julio completo
    ],
    multiplicador: 1.0,
  },
  media: {
    nombre: 'Temporada Media',
    color: '#f59e0b', // amarillo
    periodos: [
      { inicio: '03-01', fin: '03-31' }, // Marzo
      { inicio: '09-01', fin: '11-30' }, // Sep-Nov
    ],
    multiplicador: 0.8,
  },
  baja: {
    nombre: 'Temporada Baja',
    color: '#22c55e', // verde
    periodos: [
      { inicio: '04-01', fin: '06-30' }, // Abr-Jun
      { inicio: '08-01', fin: '08-31' }, // Agosto
    ],
    multiplicador: 0.6,
  },
  especial: {
    nombre: 'Fecha Especial',
    color: '#8b5cf6', // violeta
    periodos: [],
    multiplicador: 1.5,
  },
}

export const FECHAS_ESPECIALES = [
  { nombre: 'Navidad', inicio: '12-24', fin: '12-25', multiplicador: 1.5 },
  { nombre: 'Año Nuevo', inicio: '12-31', fin: '01-01', multiplicador: 1.5 },
  { nombre: 'Día de la Independencia', inicio: '07-09', fin: '07-09', multiplicador: 1.2 },
]

// Obtener precio para una fecha específica
function getPrecioParaFecha(
  fecha: Date,
  precios: PrecioCalendario[]
): PrecioCalendario | null {
  const fechaStr = fecha.toISOString().split('T')[0]

  for (const precio of precios) {
    if (fechaStr >= precio.fecha_inicio && fechaStr <= precio.fecha_fin) {
      return precio
    }
  }

  return null
}

// Calcular precio total para un rango de fechas
export function calcularPrecioReserva(
  fechaInicio: Date,
  fechaFin: Date,
  precios: PrecioCalendario[],
  precioDefault: number = 0
): PrecioCalculado {
  const noches = Math.ceil(
    (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (noches <= 0) {
    return {
      noches: 0,
      precioPromedio: 0,
      total: 0,
      desglose: [],
      moneda: 'USD',
      disponible: false,
      minimoNochesRequerido: 1,
    }
  }

  const desglose: { fecha: string; precio: number; temporada?: string }[] = []
  let total = 0
  let disponible = true
  let minimoNochesRequerido = 1
  let moneda = 'USD'

  const currentDate = new Date(fechaInicio)

  for (let i = 0; i < noches; i++) {
    const fechaStr = currentDate.toISOString().split('T')[0]
    const precioConfig = getPrecioParaFecha(currentDate, precios)

    if (precioConfig) {
      if (!precioConfig.disponible) {
        disponible = false
      }

      desglose.push({
        fecha: fechaStr,
        precio: precioConfig.precio_noche,
        temporada: precioConfig.temporada || undefined,
      })

      total += precioConfig.precio_noche
      moneda = precioConfig.moneda

      if (precioConfig.minimo_noches > minimoNochesRequerido) {
        minimoNochesRequerido = precioConfig.minimo_noches
      }
    } else if (precioDefault > 0) {
      // Usar precio default si no hay configuración
      desglose.push({
        fecha: fechaStr,
        precio: precioDefault,
      })
      total += precioDefault
    } else {
      // Sin precio configurado
      desglose.push({
        fecha: fechaStr,
        precio: 0,
      })
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Verificar mínimo de noches
  if (noches < minimoNochesRequerido) {
    disponible = false
  }

  return {
    noches,
    precioPromedio: noches > 0 ? Math.round(total / noches) : 0,
    total,
    desglose,
    moneda,
    disponible,
    minimoNochesRequerido,
  }
}

// Formatear precio
export function formatPrecio(monto: number, moneda: string = 'USD'): string {
  if (moneda === 'USD') {
    return `USD ${monto.toLocaleString('es-AR')}`
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(monto)
}

// Generar fechas de un año para presets
export function generarFechasTemporada(
  anio: number,
  temporada: keyof typeof TEMPORADAS_PRESETS,
  precioBase: number
): { inicio: string; fin: string; precio: number }[] {
  const config = TEMPORADAS_PRESETS[temporada]
  const resultado: { inicio: string; fin: string; precio: number }[] = []

  for (const periodo of config.periodos) {
    const [mesInicio, diaInicio] = periodo.inicio.split('-').map(Number)
    const [mesFin, diaFin] = periodo.fin.split('-').map(Number)

    let anioInicio = anio
    let anioFin = anio

    // Manejar período que cruza año (ej: 15 Dic - 28 Feb)
    if (mesInicio > mesFin) {
      anioFin = anio + 1
    }

    resultado.push({
      inicio: `${anioInicio}-${String(mesInicio).padStart(2, '0')}-${String(diaInicio).padStart(2, '0')}`,
      fin: `${anioFin}-${String(mesFin).padStart(2, '0')}-${String(diaFin).padStart(2, '0')}`,
      precio: Math.round(precioBase * config.multiplicador),
    })
  }

  return resultado
}
