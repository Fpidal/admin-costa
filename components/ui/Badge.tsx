interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-costa-beige text-costa-navy',
    success: 'bg-costa-olivo/20 text-costa-olivo',
    warning: 'bg-costa-coral/20 text-costa-coral',
    danger: 'bg-costa-coral/20 text-costa-coral',
    info: 'bg-costa-navy/10 text-costa-navy',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
