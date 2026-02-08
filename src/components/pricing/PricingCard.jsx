import { Check, X, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@/services/plans'

const colorStyles = {
  blue: {
    badge: 'bg-blue-50 text-blue-600 border-blue-200',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    ring: 'ring-blue-500',
    icon: 'text-blue-500',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-600 border-violet-200',
    button: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white',
    ring: 'ring-violet-500',
    icon: 'text-violet-500',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ring: 'ring-emerald-500',
    icon: 'text-emerald-500',
  },
}

export default function PricingCard({ plan, isYearly = false }) {
  const price = isYearly ? plan.priceYearly : plan.priceMonthly
  const styles = colorStyles[plan.color] || colorStyles.blue

  return (
    <div
      className={`relative bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        plan.popular ? `border-violet-300 shadow-lg ${styles.ring} ring-2` : 'border-gray-100 shadow-md'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-lg">
            <Sparkles className="w-4 h-4" />
            Populaire
          </span>
        </div>
      )}

      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${styles.badge} mb-3`}>
            {plan.name}
          </span>
          <p className="text-gray-500 text-sm mb-4">{plan.description}</p>

          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-gray-900">{formatPrice(price)}</span>
            <span className="text-gray-500">/mois</span>
          </div>

          {isYearly && (
            <p className="text-sm text-emerald-600 font-medium mt-2">
              Economisez {formatPrice((plan.priceMonthly - plan.priceYearly) * 12)}/an
            </p>
          )}
        </div>

        {/* CTA Button */}
        <Link
          to="/signup"
          className={`block w-full py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${styles.button}`}
        >
          Commencer
        </Link>

        {/* Features */}
        <div className="mt-8 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inclus</p>
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center`}>
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-600">{feature}</span>
              </li>
            ))}
          </ul>

          {plan.notIncluded && plan.notIncluded.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-4" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Non inclus</p>
              <ul className="space-y-3">
                {plan.notIncluded.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
