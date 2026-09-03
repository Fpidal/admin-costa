'use client'

import { useState, useEffect } from 'react'

interface InputNumberProps {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Decimales admitidos. 0 (por defecto) mantiene el comportamiento de enteros. */
  decimales?: number
}

// Formato argentino: punto para miles, coma para decimales
const formatear = (n: number, decimales: number) =>
  n.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  })

// Revierte el formato para poder comparar contra el value que llega de afuera
const aNumero = (texto: string) => {
  const limpio = texto.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(limpio)
  return isNaN(n) ? null : n
}

export function InputNumber({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  decimales = 0,
}: InputNumberProps) {
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (numValue === undefined || numValue === null || isNaN(numValue as number)) {
      setDisplayValue('')
      return
    }
    // Si lo que se está tipeando ya representa este número no se reformatea:
    // de lo contrario, al escribir "229," la coma desaparecería sola
    if (aNumero(displayValue) === numValue) return
    setDisplayValue(formatear(numValue as number, decimales))
  }, [value, decimales]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!decimales) {
      const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '')
      if (rawValue === '') {
        setDisplayValue('')
        onChange(0)
        return
      }
      const numValue = parseInt(rawValue, 10)
      if (!isNaN(numValue)) {
        setDisplayValue(numValue.toLocaleString('es-AR'))
        onChange(numValue)
      }
      return
    }

    // Con decimales se conserva la coma mientras se escribe
    const limpio = e.target.value.replace(/\./g, '').replace(/[^\d,]/g, '')
    if (limpio === '') {
      setDisplayValue('')
      onChange(0)
      return
    }

    const [entero, ...resto] = limpio.split(',')
    const parteDecimal = resto.length ? ',' + resto.join('').slice(0, decimales) : ''
    const enteroNum = parseInt(entero || '0', 10)
    const enteroFmt = isNaN(enteroNum) ? '' : enteroNum.toLocaleString('es-AR')

    setDisplayValue(enteroFmt + parteDecimal)
    const num = parseFloat((entero || '0') + (resto.length ? '.' + resto.join('').slice(0, decimales) : ''))
    if (!isNaN(num)) onChange(num)
  }

  return (
    <input
      type="text"
      inputMode={decimales ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'bg-gray-100' : ''} ${className}`}
    />
  )
}
