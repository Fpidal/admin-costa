import { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-0.5">
      {label && (
        <label className="block text-xs font-medium text-costa-navy">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-2.5 py-1.5 rounded-lg border border-costa-gris/30 text-sm
          text-costa-navy placeholder-costa-gris bg-costa-white
          focus:outline-none focus:ring-1 focus:ring-costa-navy focus:border-transparent
          disabled:bg-costa-beige disabled:text-costa-gris
          ${error ? 'border-costa-coral focus:ring-costa-coral' : ''}
          ${className}
        `}
        rows={2}
        {...props}
      />
      {error && (
        <p className="text-xs text-costa-coral">{error}</p>
      )}
    </div>
  )
}
