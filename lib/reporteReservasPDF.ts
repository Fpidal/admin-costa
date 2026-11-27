// Reporte general de reservas: A4 apaisado, una fila por reserva con fechas de
// ingreso y salida, total, cobrado y saldo. Si no entra en una hoja, sigue en
// la siguiente repitiendo el encabezado de la tabla.

import { jsPDF } from 'jspdf'
import { montosReserva, nochesEntre, sumarMontos, monedasCon, type PorMoneda } from './resumenReservas'
import type { ServicioExtra } from './serviciosReserva'
import { generarFeriadosAnio } from './calendarioArgentina'
import { colorCasa } from './coloresCasas'

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
const NAVY: RGB = [20, 80, 76] // esmeralda del panel
const GRIS: RGB = [107, 116, 113]
const OLIVO: RGB = [92, 107, 74]
const CORAL: RGB = [201, 104, 74]
const ROJO: RGB = [220, 38, 38]
const BEIGE: RGB = [244, 238, 230]
const BEIGE_CLARO: RGB = [251, 248, 243]

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
  /** Meses del calendario (YYYY-MM-DD del primer y último día); si falta, los de las reservas */
  calendario?: { desde: string; hasta: string }
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
    noc: { x: M + 127, align: 'center' as const, t: 'NOCHES' },
    per: { x: M + 138, align: 'center' as const, t: 'PERS.' },
    pxn: { x: M + 159, align: 'right' as const, t: 'POR NOCHE' },
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
    texto(r.precio_noche ? importe(Number(r.precio_noche), r.moneda || 'USD') : '—', col.pxn.x, y1, { align: 'right', color: r.precio_noche ? NAVY : GRIS })

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

  // ---------- Calendario de los meses del reporte ----------
  // Si son hasta 3 meses y queda lugar debajo de los totales, va en la misma hoja
  const meses = mesesDelCalendario(reservas, opts.calendario)
  if (meses.length) {
    const yLibre = y + altoTot + 6
    const espacio = H - 14 - yLibre
    const altoCelda = (espacio - 16 - 9) / 6.2
    if (meses.length <= 3 && altoCelda >= 4.5) dibujarCalendarios(doc, reservas, meses, yLibre, espacio)
    else dibujarCalendarios(doc, reservas, meses, null, 0, `${opts.casas} · ${opts.periodo}`)
  }

  // ---------- Pie en cada hoja ----------
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRIS)
    doc.text('Total = alquiler + servicios con cargo. Cobrado no incluye el depósito en garantía; las devoluciones de seña restan.', M, H - 7)
    doc.text(paginas > 1 ? `Costa Directo · Hoja ${p} de ${paginas}` : 'Costa Directo', W - M, H - 7, { align: 'right' })
  }

  const nombreArchivo = `Reporte_reservas_${opts.periodo.replace(/[^\w]+/g, '_')}_${hoy.replace(/\//g, '-')}.pdf`
  doc.save(nombreArchivo)
}

const MESES_PDF = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const hexRGB = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

type Mes = { y: number; m: number }

/** Meses a mostrar: los del rango pedido o, si no hay, los que abarcan las reservas (máximo 12) */
function mesesDelCalendario(reservas: ReservaReporte[], rango?: { desde: string; hasta: string }): Mes[] {
  const activas = reservas.filter(r => r.estado !== 'cancelada')
  let desde = rango?.desde, hasta = rango?.hasta
  if (!desde || !hasta) {
    if (!activas.length) return []
    desde = activas.map(r => r.fecha_inicio).sort()[0]
    // la última noche es el día anterior a la salida
    const salida = activas.map(r => r.fecha_fin).sort().reverse()[0]
    const d = new Date(`${salida}T12:00:00`); d.setDate(d.getDate() - 1)
    hasta = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const meses: Mes[] = []
  let y = Number(desde.slice(0, 4)), m = Number(desde.slice(5, 7)) - 1
  const finY = Number(hasta.slice(0, 4)), finM = Number(hasta.slice(5, 7)) - 1
  while ((y < finY || (y === finY && m <= finM)) && meses.length < 12) {
    meses.push({ y, m })
    m++; if (m > 11) { m = 0; y++ }
  }
  return meses
}

/**
 * Calendarios con los días pintados por casa. Con `yInicio` se dibujan en la
 * hoja actual a partir de esa altura; si no, en una hoja nueva con encabezado.
 */
function dibujarCalendarios(doc: jsPDF, reservas: ReservaReporte[], meses: Mes[], yInicio: number | null, alto: number, subtitulo = '') {
  const activas = reservas.filter(r => r.estado !== 'cancelada')
  const W = doc.internal.pageSize.getWidth()
  const M = 12
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

  const casas = [...new Set(activas.map(r => r.propiedades?.nombre || 'Casa'))]
  const color = Object.fromEntries(casas.map((c, i) => [c, hexRGB(colorCasa(c, i))]))
  const feriados = new Set<string>()
  new Set(meses.map(x => x.y)).forEach(a => generarFeriadosAnio(a).forEach(f => feriados.add(f.fecha)))

  let ly: number
  let lx = M
  if (yInicio === null) {
    doc.addPage()
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Calendario de ocupación', M, 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(subtitulo, W - M, 11, { align: 'right' })
    ly = 25
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.text('Calendario de ocupación', M, yInicio + 4)
    lx = M + doc.getTextWidth('Calendario de ocupación') + 10
    ly = yInicio + 4
  }

  // Leyenda
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  casas.forEach(c => {
    doc.setFillColor(...color[c]); doc.roundedRect(lx, ly - 2.6, 4, 3, 0.6, 0.6, 'F')
    doc.setTextColor(...NAVY); doc.text(c, lx + 5.5, ly); lx += doc.getTextWidth(c) + 11
  })
  doc.setDrawColor(200, 195, 188); doc.setFillColor(255, 255, 255); doc.roundedRect(lx, ly - 2.6, 4, 3, 0.6, 0.6, 'FD')
  doc.setFillColor(140, 140, 140); doc.rect(lx + 0.6, ly - 0.2, 2.8, 0.6, 'F')
  doc.setTextColor(...NAVY); doc.text('Sin confirmar (barra del color de la casa)', lx + 5.5, ly)
  lx += doc.getTextWidth('Sin confirmar (barra del color de la casa)') + 11
  doc.setFillColor(233, 185, 143); doc.rect(lx, ly - 2.2, 4, 0.8, 'F'); doc.text('Feriado', lx + 5.5, ly)

  // Grilla de meses: 3 por fila hasta 6 meses; 4 por fila si son más
  const porFila = meses.length <= 6 ? 3 : 4
  const filas = Math.ceil(meses.length / porFila)
  const gapX = 8, gapY = 6
  const top = yInicio === null ? 31 : yInicio + 9
  const anchoMes = (W - 2 * M - gapX * (porFila - 1)) / porFila
  const altoDisp = yInicio === null ? doc.internal.pageSize.getHeight() - top - 14 : alto - 9
  // Las casillas ocupan todo el ancho del mes; el alto se ajusta a lo que queda
  // en la hoja (sin pasar de un poco más que cuadradas)
  const celdaW = anchoMes / 7
  const celdaH = Math.min(celdaW * 0.75, (altoDisp / filas - gapY - 9) / 6.2)
  const anchoGrid = celdaW * 7

  meses.forEach(({ y: yy, m: mm }, idx) => {
    const fx = idx % porFila, fy = Math.floor(idx / porFila)
    const x0 = M + fx * (anchoMes + gapX)
    const y0 = top + fy * (celdaH * 6.2 + 9 + gapY)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...NAVY)
    doc.text(`${MESES_PDF[mm]} ${yy}`, x0 + anchoGrid / 2, y0 + 3.5, { align: 'center' })
    doc.setFontSize(6.5); doc.setTextColor(...GRIS)
    ;['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, i) => doc.text(d, x0 + celdaW * i + celdaW / 2, y0 + 7.5, { align: 'center' }))
    const off = (new Date(yy, mm, 1).getDay() + 6) % 7
    const dias = new Date(yy, mm + 1, 0).getDate()
    for (let d = 1; d <= dias; d++) {
      const pos = off + d - 1
      const cx = x0 + (pos % 7) * celdaW, cy = y0 + 9 + Math.floor(pos / 7) * celdaH
      const f = iso(yy, mm, d)
      const en = activas.filter(r => f >= r.fecha_inicio && f < r.fecha_fin)
      const conf = en.filter(r => r.estado !== 'pendiente')
      const pend = en.filter(r => r.estado === 'pendiente')
      const sw = celdaW - 0.8, sh = celdaH - 0.8
      const c1 = conf[0] && color[conf[0].propiedades?.nombre || 'Casa']
      const c2 = conf[1] && color[conf[1].propiedades?.nombre || 'Casa']
      if (c1 && c2) {
        doc.setFillColor(...c1); doc.triangle(cx, cy, cx + sw, cy, cx, cy + sh, 'F')
        doc.setFillColor(...c2); doc.triangle(cx + sw, cy, cx + sw, cy + sh, cx, cy + sh, 'F')
      } else if (c1) {
        doc.setFillColor(...c1); doc.roundedRect(cx, cy, sw, sh, 0.8, 0.8, 'F')
      } else {
        doc.setDrawColor(232, 223, 210); doc.setFillColor(255, 255, 255); doc.roundedRect(cx, cy, sw, sh, 0.8, 0.8, 'FD')
      }
      if (feriados.has(f)) { doc.setFillColor(233, 185, 143); doc.rect(cx + 0.6, cy + 0.4, sw - 1.2, 0.6, 'F') }
      pend.slice(0, 2).forEach((r, k) => {
        doc.setFillColor(...color[r.propiedades?.nombre || 'Casa'])
        const w = pend.length > 1 ? (sw - 1.6) / 2 : sw - 1.6
        doc.rect(cx + 0.8 + k * w, cy + sh - 1.6, w, 0.9, 'F')
      })
      doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(8.5, celdaH * 1.6))
      if (c1) doc.setTextColor(255, 255, 255)
      else if (feriados.has(f)) doc.setTextColor(138, 63, 18)
      else doc.setTextColor(...NAVY)
      doc.text(String(d), cx + sw / 2, cy + sh / 2 + 1, { align: 'center' })
    }
  })
}
