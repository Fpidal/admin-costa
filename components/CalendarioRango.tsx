'use client'

// Calendario de llegada y salida para la web pública (reemplaza al <input type="date">).
// Se toca Llegada, se elige el día y queda abierto para elegir la Salida en el
// mismo mes de la llegada. En el celular sale desde abajo; en la compu, debajo del buscador.

import { useEffect, useRef, useState } from 'react'

type Modo = 'llegada' | 'salida'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const desdeISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const dmy = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
const noches = (a: string, b: string) => Math.round((desdeISO(b).getTime() - desdeISO(a).getTime()) / 86400000)

export default function CalendarioRango({ llegada, salida, onCambio, en = false }: {
  llegada: string
  salida: string
  onCambio: (llegada: string, salida: string) => void
  en?: boolean
}) {
  const [abierto, setAbierto] = useState<Modo | null>(null)
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [hover, setHover] = useState('')
  const caja = useRef<HTMLDivElement>(null)
  const hoy = iso(new Date())

  const T = en
    ? { lle: 'Check-in', sal: 'Check-out', elegir: 'Choose date', eligeLle: 'Choose your check-in day', eligeSal: 'Now choose your check-out day', listo: 'Done', borrar: 'Clear', n: (k: number) => `${k} night${k !== 1 ? 's' : ''}`, dias: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] }
    : { lle: 'Llegada', sal: 'Salida', elegir: 'Elegir fecha', eligeLle: 'Elegí el día de llegada', eligeSal: 'Ahora elegí el día de salida', listo: 'Listo', borrar: 'Borrar', n: (k: number) => `${k} noche${k !== 1 ? 's' : ''}`, dias: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] }

  function abrir(modo: Modo) {
    // Salida abre en el mes de la llegada, no en el de hoy
    const base = modo === 'salida' ? (salida || llegada) : llegada
    const d = base ? desdeISO(base) : new Date()
    setMes(new Date(d.getFullYear(), d.getMonth(), 1))
    setAbierto(modo)
  }

  // Cerrar tocando afuera (en la compu) o con Escape
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (window.matchMedia('(max-width:760px)').matches) return
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(null)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(null) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  function elegir(dia: string) {
    if (abierto === 'llegada' || !llegada || dia <= llegada) {
      onCambio(dia, salida && salida > dia ? salida : '')
      setAbierto('salida')
      return
    }
    onCambio(llegada, dia)
    setAbierto(null)
  }

  // Grilla del mes empezando en lunes
  const primero = (mes.getDay() + 6) % 7
  const enMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const celdas: (string | null)[] = [...Array(primero).fill(null), ...Array.from({ length: enMes }, (_, i) => iso(new Date(mes.getFullYear(), mes.getMonth(), i + 1)))]
  const esMesActual = mes.getFullYear() === new Date().getFullYear() && mes.getMonth() === new Date().getMonth()
  const tituloMes = mes.toLocaleDateString(en ? 'en-US' : 'es-AR', { month: 'long', year: 'numeric' })
  const finRango = salida || (abierto === 'salida' && llegada && hover > llegada ? hover : '')

  return (
    <div className="cal-campos" ref={caja}>
      <button type="button" className={`c cal-campo ${abierto === 'llegada' ? 'on' : ''}`} onClick={() => abrir('llegada')}>
        <span className="lbl">{T.lle}</span>
        <span className={`val ${llegada ? '' : 'sin'}`}>{llegada ? dmy(llegada) : T.elegir}</span>
      </button>
      <button type="button" className={`c cal-campo ${abierto === 'salida' ? 'on' : ''}`} onClick={() => abrir('salida')}>
        <span className="lbl">{T.sal}</span>
        <span className={`val ${salida ? '' : 'sin'}`}>{salida ? dmy(salida) : T.elegir}</span>
      </button>

      {abierto && <>
        <div className="cal-fondo" onClick={() => setAbierto(null)} />
        <div className="cal" role="dialog" aria-label={abierto === 'llegada' ? T.eligeLle : T.eligeSal}>
          <p className="cal-guia">{abierto === 'llegada' ? T.eligeLle : T.eligeSal}</p>
          <div className="cal-cab">
            <button type="button" aria-label="Mes anterior" disabled={esMesActual} onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</button>
            <b>{tituloMes}</b>
            <button type="button" aria-label="Mes siguiente" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="cal-grilla" onMouseLeave={() => setHover('')}>
            {T.dias.map(d => <span key={d} className="cal-dsem">{d}</span>)}
            {celdas.map((d, i) => {
              if (!d) return <span key={`v${i}`} />
              const pasado = d < hoy
              const ini = d === llegada
              const fin = d === finRango
              const medio = !!llegada && !!finRango && d > llegada && d < finRango
              return (
                <button key={d} type="button" disabled={pasado}
                  className={`cal-dia ${ini ? 'ini' : ''} ${fin ? 'fin' : ''} ${medio ? 'medio' : ''} ${ini && finRango ? 'con-rango' : ''} ${d === hoy ? 'hoy' : ''}`}
                  onMouseEnter={() => setHover(d)} onClick={() => elegir(d)}>
                  <span>{Number(d.slice(8))}</span>
                </button>
              )
            })}
          </div>
          <div className="cal-pie">
            <span>{llegada && salida ? T.n(noches(llegada, salida)) : llegada ? dmy(llegada) + ' →' : ''}</span>
            <div>
              {(llegada || salida) && <button type="button" className="borrar" onClick={() => { onCambio('', ''); setAbierto('llegada') }}>{T.borrar}</button>}
              <button type="button" className="listo" onClick={() => setAbierto(null)}>{T.listo}</button>
            </div>
          </div>
        </div>
      </>}
    </div>
  )
}
