'use client'

import { useState, useEffect } from 'react'

interface InputNumberProps {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function InputNumber({ value, onChange, placeholder, className = '', disabled = false }: InputNumberProps) {
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (!isNaN(numValue)) {
        setDisplayValue(numValue.toLocaleString('es-AR'))
      } else {
        setDisplayValue('')
      }
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'bg-gray-100' : ''} ${className}`}
    />
  )
}
