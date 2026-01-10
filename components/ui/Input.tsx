import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-costa-navy">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2.5 rounded-xl border border-costa-beige
          text-costa-navy placeholder-costa-gris bg-costa-white
          focus:outline-none focus:ring-2 focus:ring-costa-coral focus:border-transparent
          disabled:bg-costa-beige disabled:text-costa-gris
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
