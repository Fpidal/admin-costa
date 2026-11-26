import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-costa-esmeralda text-white hover:bg-costa-esmeralda-light active:bg-costa-esmeralda shadow-sm',
    secondary: 'bg-costa-superficie text-costa-navy border border-costa-borde hover:bg-costa-arena active:bg-costa-arena',
    danger: 'bg-costa-coral-dark text-white hover:bg-costa-coral active:bg-costa-coral-dark',
    ghost: 'text-costa-navy hover:bg-costa-arena active:bg-costa-beige-light',
  }

  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
