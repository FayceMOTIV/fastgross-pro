import { memo } from 'react'

// Memoized to prevent re-renders during route transitions
const PageLoader = memo(function PageLoader() {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-400 text-sm">Chargement...</p>
      </div>
    </div>
  )
})

export default PageLoader
