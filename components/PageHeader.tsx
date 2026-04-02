interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold text-costa-navy leading-tight" style={{ fontFamily: 'var(--font-playfair)' }}>{title}</h1>
        {description && (
          <p className="mt-1 text-sm sm:text-[15px] font-normal leading-snug" style={{ color: '#4a5d6f' }}>{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
