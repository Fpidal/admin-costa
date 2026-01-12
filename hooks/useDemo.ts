'use client'

import { useSearchParams } from 'next/navigation'

export function useDemo() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  return { isDemo }
}
