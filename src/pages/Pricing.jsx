import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowLeft, Check, HelpCircle, Mail, Phone, MessageCircle, Mic, Send, Instagram } from 'lucide-react'
import PricingCard from '@/components/pricing/PricingCard'
import PricingToggle from '@/components/pricing/PricingToggle'
import { getAllPlans, CHANNELS } from '@/services/plans'

const faqs = [
  {
    question: 'Comment fonctionne la periode d\'essai ?',
    answer: 'Vous beneficiez de 14 jours d\'essai gratuit sur le forfait Starter. Aucune carte bancaire n\'est requise pour commencer. Vous pouvez upgrader a tout moment.',
  },
  {
    question: 'Puis-je changer de forfait en cours de mois ?',
    answer: 'Oui, vous pouvez upgrader a tout moment. Le changement est effectif immediatement et la difference est calculee au prorata. Pour downgrader, le changement prendra effet a la fin de votre periode de facturation.',
  },
  {
    question: 'Que se passe-t-il si je depasse mes quotas ?',
    answer: 'Vous recevrez des alertes a 80% et 100% de vos quotas. Une fois la limite atteinte, les envois sont mis en pause. Vous pouvez upgrader pour debloquer ou attendre le mois suivant.',
  },
  {
    question: 'Mes donnees sont-elles securisees ?',
    answer: 'Absolument. Vos donnees sont hebergees sur Firebase (Google Cloud) avec chiffrement au repos et en transit. Nous sommes conformes au RGPD et ne revendons jamais vos donnees.',
  },
  {
    question: 'Comment fonctionne le support ?',
    answer: 'Starter: support par email sous 48h. Pro: support prioritaire sous 24h. Enterprise: support prioritaire sous 4h + appels dedies.',
  },
  {
    question: 'Puis-je annuler a tout moment ?',
    answer: 'Oui, sans engagement. Vous gardez l\'acces jusqu\'a la fin de votre periode de facturation. Vos donnees restent disponibles pendant 30 jours apres annulation.',
  },
]

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  instagram: Instagram,
  voicemail: Mic,
  courrier: Send,
}

// Static color mappings for channels
const channelColorStyles = {
  email: { bg: 'bg-blue-50', text: 'text-blue-600' },
  sms: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  whatsapp: { bg: 'bg-green-50', text: 'text-green-600' },
  instagram: { bg: 'bg-pink-50', text: 'text-pink-600' },
  voicemail: { bg: 'bg-purple-50', text: 'text-purple-600' },
  courrier: { bg: 'bg-amber-50', text: 'text-amber-600' },
}

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const plans = getAllPlans()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-gray-900">Face Media Factory</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-4">
            Tarifs simples,{' '}
            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              resultats concrets
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            Choisissez le forfait adapte a vos besoins. Pas de frais caches, pas d'engagement.
            Commencez gratuitement pendant 14 jours.
          </p>

          <PricingToggle isYearly={isYearly} onToggle={() => setIsYearly(!isYearly)} />
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} isYearly={isYearly} />
            ))}
          </div>
        </div>
      </section>

      {/* Channels comparison */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
              Canaux disponibles par forfait
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Multipliez vos points de contact pour maximiser vos chances de reponse
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Canal</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="text-center px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            plan.popular
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {plan.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(CHANNELS).map((channel, idx) => {
                    const Icon = channelIcons[channel.id] || Mail
                    const colorStyle = channelColorStyles[channel.id] || channelColorStyles.email
                    return (
                      <tr key={channel.id} className={idx % 2 === 0 ? 'bg-gray-50/50' : ''}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${colorStyle.bg} flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${colorStyle.text}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                          </div>
                        </td>
                        {plans.map((plan) => (
                          <td key={plan.id} className="text-center px-6 py-4">
                            {plan.limits.channels.includes(channel.id) ? (
                              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
                                <Check className="w-4 h-4 text-emerald-600" />
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
              Questions frequentes
            </h2>
            <p className="text-gray-500">
              Vous avez d'autres questions ?{' '}
              <a href="mailto:contact@facemediafactory.com" className="text-violet-600 hover:underline">
                Contactez-nous
              </a>
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <HelpCircle
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-500 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-violet-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
            Pret a automatiser votre prospection ?
          </h2>
          <p className="text-violet-100 text-lg mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines d'entreprises qui generent des leads qualifies en automatique
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
            >
              Essai gratuit 14 jours
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 text-white font-medium hover:bg-white/10 rounded-xl transition-colors"
            >
              Voir la demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>&copy; 2026 Face Media Factory. Tous droits reserves.</p>
            <div className="flex items-center gap-6">
              <Link to="/legal/cgv" className="hover:text-gray-900 transition-colors">
                CGV
              </Link>
              <Link to="/legal/privacy" className="hover:text-gray-900 transition-colors">
                Confidentialite
              </Link>
              <Link to="/legal/mentions" className="hover:text-gray-900 transition-colors">
                Mentions legales
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
