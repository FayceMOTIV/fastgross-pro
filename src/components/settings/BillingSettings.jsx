import { Check } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    features: ['100 prospects/mois', '500 emails/mois', 'Scraping automatique', '1 utilisateur'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    features: [
      '500 prospects/mois',
      '2000 emails/mois',
      'Hunter.io + Dropcontact',
      '3 utilisateurs',
      'Support prioritaire',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 199,
    features: [
      'Illimite',
      '10000 emails/mois',
      'Toutes les sources',
      'Equipe illimitee',
      'API access',
      'Account manager',
    ],
  },
]

export default function BillingSettings() {
  const { currentOrg } = useOrg()

  const getCurrentPlan = (planId) => {
    if (planId === 'scale') return currentOrg?.plan === 'scale'
    if (planId === 'starter') return currentOrg?.plan === 'starter'
    return currentOrg?.plan === 'pro' || !currentOrg?.plan
  }

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Plan actuel</p>
            <p className="text-2xl font-display font-bold text-white mt-1">
              {currentOrg?.plan === 'scale'
                ? 'Scale'
                : currentOrg?.plan === 'starter'
                  ? 'Starter'
                  : 'Pro'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-dark-400">Usage ce mois</p>
            <p className="text-lg font-medium text-white mt-1">
              0 / {currentOrg?.settings?.emailsPerMonth || 2000} emails
            </p>
            <div className="w-32 h-2 bg-dark-800 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = getCurrentPlan(plan.id)
          return (
            <div
              key={plan.id}
              className={`bg-white/5 rounded-2xl border p-6 space-y-4 ${
                isCurrent ? 'border-brand-500/50 ring-1 ring-brand-500/20' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold text-white">{plan.name}</h3>
                {isCurrent && <span className="badge-success">Actuel</span>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold text-white">{plan.price}EUR</span>
                <span className="text-dark-500">/mois</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                    <Check className="w-4 h-4 text-brand-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={isCurrent ? 'btn-secondary w-full' : 'btn-primary w-full'}
                disabled={isCurrent}
              >
                {isCurrent ? 'Plan actuel' : 'Choisir'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-dark-500 text-center">
        Besoin d'un plan personnalise ?{' '}
        <a href="mailto:contact@facemedia.fr" className="text-brand-400 hover:underline">
          Contactez-nous
        </a>
      </p>
    </div>
  )
}
