export default function ScoreCircle({ score, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }

  const bgColor =
    score >= 80
      ? 'bg-emerald-500'
      : score >= 60
        ? 'bg-yellow-500'
        : score >= 40
          ? 'bg-orange-400'
          : 'bg-red-400'

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${bgColor}`}
    >
      {score}
    </div>
  )
}
