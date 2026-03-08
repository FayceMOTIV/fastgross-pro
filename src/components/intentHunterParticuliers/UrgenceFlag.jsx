import { AlertTriangle } from 'lucide-react'

export default function UrgenceFlag({ label = 'URGENT' }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  )
}
