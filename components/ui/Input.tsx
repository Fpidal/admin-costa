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
          w-full px-3 py-2.5 rounded-xl border border-costa-gris/30
          text-costa-navy placeholder-costa-gris bg-costa-white
          focus:outline-none focus:ring-2 focus:ring-costa-navy focus:border-transparent
          disabled:bg-costa-beige disabled:text-costa-gris
          ${error ? 'border-costa-coral focus:ring-costa-coral' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-costa-coral">{error}</p>
      )}
    </div>
  )
}
