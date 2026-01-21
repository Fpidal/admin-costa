'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
}

export function Modal({ isOpen, onClose, title, children, size = 'md', closeOnOverlayClick = false }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay - visible en todas las pantallas, pero solo cierra en desktop si closeOnOverlayClick=true */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={closeOnOverlayClick ? onClose : undefined}
        onTouchEnd={(e) => e.stopPropagation()}
      />
      <div className="flex min-h-full items-center justify-center sm:p-6">
        <div
          className={`relative w-full h-full sm:h-auto ${sizeClasses[size]} bg-costa-white sm:rounded-xl shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header fijo en móvil */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-costa-beige bg-costa-white sm:rounded-t-xl">
            <h2 className="text-lg font-semibold text-costa-navy">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-costa-beige transition-colors"
            >
              <X size={20} className="text-costa-gris" />
            </button>
          </div>
          <div className="px-5 py-4 overflow-y-auto max-h-[calc(100vh-60px)] sm:max-h-[80vh]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
