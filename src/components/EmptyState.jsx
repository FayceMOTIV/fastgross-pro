import { memo } from 'react'
import { FileQuestion } from 'lucide-react'

// Memoized - static content that rarely changes
const EmptyState = memo(function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  actionLabel,
  className = '',
}) {
  return (
    <div className={`glass-card p-12 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>

      {title && <h3 className="text-lg font-display font-semibold text-gray-500">{title}</h3>}

      {description && <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">{description}</p>}

      {action && actionLabel && (
        <button onClick={action} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  )
})

export default EmptyState
