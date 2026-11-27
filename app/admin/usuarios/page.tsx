'use client'

// Usuarios (solo super admin): invitar dueños y elegir qué secciones puede usar
// cada uno. Cada dueño ve solo sus casas; la base controla lo mismo que se
// tilda acá (sql/27), así que no alcanza con esconder el menú.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui'
import { PERMISOS, ATAJOS, type Permiso } from '@/lib/permisos'
import { useAcceso } from '@/lib/acceso'

interface Perfil {
  id: string
  email: string
  nombre: string | null
  is_admin: boolean
  activo: boolean | null
  autorizado: boolean | null
  permisos: string[] | null
  created_at: string
}
interface Resumen { id: string; casas: number; ultimo_ingreso: string | null; invitado: string | null; confirmado: boolean }

const dmy = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')

// Llama a una ruta del servidor con la sesión del admin
async function llamar(ruta: string, cuerpo: object) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(cuerpo),
  })
  return r.json() as Promise<{ error?: string; link?: string; ok?: boolean }>
}

export default function UsuariosPage() {
  const { esAdmin } = useAcceso()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [resumen, setResumen] = useState<Record<string, Resumen>>({})
  const [yo, setYo] = useState<string | null>(null)
  const [elegido, setElegido] = useState<string | 'nuevo' | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', permisos: [] as string[] })
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string; link?: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    setYo(user?.id || null)
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from('profiles').select('id, email, nombre, is_admin, activo, autorizado, permisos, created_at').order('created_at'),
      supabase.rpc('resumen_usuarios'),
    ])
    setPerfiles((ps || []) as Perfil[])
    setResumen(Object.fromEntries(((rs || []) as Resumen[]).map(r => [r.id, r])))
  }
  useEffect(() => { if (esAdmin) cargar() }, [esAdmin])

  const actual = perfiles.find(p => p.id === elegido)

  function abrir(p: Perfil | 'nuevo') {
    setAviso(null)
    if (p === 'nuevo') { setElegido('nuevo'); setForm({ nombre: '', email: '', permisos: ['casas', 'precios'] }); return }
    setElegido(p.id)
    setForm({ nombre: p.nombre || '', email: p.email, permisos: p.permisos || [] })
  }

  const tildar = (k: Permiso) =>
    setForm(f => ({ ...f, permisos: f.permisos.includes(k) ? f.permisos.filter(x => x !== k) : [...f.permisos, k] }))

  async function guardar() {
    setGuardando(true); setAviso(null)
    if (elegido === 'nuevo') {
      const r = await llamar('/api/admin/invitar', form)
      if (r.error) setAviso({ tipo: 'error', texto: r.error })
      else { setAviso({ tipo: 'ok', texto: `Listo: le mandamos un mail a ${form.email} para que cree su contraseña.` }); setElegido(null); await cargar() }
    } else if (actual) {
      const { error } = await supabase.from('profiles').update({ nombre: form.nombre || null, permisos: form.permisos }).eq('id', actual.id)
      setAviso(error ? { tipo: 'error', texto: 'No se pudo guardar: ' + error.message } : { tipo: 'ok', texto: 'Permisos guardados.' })
      if (!error) await cargar()
    }
    setGuardando(false)
  }

  async function linkInvitacion() {
    if (!actual && elegido !== 'nuevo') return
    setGuardando(true); setAviso(null)
    const r = await llamar('/api/admin/invitar', { ...form, soloLink: true, reenviar: elegido !== 'nuevo' })
    if (r.error || !r.link) setAviso({ tipo: 'error', texto: r.error || 'No se pudo generar el link' })
    else {
      await navigator.clipboard?.writeText(r.link).catch(() => {})
      setAviso({ tipo: 'ok', texto: 'Link copiado: pegáselo por WhatsApp. Sirve una sola vez.', link: r.link })
      if (elegido === 'nuevo') await cargar()
    }
    setGuardando(false)
  }

  async function cambiarActivo() {
    if (!actual) return
    const nuevo = actual.activo === false
    const { error } = await supabase.from('profiles').update({ activo: nuevo }).eq('id', actual.id)
    setAviso(error ? { tipo: 'error', texto: error.message } : { tipo: 'ok', texto: nuevo ? 'Usuario activado.' : 'Usuario desactivado: ya no puede entrar.' })
    await cargar()
  }

  async function borrar() {
    if (!actual || !confirm(`¿Borrar la cuenta de ${actual.email}? No se puede deshacer.`)) return
    const r = await llamar('/api/admin/delete-user', { userId: actual.id })
    if (r.error) setAviso({ tipo: 'error', texto: r.error })
    else { setElegido(null); setAviso({ tipo: 'ok', texto: 'Cuenta borrada.' }); await cargar() }
  }

  if (!esAdmin) return <p className="text-costa-gris">Solo el administrador puede ver esta sección.</p>

  const estado = (p: Perfil) => {
    if (p.is_admin) return { t: 'Super admin', c: 'bg-costa-esmeralda text-white' }
    if (p.activo === false) return { t: 'Desactivado', c: 'bg-red-50 text-red-700' }
    if (!resumen[p.id]?.confirmado) return { t: 'Sin aceptar', c: 'bg-amber-50 text-amber-700' }
    return { t: 'Activo', c: 'bg-costa-arena text-costa-gris' }
  }
  const detalle = (p: Perfil) => {
    const r = resumen[p.id]
    const casas = r ? `${r.casas} casa${r.casas === 1 ? '' : 's'}` : ''
    if (p.is_admin) return [casas, 'todo'].filter(Boolean).join(' · ')
    if (r && !r.confirmado) return `invitado el ${dmy(r.invitado || p.created_at)}`
    return [casas, r?.ultimo_ingreso ? `entró el ${dmy(r.ultimo_ingreso)}` : ''].filter(Boolean).join(' · ')
  }

  const editable = elegido === 'nuevo' || (actual && !actual.is_admin)

  return (
    <div>
      <PageHeader title="Usuarios" description="Solo lo ves vos. Cada dueño ve únicamente sus casas y las secciones que le habilites.">
        <Button onClick={() => abrir('nuevo')}>+ Invitar usuario</Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr] items-start">
        {/* Lista */}
        <div className="rounded-xl border border-costa-borde bg-costa-superficie overflow-hidden">
          {perfiles.map(p => {
            const e = estado(p)
            return (
              <button key={p.id} type="button" onClick={() => abrir(p)}
                className={`flex w-full items-center justify-between gap-3 border-b border-costa-borde/60 px-4 py-3 text-left last:border-0 ${elegido === p.id ? 'bg-costa-esmeralda-suave' : 'hover:bg-costa-arena/50'}`}>
                <span className="min-w-0">
                  <span className="block font-bold text-costa-navy truncate">{p.nombre || p.email}{p.id === yo ? ' (vos)' : ''}</span>
                  <span className="block text-xs text-costa-gris truncate">{p.nombre ? `${p.email} · ` : ''}{detalle(p)}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${e.c}`}>{e.t}</span>
              </button>
            )
          })}
        </div>

        {/* Detalle / invitar */}
        <div className="rounded-xl border border-costa-borde bg-costa-superficie p-5">
          {aviso && (
            <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${aviso.tipo === 'ok' ? 'bg-costa-esmeralda-suave text-costa-esmeralda' : 'bg-red-50 text-red-700'}`}>
              {aviso.texto}
              {aviso.link && <span className="mt-1 block break-all text-xs text-costa-gris">{aviso.link}</span>}
            </div>
          )}

          {!elegido && <p className="text-sm text-costa-gris">Elegí un usuario de la lista o tocá <b>Invitar usuario</b>.</p>}

          {elegido && (actual?.is_admin ? (
            <div>
              <h2 className="text-lg font-bold text-costa-esmeralda">{actual.nombre || actual.email}</h2>
              <p className="mt-1 text-sm text-costa-gris">Super admin: tiene todas las secciones y es el único que ve Usuarios.</p>
            </div>
          ) : editable && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-costa-esmeralda">{elegido === 'nuevo' ? 'Invitar usuario' : (actual?.nombre || actual?.email)}</h2>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-costa-navy">Nombre</span>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    className="w-full rounded-lg border border-costa-borde bg-white px-3 py-2" placeholder="Juan Pérez" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-costa-navy">Email</span>
                  <input type="email" value={form.email} disabled={elegido !== 'nuevo'} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-costa-borde bg-white px-3 py-2 disabled:bg-costa-arena/40 disabled:text-costa-gris" placeholder="dueno@mail.com" />
                </label>
              </div>

              <span className="mb-1 block text-sm font-semibold text-costa-navy">Qué puede usar</span>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {ATAJOS.map(a => (
                  <button key={a.nombre} type="button" onClick={() => setForm({ ...form, permisos: [...a.permisos] })}
                    className="rounded-full border border-costa-borde bg-white px-3 py-1 text-xs font-semibold text-costa-gris hover:text-costa-esmeralda">{a.nombre}</button>
                ))}
              </div>
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {PERMISOS.map(p => {
                  const on = form.permisos.includes(p.clave)
                  return (
                    <label key={p.clave} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 ${on ? 'border-costa-esmeralda bg-costa-esmeralda-suave/50' : 'border-costa-borde bg-white'}`}>
                      <input type="checkbox" checked={on} onChange={() => tildar(p.clave)} className="mt-0.5 h-4 w-4 accent-[#14504c]" />
                      <span>
                        <span className="block text-sm font-bold text-costa-navy">{p.nombre}</span>
                        <span className="block text-xs text-costa-gris">{p.detalle}</span>
                      </span>
                    </label>
                  )
                })}
              </div>

              <p className="mb-4 rounded-lg border border-costa-borde bg-costa-arena/40 px-3 py-2 text-xs text-costa-gris">
                {form.permisos.length
                  ? <>Va a ver en el menú solo <b>{PERMISOS.filter(p => form.permisos.includes(p.clave)).map(p => p.nombre).join(', ')}</b> (más Info útil y Mis datos). Lo que no está tildado tampoco lo puede leer desde la base, aunque escriba la dirección a mano.</>
                  : 'Sin secciones tildadas solo puede entrar a Mis datos e Info útil.'}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-costa-borde pt-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  {actual && (
                    <>
                      <button type="button" onClick={cambiarActivo} className="font-semibold text-red-700 hover:underline">
                        {actual.activo === false ? 'Activar usuario' : 'Desactivar usuario'}
                      </button>
                      {!resumen[actual.id]?.casas && <button type="button" onClick={borrar} className="text-costa-gris hover:underline">Borrar cuenta</button>}
                    </>
                  )}
                  {(elegido === 'nuevo' || (actual && !resumen[actual.id]?.confirmado)) && (
                    <button type="button" onClick={linkInvitacion} disabled={guardando || !form.email} className="font-semibold text-costa-esmeralda hover:underline">
                      Copiar link para WhatsApp
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setElegido(null); setAviso(null) }}>Cancelar</Button>
                  <Button onClick={guardar} disabled={guardando || (elegido === 'nuevo' && !form.email)}>
                    {guardando ? 'Guardando…' : elegido === 'nuevo' ? 'Enviar invitación' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
