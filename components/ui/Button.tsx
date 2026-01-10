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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-costa-coral text-white hover:bg-costa-coral-dark active:bg-costa-coral-dark shadow-md',
    secondary: 'bg-costa-navy text-white hover:bg-costa-navy-light active:bg-costa-navy shadow-md',
    danger: 'bg-costa-coral text-white hover:bg-costa-coral-dark active:bg-costa-coral-dark',
    ghost: 'text-costa-navy hover:bg-costa-beige active:bg-costa-beige-light',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
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
