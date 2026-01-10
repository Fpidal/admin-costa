import { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-0.5">
      {label && (
        <label className="block text-xs font-medium text-costa-navy">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-2.5 py-1.5 rounded-lg border border-costa-gris/30 text-sm
          text-costa-navy bg-costa-white
          focus:outline-none focus:ring-1 focus:ring-costa-navy focus:border-transparent
          disabled:bg-costa-beige disabled:text-costa-gris
          ${error ? 'border-costa-coral focus:ring-costa-coral' : ''}
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
        <p className="text-xs text-costa-coral">{error}</p>
      )}
    </div>
  )
}
