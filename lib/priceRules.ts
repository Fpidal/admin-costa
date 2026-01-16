// Sistema de reglas de precios para el calendario

export type PriceCategory = 'muy_alta' | 'alta' | 'media' | 'baja' | 'excepcion'

export interface PriceRule {
  id?: string
  property_id: string
  name: string
  category: PriceCategory
  price_per_night: number
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  applies_to_days: string[] // [] = todos, ['vie','sab','dom'] = solo esos
  min_nights: number | null
  priority: number // 100=excepciones, 90=fiestas, 80=fds largos, 50=temporadas
  active: boolean
  user_id?: string
  created_at?: string
}

export interface DayPrice {
  date: string
  price: number
  category: PriceCategory
  ruleName: string
  ruleId: string
  priority: number
  minNights: number | null
}

export interface ConflictWarning {
  date: string
  rules: PriceRule[]
  message: string
}

// Colores por categoría
export const CATEGORY_COLORS: Record<PriceCategory, { bg: string; text: string; border: string }> = {
  muy_alta: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  alta: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  media: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  baja: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  excepcion: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
}

export const CATEGORY_LABELS: Record<PriceCategory, string> = {
  muy_alta: 'Muy Alta',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  excepcion: 'Excepción',
}

// Días de la semana
export const DAYS_MAP: Record<string, number> = {
  dom: 0,
  lun: 1,
  mar: 2,
  mie: 3,
  jue: 4,
  vie: 5,
  sab: 6,
}

export const DAYS_LABELS = [
  { key: 'lun', label: 'L' },
  { key: 'mar', label: 'M' },
  { key: 'mie', label: 'X' },
  { key: 'jue', label: 'J' },
  { key: 'vie', label: 'V' },
  { key: 'sab', label: 'S' },
  { key: 'dom', label: 'D' },
]

/**
 * Calcula el precio para una fecha específica
 */
export function calculatePriceForDate(
  date: Date,
  rules: PriceRule[]
): DayPrice | null {
  const dateStr = date.toISOString().split('T')[0]
  const dayOfWeek = date.getDay()
  const dayKey = Object.entries(DAYS_MAP).find(([_, v]) => v === dayOfWeek)?.[0] || ''

  // Filtrar reglas activas que aplican a esta fecha
  const applicableRules = rules.filter(rule => {
    if (!rule.active) return false
    if (dateStr < rule.start_date || dateStr > rule.end_date) return false

    // Si tiene días específicos, verificar que aplique
    if (rule.applies_to_days && rule.applies_to_days.length > 0) {
      if (!rule.applies_to_days.includes(dayKey)) return false
    }

    return true
  })

  if (applicableRules.length === 0) return null

  // Ordenar por prioridad (mayor primero) y tomar la primera
  applicableRules.sort((a, b) => b.priority - a.priority)
  const winningRule = applicableRules[0]

  return {
    date: dateStr,
    price: winningRule.price_per_night,
    category: winningRule.category,
    ruleName: winningRule.name,
    ruleId: winningRule.id || '',
    priority: winningRule.priority,
    minNights: winningRule.min_nights,
  }
}

/**
 * Calcula los precios para todo un mes
 */
export function calculateMonthPrices(
  year: number,
  month: number, // 0-indexed
  rules: PriceRule[]
): Map<string, DayPrice> {
  const prices = new Map<string, DayPrice>()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayPrice = calculatePriceForDate(new Date(d), rules)
    if (dayPrice) {
      prices.set(dayPrice.date, dayPrice)
    }
  }

  return prices
}

/**
 * Calcula los precios para todo un año
 */
export function calculateYearPrices(
  year: number,
  rules: PriceRule[]
): Map<string, DayPrice> {
  const prices = new Map<string, DayPrice>()

  for (let month = 0; month < 12; month++) {
    const monthPrices = calculateMonthPrices(year, month, rules)
    monthPrices.forEach((price, date) => {
      prices.set(date, price)
    })
  }

  return prices
}

/**
 * Detecta conflictos entre reglas (misma prioridad y se solapan)
 */
export function detectConflicts(rules: PriceRule[]): ConflictWarning[] {
  const conflicts: ConflictWarning[] = []
  const activeRules = rules.filter(r => r.active)

  for (let i = 0; i < activeRules.length; i++) {
    for (let j = i + 1; j < activeRules.length; j++) {
      const ruleA = activeRules[i]
      const ruleB = activeRules[j]

      // Verificar si tienen la misma prioridad
      if (ruleA.priority !== ruleB.priority) continue

      // Verificar si se solapan en fechas
      const overlap = !(ruleA.end_date < ruleB.start_date || ruleB.end_date < ruleA.start_date)
      if (!overlap) continue

      // Si tienen días específicos, verificar si se solapan en días
      if (ruleA.applies_to_days.length > 0 && ruleB.applies_to_days.length > 0) {
        const dayOverlap = ruleA.applies_to_days.some(d => ruleB.applies_to_days.includes(d))
        if (!dayOverlap) continue
      }

      // Encontrar las fechas de solapamiento
      const overlapStart = ruleA.start_date > ruleB.start_date ? ruleA.start_date : ruleB.start_date
      const overlapEnd = ruleA.end_date < ruleB.end_date ? ruleA.end_date : ruleB.end_date

      conflicts.push({
        date: `${overlapStart} - ${overlapEnd}`,
        rules: [ruleA, ruleB],
        message: `"${ruleA.name}" y "${ruleB.name}" tienen la misma prioridad (${ruleA.priority}) y se solapan`,
      })
    }
  }

  return conflicts
}

/**
 * Encuentra días sin regla aplicada en un año
 */
export function findUncoveredDays(year: number, rules: PriceRule[]): string[] {
  const uncovered: string[] = []
  const prices = calculateYearPrices(year, rules)

  const firstDay = new Date(year, 0, 1)
  const lastDay = new Date(year, 11, 31)

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    if (!prices.has(dateStr)) {
      uncovered.push(dateStr)
    }
  }

  return uncovered
}

/**
 * Calcula métricas del año
 */
export function calculateYearMetrics(year: number, rules: PriceRule[]) {
  const prices = calculateYearPrices(year, rules)
  const activeRules = rules.filter(r => r.active)

  let totalPrice = 0
  let highSeasonDays = 0
  let coveredDays = 0

  prices.forEach(price => {
    totalPrice += price.price
    coveredDays++
    if (price.category === 'muy_alta' || price.category === 'alta') {
      highSeasonDays++
    }
  })

  const totalDaysInYear = (new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24) + 1

  return {
    activeRules: activeRules.length,
    highSeasonDays,
    averagePrice: coveredDays > 0 ? Math.round(totalPrice / coveredDays) : 0,
    coveredDays,
    uncoveredDays: totalDaysInYear - coveredDays,
    coveragePercent: Math.round((coveredDays / totalDaysInYear) * 100),
  }
}

/**
 * Calcula la fecha de Semana Santa (móvil)
 */
export function getEasterDate(year: number): Date {
  // Algoritmo de Computus para calcular Pascua
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
 * Calcula las fechas de Carnaval (móvil, 47 días antes de Pascua)
 */
export function getCarnivalDates(year: number): { start: Date; end: Date } {
  const easter = getEasterDate(year)
  const carnivalStart = new Date(easter)
  carnivalStart.setDate(easter.getDate() - 49) // Sábado de carnaval
  const carnivalEnd = new Date(easter)
  carnivalEnd.setDate(easter.getDate() - 46) // Martes de carnaval

  return { start: carnivalStart, end: carnivalEnd }
}

/**
 * Calcula las fechas de Semana Santa
 */
export function getHolyWeekDates(year: number): { start: Date; end: Date } {
  const easter = getEasterDate(year)
  const holyWeekStart = new Date(easter)
  holyWeekStart.setDate(easter.getDate() - 7) // Domingo de Ramos
  const holyWeekEnd = new Date(easter)
  holyWeekEnd.setDate(easter.getDate() + 1) // Lunes de Pascua

  return { start: holyWeekStart, end: holyWeekEnd }
}

// Presets predefinidos para Costa Esmeralda
export interface PresetTemplate {
  name: string
  description: string
  rules: Omit<PriceRule, 'id' | 'property_id' | 'user_id' | 'created_at'>[]
}

export function generateCostaEsmeraldaPreset(year: number, basePrice: number): PresetTemplate {
  const holyWeek = getHolyWeekDates(year)
  const carnival = getCarnivalDates(year)

  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  return {
    name: 'Verano Costa Esmeralda - Standard',
    description: 'Configuración estándar para temporada de verano en Costa Esmeralda',
    rules: [
      // Fiestas (23/12 - 02/01) - Prioridad más alta
      {
        name: 'Fiestas',
        category: 'muy_alta',
        price_per_night: Math.round(basePrice * 1.8),
        start_date: `${year}-12-23`,
        end_date: `${year + 1}-01-02`,
        applies_to_days: [],
        min_nights: 7,
        priority: 90,
        active: true,
      },
      // Enero completo
      {
        name: 'Enero - Temporada Alta',
        category: 'alta',
        price_per_night: Math.round(basePrice * 1.5),
        start_date: `${year}-01-03`,
        end_date: `${year}-01-31`,
        applies_to_days: [],
        min_nights: 3,
        priority: 50,
        active: true,
      },
      // Feb 1-15
      {
        name: 'Febrero 1ra quincena',
        category: 'alta',
        price_per_night: Math.round(basePrice * 1.3),
        start_date: `${year}-02-01`,
        end_date: `${year}-02-15`,
        applies_to_days: [],
        min_nights: 2,
        priority: 50,
        active: true,
      },
      // Feb 16-28
      {
        name: 'Febrero 2da quincena',
        category: 'media',
        price_per_night: Math.round(basePrice * 1.1),
        start_date: `${year}-02-16`,
        end_date: `${year}-02-28`,
        applies_to_days: [],
        min_nights: 2,
        priority: 50,
        active: true,
      },
      // Semana Santa
      {
        name: 'Semana Santa',
        category: 'alta',
        price_per_night: Math.round(basePrice * 1.3),
        start_date: formatDate(holyWeek.start),
        end_date: formatDate(holyWeek.end),
        applies_to_days: [],
        min_nights: 3,
        priority: 80,
        active: true,
      },
      // Carnaval
      {
        name: 'Carnaval',
        category: 'alta',
        price_per_night: Math.round(basePrice * 1.3),
        start_date: formatDate(carnival.start),
        end_date: formatDate(carnival.end),
        applies_to_days: [],
        min_nights: 2,
        priority: 80,
        active: true,
      },
      // Fines de semana fuera de temporada (alta prioridad para fds)
      {
        name: 'Fds largo fuera temporada',
        category: 'media',
        price_per_night: Math.round(basePrice * 1.0),
        start_date: `${year}-03-01`,
        end_date: `${year}-12-22`,
        applies_to_days: ['vie', 'sab', 'dom'],
        min_nights: 2,
        priority: 70,
        active: true,
      },
      // Base resto del año
      {
        name: 'Temporada Baja',
        category: 'baja',
        price_per_night: Math.round(basePrice * 0.8),
        start_date: `${year}-03-01`,
        end_date: `${year}-12-22`,
        applies_to_days: [],
        min_nights: 1,
        priority: 40,
        active: true,
      },
    ],
  }
}

export function generateEmptyPreset(): PresetTemplate {
  return {
    name: 'Configuración vacía',
    description: 'Empezar desde cero sin reglas predefinidas',
    rules: [],
  }
}
