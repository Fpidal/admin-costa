import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { IrALaCasa } from './IrALaCasa'

// Link para compartir una casa por WhatsApp. WhatsApp lee estas etiquetas
// (título, descripción y primera foto) para armar la vista previa; la persona
// que toca el link termina en la página pública con la ficha de la casa abierta.

type Props = { params: Promise<{ id: string }> }

async function buscarCasa(id: string) {
  const { data } = await supabase
    .from('propiedades')
    .select('id, nombre, lote, capacidad, habitaciones, banos, direccion, referencia, imagenes, imagen_url, publicada')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.publicada === false) return null
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const casa = await buscarCasa(id)
  if (!casa) return { title: 'Alquileres en Costa Esmeralda' }
  const titulo = `${casa.nombre}${casa.lote ? ` · Lote ${casa.lote}` : ''} · Costa Esmeralda`
  const descripcion = `${casa.capacidad} personas · ${casa.habitaciones} dormitorios · ${casa.banos} baños. Mirá fotos, disponibilidad y consultá directo con el dueño.`
  const fotos: string[] = Array.isArray(casa.imagenes) && casa.imagenes.length ? casa.imagenes : casa.imagen_url ? [casa.imagen_url] : []
  return {
    title: titulo,
    description: descripcion,
    openGraph: { title: titulo, description: descripcion, type: 'website', images: fotos.slice(0, 1) },
  }
}

export default async function CasaCompartida({ params }: Props) {
  const { id } = await params
  return <IrALaCasa id={id} />
}
