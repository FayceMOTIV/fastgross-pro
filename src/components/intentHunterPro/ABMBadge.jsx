import { Users, Crosshair } from 'lucide-react'

export default function ABMBadge({ count = 0, onClick }) {
  if (count < 2) return null

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 border border-purple-200 hover:bg-purple-150 transition-colors group"
    >
      <Users className="w-3.5 h-3.5 text-purple-600" />
      <span className="text-xs font-semibold text-purple-700">
        {count} decideurs trouves
      </span>
      <span className="text-[10px] text-purple-500 group-hover:text-purple-700 transition-colors">
        - lancer ABM
      </span>
      <Crosshair className="w-3 h-3 text-purple-500 group-hover:text-purple-700 transition-colors" />
    </button>
  )
}
