'use client'

// Página que recibe el huésped por WhatsApp para cargar a sus acompañantes
// (nombre, apellido, edad y DNI), que se piden para la autorización del barrio.
// Solo lee y guarda la reserva de ese link, a través de dos funciones de la base.

import '../../publica.css'
import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Persona { nombre: string; apellido: string; edad: string; documento: string }
interface Datos { casa: string; lote: string | null; fecha_inicio: string; fecha_fin: string; cantidad_personas: number | null; titular: string; acompanantes: Persona[] }

const vacia = (): Persona => ({ nombre: '', apellido: '', edad: '', documento: '' })
const dmy = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

export default function CargaHuespedes({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [datos, setDatos] = useState<Datos | null>(null)
  const [lista, setLista] = useState<Persona[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'invalido' | 'guardando' | 'guardado' | 'error'>('cargando')

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase.rpc('datos_link_huespedes', { p_token: token })
      if (error || !data) { setEstado('invalido'); return }
      const d = data as Datos
      setDatos(d)
      // Una fila por acompañante esperado (las personas de la reserva menos el titular)
      const esperados = Math.max(1, (d.cantidad_personas || 1) - 1)
      const previos = (d.acompanantes || []).map(a => ({ ...vacia(), ...a, edad: String(a.edad ?? '') }))
      setLista([...previos, ...Array.from({ length: Math.max(0, esperados - previos.length) }, vacia)])
      setEstado('listo')
    }
    cargar()
  }, [token])

  const cambiar = (i: number, campo: keyof Persona, valor: string) =>
    setLista(l => l.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setEstado('guardando')
    const { data, error } = await supabase.rpc('guardar_huespedes', { p_token: token, p_lista: lista })
    setEstado(error || !data ? 'error' : 'guardado')
  }

  const campo = { border: '1px solid var(--linea)', background: '#fff', padding: '10px 12px', font: 'inherit', width: '100%', minWidth: 0 } as const

  return (
    <div className="pub" style={{ minHeight: '100vh' }}>
      <header><div className="wrap"><span className="marca">Alquileres Costa Esmeralda<small>Datos para el ingreso al barrio</small></span></div></header>
      <main className="wrap" style={{ maxWidth: 760, padding: '32px 18px 60px' }}>
        {estado === 'cargando' && <p>Cargando…</p>}
        {estado === 'invalido' && <p>Este link no es válido o la reserva ya no está activa. Escribinos por WhatsApp y te mandamos uno nuevo.</p>}
        {datos && estado !== 'invalido' && (
          <>
            <div className="over">Tu reserva</div>
            <h1 style={{ fontSize: 34, margin: '8px 0 6px' }}>{datos.titular ? `¡Hola, ${datos.titular}!` : '¡Hola!'}</h1>
            <p style={{ color: 'var(--tx2)', marginBottom: 6 }}>
              {datos.casa}{datos.lote ? ` · Lote ${datos.lote}` : ''} · del {dmy(datos.fecha_inicio)} al {dmy(datos.fecha_fin)}
            </p>
            <p style={{ color: 'var(--tx2)', marginBottom: 22 }}>
              Para autorizar el ingreso al barrio necesitamos los datos de quienes te acompañan. Tus datos como titular ya los tenemos.
            </p>

            {estado === 'guardado' ? (
              <div style={{ background: '#fff', border: '1px solid var(--linea)', padding: 22 }}>
                <h2 style={{ fontSize: 26, marginBottom: 6 }}>¡Listo, gracias!</h2>
                <p style={{ color: 'var(--tx2)' }}>Recibimos los datos de {lista.filter(p => p.nombre.trim() || p.apellido.trim()).length} acompañante(s). Si algo cambia, podés volver a este mismo link y corregirlo.</p>
                <button type="button" className="cta2" style={{ marginTop: 16, background: 'none', cursor: 'pointer' }} onClick={() => setEstado('listo')}>Corregir datos</button>
              </div>
            ) : (
              <form onSubmit={guardar}>
                {lista.map((p, i) => (
                  <fieldset key={i} style={{ border: '1px solid var(--linea)', background: '#fff', padding: 14, margin: '0 0 12px' }}>
                    <legend style={{ padding: '0 6px', fontSize: 12, color: 'var(--tx2)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Acompañante {i + 1}</legend>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                      <input style={campo} placeholder="Nombre" value={p.nombre} onChange={e => cambiar(i, 'nombre', e.target.value)} autoComplete="off" />
                      <input style={campo} placeholder="Apellido" value={p.apellido} onChange={e => cambiar(i, 'apellido', e.target.value)} autoComplete="off" />
                      <input style={campo} placeholder="Edad" inputMode="numeric" value={p.edad} onChange={e => cambiar(i, 'edad', e.target.value.replace(/\D/g, '').slice(0, 3))} />
                      <input style={campo} placeholder="DNI" inputMode="numeric" value={p.documento} onChange={e => cambiar(i, 'documento', e.target.value.replace(/[^\dA-Za-z]/g, '').slice(0, 15))} />
                    </div>
                    {lista.length > 1 && (
                      <button type="button" onClick={() => setLista(l => l.filter((_, j) => j !== i))}
                        style={{ marginTop: 8, border: 0, background: 'none', color: '#a33', cursor: 'pointer', fontSize: 13 }}>Quitar</button>
                    )}
                  </fieldset>
                ))}
                {lista.length < 20 && (
                  <button type="button" className="cta2" style={{ background: 'none', cursor: 'pointer', marginBottom: 18 }} onClick={() => setLista(l => [...l, vacia()])}>+ Agregar acompañante</button>
                )}
                {estado === 'error' && <p style={{ color: '#a33', marginBottom: 10 }}>No se pudo guardar. Probá de nuevo en un momento.</p>}
                <div><button type="submit" className="cta" style={{ border: 0, cursor: 'pointer' }} disabled={estado === 'guardando'}>{estado === 'guardando' ? 'Guardando…' : 'Enviar datos'}</button></div>
                <p style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 14 }}>Los datos se usan solo para tramitar la autorización de ingreso al barrio.</p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}
