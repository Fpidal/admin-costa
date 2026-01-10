import { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-costa-navy">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-3 py-2.5 rounded-xl border border-costa-gris/30
          text-costa-navy placeholder-costa-gris bg-costa-white
          focus:outline-none focus:ring-2 focus:ring-costa-navy focus:border-transparent
          disabled:bg-costa-beige disabled:text-costa-gris
          ${error ? 'border-costa-coral focus:ring-costa-coral' : ''}
          ${className}
        `}
        rows={3}
        {...props}
      />
      {error && (
        <p className="text-sm text-costa-coral">{error}</p>
      )}
    </div>
  )
}
