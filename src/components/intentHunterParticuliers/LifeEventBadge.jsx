const LIFE_EVENTS = {
  mariage: { emoji: '\uD83D\uDC8D', label: 'Mariage', bg: 'bg-pink-50', border: 'border-pink-200', color: 'text-pink-700' },
  naissance: { emoji: '\uD83C\uDF7C', label: 'Naissance', bg: 'bg-sky-50', border: 'border-sky-200', color: 'text-sky-700' },
  demenagement: { emoji: '\uD83C\uDFE0', label: 'Demenagement', bg: 'bg-violet-50', border: 'border-violet-200', color: 'text-violet-700' },
  construction: { emoji: '\uD83C\uDFD7\uFE0F', label: 'Construction', bg: 'bg-amber-50', border: 'border-amber-200', color: 'text-amber-700' },
  retraite: { emoji: '\uD83C\uDF93', label: 'Retraite', bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-700' },
}

export default function LifeEventBadge({ event }) {
  const config = LIFE_EVENTS[event]

  if (!config) return null

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${config.bg} ${config.border} ${config.color}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
