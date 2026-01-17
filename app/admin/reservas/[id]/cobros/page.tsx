'use client'

import { Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { CobrosContent } from '@/components/CobrosContent'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { demoReservas } from '@/lib/demoData'

function CobrosPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const reservaId = params.id as string

  const [reservaIds, setReservaIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchReservaIds() {
      if (isDemo) {
        setReservaIds(demoReservas.map(r => r.id))
        return
      }

      const { data } = await supabase
        .from('reservas')
        .select('id')
        .order('fecha_inicio', { ascending: false })

      if (data) {
        setReservaIds(data.map(r => String(r.id)))
      }
    }

    fetchReservaIds()
  }, [isDemo])

  const currentIndex = reservaIds.indexOf(reservaId)
  const prevReservaId = currentIndex > 0 ? reservaIds[currentIndex - 1] : null
  const nextReservaId = currentIndex < reservaIds.length - 1 ? reservaIds[currentIndex + 1] : null

  const demoParam = isDemo ? '?demo=true' : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Link href={`/admin/reservas${demoParam}`} className="inline-flex items-center gap-1 text-sm text-costa-gris hover:text-costa-navy transition-colors">
          <ArrowLeft size={16} />
          Volver
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => prevReservaId && router.push(`/admin/reservas/${prevReservaId}/cobros${demoParam}`)}
            disabled={!prevReservaId}
            className={`p-1.5 rounded transition-colors ${prevReservaId ? 'text-costa-navy hover:bg-costa-beige' : 'text-gray-300 cursor-not-allowed'}`}
            title="Reserva anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-costa-navy">
            Gestión de Cobros
          </h1>
          <button
            onClick={() => nextReservaId && router.push(`/admin/reservas/${nextReservaId}/cobros${demoParam}`)}
            disabled={!nextReservaId}
            className={`p-1.5 rounded transition-colors ${nextReservaId ? 'text-costa-navy hover:bg-costa-beige' : 'text-gray-300 cursor-not-allowed'}`}
            title="Reserva siguiente"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="w-16"></div>
      </div>

      <CobrosContent reservaId={reservaId} showNavigation={true} showHeader={true} />
    </div>
  )
}

export default function CobrosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>}>
      <CobrosPageContent />
    </Suspense>
  )
}
