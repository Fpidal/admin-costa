import { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-costa-navy">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2.5 rounded-xl border border-costa-beige
          text-costa-navy bg-costa-white
          focus:outline-none focus:ring-2 focus:ring-costa-coral focus:border-transparent
          disabled:bg-costa-beige disabled:text-costa-gris
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
