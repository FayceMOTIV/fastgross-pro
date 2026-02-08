export default function PricingToggle({ isYearly, onToggle }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
        Mensuel
      </span>

      <button
        onClick={onToggle}
        className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
          isYearly ? 'bg-violet-600' : 'bg-gray-200'
        }`}
        aria-label="Toggle yearly pricing"
      >
        <span
          className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isYearly ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>

      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
          Annuel
        </span>
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
          -20%
        </span>
      </div>
    </div>
  )
}
