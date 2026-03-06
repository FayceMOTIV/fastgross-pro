/**
 * KBWizard — Wizard 6 etapes pour alimenter la Knowledge Base sans effort
 */

import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  Briefcase,
  DollarSign,
  GitBranch,
  HelpCircle,
  Swords,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  {
    id: 'services',
    title: 'Vos services',
    icon: Briefcase,
    description: 'Decrivez vos services / produits principaux',
    placeholder: `Exemple:
- Prospection digitale multicanale automatisee
- Generation de leads qualifies via IA
- Campagnes email + SMS + WhatsApp + LinkedIn
- Analyse et scoring des prospects
- Automatisation complete du pipeline commercial`,
  },
  {
    id: 'pricing',
    title: 'Tarifs',
    icon: DollarSign,
    description: 'Listez vos forfaits et tarifs',
    placeholder: `Exemple:
- Starter : 97 EUR/mois — 500 prospects, 1000 emails
- Pro : 297 EUR/mois — 2500 prospects, 5000 emails, SMS, WhatsApp
- Enterprise : 697 EUR/mois — 10000 prospects, tous les canaux
- Essai gratuit : 14 jours sans engagement`,
  },
  {
    id: 'process',
    title: 'Processus',
    icon: GitBranch,
    description: 'Comment fonctionne votre service etape par etape',
    placeholder: `Exemple:
1. Onboarding (30 min) : on configure votre compte et definit votre cible
2. Sourcing : l'IA scrape et enrichit les prospects correspondant a votre ICP
3. Sequences multicanales : messages personnalises envoyes automatiquement
4. Qualification : l'IA analyse les reponses et score les prospects
5. Transfert : les leads chauds sont transferes au commercial en temps reel`,
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    description: 'Questions frequentes de vos prospects',
    placeholder: `Exemple:
Q: Combien de temps pour voir des resultats ?
R: Les premiers leads qualifies arrivent en 48-72h. ROI mesurable des le premier mois.

Q: Est-ce que c'est legal / RGPD ?
R: Oui, 100% conforme RGPD. Opt-out automatique, suppression sur demande.

Q: Vous travaillez dans quel secteur ?
R: Tous les secteurs B2B : agences, SaaS, conseil, immobilier, formation...`,
  },
  {
    id: 'competitors',
    title: 'Concurrents',
    icon: Swords,
    description: 'Qui sont vos concurrents et en quoi etes-vous differents',
    placeholder: `Exemple:
- Vs agence de prospection classique : on est 5x moins cher, 100% automatise, et on couvre 8 canaux au lieu de 1-2
- Vs Clay/Apollo : on gere l'envoi en plus du sourcing, on a un agent IA qui dialogue en autonomie
- Vs Artisan/11x : on est base en France, en francais, avec support local et compliance RGPD native`,
  },
  {
    id: 'tone',
    title: 'Ton de voix',
    icon: MessageCircle,
    description: 'Comment Alex doit communiquer avec vos prospects',
    placeholder: `Exemple:
- Ton direct et professionnel, jamais familier
- Tutoiement interdit en premier contact, vouvoiement obligatoire
- Pas d'emojis excessifs (1 max par message)
- Toujours finir par une question ouverte
- Ne jamais denigrer un concurrent, juste comparer objectivement
- References locales et sectorielles en priorite`,
  },
]

export default function KBWizard() {
  const { currentOrg } = useOrg()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const step = STEPS[currentStep]
  const progress = Object.keys(answers).filter((k) => answers[k]?.trim()).length
  const progressPercent = Math.round((progress / STEPS.length) * 100)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    const filledSteps = Object.entries(answers).filter(([, v]) => v?.trim())
    if (filledSteps.length === 0) {
      toast.error('Remplissez au moins une etape')
      return
    }

    setSubmitting(true)
    try {
      const processKBWizard = httpsCallable(functions, 'processKBWizard')
      await processKBWizard({
        orgId: currentOrg.id,
        answers,
      })
      setCompleted(true)
      toast.success(`${filledSteps.length} sections indexees dans la KB`)
    } catch (err) {
      console.error('KB Wizard error:', err)
      toast.error(err.message || 'Erreur lors de l\'indexation')
    } finally {
      setSubmitting(false)
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
          Base de connaissances enrichie
        </h3>
        <p className="text-sm text-gray-500 max-w-md">
          Alex utilise maintenant vos informations pour personnaliser chaque conversation.
          Vous pouvez revenir modifier a tout moment.
        </p>
        <button
          onClick={() => { setCompleted(false); setCurrentStep(0) }}
          className="mt-6 btn-ghost text-sm"
        >
          Modifier les reponses
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            Completion KB : {progressPercent}%
          </span>
          <span className="text-xs text-gray-400">
            {progress}/{STEPS.length} sections
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isFilled = answers[s.id]?.trim()
          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                i === currentStep
                  ? 'bg-indigo-50 border border-indigo-200'
                  : isFilled
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${
                i === currentStep ? 'text-indigo-500' : isFilled ? 'text-emerald-500' : 'text-gray-400'
              }`} />
              <span className="text-[10px] text-gray-500 hidden sm:block">{s.title}</span>
            </button>
          )
        })}
      </div>

      {/* Current step */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <step.icon className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-base font-display font-semibold text-gray-900">{step.title}</h3>
            <p className="text-sm text-gray-500">{step.description}</p>
          </div>
        </div>

        <textarea
          value={answers[step.id] || ''}
          onChange={(e) => setAnswers({ ...answers, [step.id]: e.target.value })}
          placeholder={step.placeholder}
          rows={10}
          className="input-field w-full text-sm resize-none"
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Precedent
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="btn-primary text-sm flex items-center gap-1"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || progress === 0}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Indexer dans la KB
          </button>
        )}
      </div>
    </div>
  )
}
