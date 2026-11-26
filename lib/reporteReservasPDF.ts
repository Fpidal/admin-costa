// Reporte general de reservas: A4 apaisado, una fila por reserva con fechas de
// ingreso y salida, total, cobrado y saldo. Si no entra en una hoja, sigue en
// la siguiente repitiendo el encabezado de la tabla.

import { jsPDF } from 'jspdf'
import { montosReserva, nochesEntre, sumarMontos, monedasCon, type PorMoneda } from './resumenReservas'
import type { ServicioExtra } from './serviciosReserva'

export interface ReservaReporte {
  id: number | string
  fecha_inicio: string
  fecha_fin: string
  horario_ingreso: string | null
  horario_salida: string | null
  cantidad_personas: number | null
  precio_noche: number | null
  moneda: string | null
  deposito: number | null
  estado: string
  ropa_blanca?: boolean | null
  monto_ropa_blanca?: number | null
  moneda_ropa_blanca?: string | null
  limpieza_final?: number | null
  moneda_limpieza?: string | null
  monto_lavadero?: number | null
  moneda_lavadero?: string | null
  servicios_extra?: ServicioExtra[] | null
  propiedades?: { nombre: string; lote: string | null }
  inquilinos?: { nombre: string; telefono?: string | null }
}

interface CobroReporte {
  reserva_id: number | string
  monto: number
  moneda: string
  concepto: string
  aplicar_a: string
}

type RGB = [number, number, number]
const NAVY: RGB = [30, 58, 95]
const GRIS: RGB = [107, 124, 147]
const OLIVO: RGB = [92, 107, 74]
const CORAL: RGB = [201, 104, 74]
const ROJO: RGB = [220, 38, 38]
const BEIGE: RGB = [245, 235, 224]
const BEIGE_CLARO: RGB = [250, 246, 241]

const PILL: Record<string, { fondo: RGB; texto: RGB }> = {
  confirmada: { fondo: [230, 236, 223], texto: OLIVO },
  pendiente: { fondo: [251, 230, 220], texto: CORAL },
  cerrada: { fondo: [230, 234, 240], texto: NAVY },
  cancelada: { fondo: [243, 217, 217], texto: [170, 51, 51] },
}

// DD/MM/YYYY con ceros, directo del 'YYYY-MM-DD' de la base
const fechaDMY = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

const importe = (v: number, moneda: string) =>
  `${moneda === 'USD' ? 'U$D' : '$'} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(v))}`

const lineas = (o: PorMoneda) => monedasCon(o).map(m => importe(o[m], m))

export function generarReporteReservasPDF(opts: {
  reservas: ReservaReporte[]
  cobros: CobroReporte[]
  casas: string
  periodo: string
}) {
  const reservas = [...opts.reservas].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
  const filas = reservas.map(r => ({ r, ...montosReserva(r, opts.cobros) }))
  // Los totales cuentan solo lo confirmado (y lo cerrado); las reservas
  // pendientes de confirmar se listan, pero su importe va aparte, en rojo
  const firmes = filas.filter(f => f.r.estado !== 'pendiente')
  const totales = {
    total: sumarMontos(firmes.map(f => f.total)),
    cobrado: sumarMontos(firmes.map(f => f.cobrado)),
    saldo: sumarMontos(firmes.map(f => f.saldo)),
  }
  const aConfirmar = sumarMontos(filas.filter(f => f.r.estado === 'pendiente').map(f => f.total))
  const notaAConfirmar = lineas(aConfirmar).length ? `+ ${lineas(aConfirmar).join(' + ')} a confirmar` : ''
  const totalNoches = reservas.reduce((acc, r) => acc + nochesEntre(r.fecha_inicio, r.fecha_fin), 0)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 12
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // ---------- Encabezado ----------
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Reporte de reservas', M, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`Costa Esmeralda · ${opts.casas} · ${opts.periodo}`, M, 20)
  doc.text(`${reservas.length} reserva${reservas.length !== 1 ? 's' : ''} · Generado el ${hoy}`, W - M, 20, { align: 'right' })

  // ---------- Recuadros ----------
  const kpis: { label: string; valores: string[]; nota: string; color: RGB; notaRoja?: boolean }[] = [
    notaAConfirmar
      ? { label: 'TOTAL RESERVADO', valores: lineas(totales.total), nota: notaAConfirmar, color: NAVY, notaRoja: true }
      : { label: 'TOTAL RESERVADO', valores: lineas(totales.total), nota: 'alquiler + servicios con cargo', color: NAVY },
    { label: 'COBRADO', valores: lineas(totales.cobrado), nota: 'sin contar depósitos en garantía', color: OLIVO },
    { label: 'PENDIENTE DE COBRO', valores: lineas(totales.saldo), nota: 'saldo a cobrar', color: CORAL },
    { label: 'RESERVAS', valores: [`${reservas.length}`], nota: `${totalNoches} noches`, color: NAVY },
  ]
  const gap = 4
  const kW = (W - 2 * M - gap * 3) / 4
  const maxLineas = Math.max(1, ...kpis.map(k => k.valores.length || 1))
  const kH = 14 + maxLineas * 5
  const kY = 31
  kpis.forEach((k, i) => {
    const x = M + i * (kW + gap)
    doc.setFillColor(...BEIGE_CLARO)
    doc.setDrawColor(...BEIGE)
    doc.roundedRect(x, kY, kW, kH, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRIS)
    doc.text(k.label, x + 4, kY + 5.5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...k.color)
    const vals = k.valores.length ? k.valores : ['—']
    vals.forEach((v, j) => doc.text(v, x + 4, kY + 11.5 + j * 5))
    doc.setFont('helvetica', k.notaRoja ? 'bold' : 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...(k.notaRoja ? ROJO : GRIS))
    doc.text(k.nota, x + 4, kY + 11.5 + vals.length * 5)
  })

  // ---------- Tabla ----------
  // x de cada columna; las de importes se alinean a la derecha en `x`
  const col = {
    n: { x: M + 3, align: 'center' as const, t: '#' },
    prop: { x: M + 7, align: 'left' as const, t: 'PROPIEDAD' },
    hue: { x: M + 38, align: 'left' as const, t: 'HUÉSPED' },
    ing: { x: M + 83, align: 'left' as const, t: 'INGRESO' },
    sal: { x: M + 104, align: 'left' as const, t: 'SALIDA' },
    noc: { x: M + 131, align: 'center' as const, t: 'NOCHES' },
    per: { x: M + 144, align: 'center' as const, t: 'PERS.' },
    tot: { x: M + 178, align: 'right' as const, t: 'TOTAL' },
    cob: { x: M + 204, align: 'right' as const, t: 'COBRADO' },
    sdo: { x: M + 229, align: 'right' as const, t: 'SALDO' },
    dep: { x: M + 250, align: 'right' as const, t: 'DEPÓSITO' },
    est: { x: M + 254, align: 'left' as const, t: 'ESTADO' },
  }
  const anchoHuesped = col.ing.x - col.hue.x - 2
  const LIMITE = H - 14

  const encabezadoTabla = (y: number) => {
    doc.setFillColor(...NAVY)
    doc.rect(M, y, W - 2 * M, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    for (const c of Object.values(col)) doc.text(c.t, c.x, y + 4.7, { align: c.align })
    return y + 7
  }

  let y = encabezadoTabla(kY + kH + 5)

  filas.forEach(({ r, total, cobrado, saldo, monedas }, i) => {
    const cerrada = r.estado === 'cerrada'
    const nLineas = Math.max(2, monedas.length)
    const alto = 2.5 + nLineas * 3.4
    if (y + alto > LIMITE) {
      doc.addPage()
      y = encabezadoTabla(M)
    }
    if (i % 2 === 1) {
      doc.setFillColor(...BEIGE_CLARO)
      doc.rect(M, y, W - 2 * M, alto, 'F')
    }
    doc.setDrawColor(...BEIGE)
    doc.line(M, y + alto, W - M, y + alto)

    const y1 = y + 4
    const y2 = y1 + 3.4
    const principal: RGB = cerrada ? GRIS : NAVY

    const texto = (t: string, x: number, yy: number, o: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: number; color?: RGB } = {}) => {
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal')
      doc.setFontSize(o.size ?? 7.5)
      doc.setTextColor(...(o.color ?? principal))
      doc.text(t, x, yy, { align: o.align ?? 'left' })
    }
    const chico = { size: 6.3, color: GRIS }

    texto(String(i + 1), col.n.x, y1, { align: 'center', color: GRIS })
    texto(r.propiedades?.nombre || '-', col.prop.x, y1, { bold: true })
    if (r.propiedades?.lote) texto(`Lote ${r.propiedades.lote}`, col.prop.x, y2, chico)

    const nombre = (doc.setFontSize(7.5), doc.splitTextToSize((r.inquilinos?.nombre || '-').trim(), anchoHuesped)[0] as string)
    texto(nombre, col.hue.x, y1)
    if (r.inquilinos?.telefono) texto(r.inquilinos.telefono.replace(/[^\d\s+-]/g, '').trim(), col.hue.x, y2, chico)

    texto(fechaDMY(r.fecha_inicio), col.ing.x, y1)
    texto(`${(r.horario_ingreso || '14:00').slice(0, 5)} hs`, col.ing.x, y2, chico)
    texto(fechaDMY(r.fecha_fin), col.sal.x, y1)
    texto(`${(r.horario_salida || '10:00').slice(0, 5)} hs`, col.sal.x, y2, chico)

    texto(String(nochesEntre(r.fecha_inicio, r.fecha_fin)), col.noc.x, y1, { align: 'center' })
    texto(String(r.cantidad_personas || 1), col.per.x, y1, { align: 'center' })

    const montos = (o: PorMoneda, x: number, color: RGB, bold = false) => {
      const ls = lineas(o)
      if (!ls.length) return texto('—', x, y1, { align: 'right', color: GRIS })
      ls.forEach((t, j) => texto(t, x, y1 + j * 3.4, { align: 'right', color, bold }))
    }
    const haySaldo = monedasCon(saldo).some(m => saldo[m] > 0)
    montos(total, col.tot.x, principal)
    montos(cobrado, col.cob.x, cerrada ? GRIS : OLIVO)
    montos(saldo, col.sdo.x, haySaldo ? CORAL : OLIVO, haySaldo)
    texto(r.deposito ? importe(r.deposito, 'USD') : '—', col.dep.x, y1, { align: 'right', size: 6.8, color: GRIS })

    const pill = PILL[r.estado] || PILL.cerrada
    const etiqueta = r.estado.charAt(0).toUpperCase() + r.estado.slice(1)
    doc.setFontSize(6.3)
    const pW = doc.getTextWidth(etiqueta) + 4
    doc.setFillColor(...pill.fondo)
    doc.roundedRect(col.est.x, y1 - 2.7, pW, 3.8, 1.9, 1.9, 'F')
    texto(etiqueta, col.est.x + 2, y1, { size: 6.3, color: pill.texto })

    y += alto
  })

  // ---------- Totales ----------
  const nTot = Math.max(1, lineas(totales.total).length, lineas(totales.cobrado).length, lineas(totales.saldo).length)
  const altoTot = 3 + nTot * 3.6
  if (y + altoTot > LIMITE) {
    doc.addPage()
    y = encabezadoTabla(M)
  }
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.line(M, y, W - M, y)
  doc.setLineWidth(0.2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...NAVY)
  doc.text(notaAConfirmar ? 'Totales (sin las pendientes de confirmar)' : 'Totales', M + 2, y + 4.5)
  const tot = (o: PorMoneda, x: number, color: RGB) =>
    lineas(o).forEach((t, j) => { doc.setTextColor(...color); doc.text(t, x, y + 4.5 + j * 3.6, { align: 'right' }) })
  tot(totales.total, col.tot.x, NAVY)
  tot(totales.cobrado, col.cob.x, OLIVO)
  tot(totales.saldo, col.sdo.x, CORAL)

  // ---------- Pie en cada hoja ----------
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRIS)
    doc.text('Total = alquiler + servicios con cargo. Cobrado no incluye el depósito en garantía; las devoluciones de seña restan.', M, H - 7)
    doc.text(paginas > 1 ? `Admin Costa · Hoja ${p} de ${paginas}` : 'Admin Costa', W - M, H - 7, { align: 'right' })
  }

  const nombreArchivo = `Reporte_reservas_${opts.periodo.replace(/[^\w]+/g, '_')}_${hoy.replace(/\//g, '-')}.pdf`
  doc.save(nombreArchivo)
}
