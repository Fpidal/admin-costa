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
          w-full px-3 py-2 rounded-lg border border-costa-gris
          text-costa-navy placeholder-costa-gris
          focus:outline-none focus:ring-2 focus:ring-costa-navy focus:border-transparent
          disabled:bg-costa-agua disabled:text-costa-gris
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
