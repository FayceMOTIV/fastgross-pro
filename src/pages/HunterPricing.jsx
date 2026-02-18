/**
 * Hunter Pricing Page
 * In-app pricing for Hunter V2 plans
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Check,
  Zap,
  Mail,
  Instagram,
  Users,
  Sparkles,
  Loader2,
  Shield,
  TrendingUp,
  MessageCircle,
} from 'lucide-react'
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

export default function HunterPricing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)

  useEffect(() => {
    loadPlansAndUserData()
  }, [user])

  async function loadPlansAndUserData() {
    try {
      const plansSnapshot = await getDocs(collection(db, 'subscriptionPlans'))
      const loadedPlans = plansSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

      setPlans(loadedPlans)

      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.data()
        setCurrentPlan(userData?.subscription?.planId || null)
      }
    } catch (error) {
      console.error('Error loading pricing data:', error)
      toast.error('Erreur de chargement des plans')
    } finally {
      setLoading(false)
    }
  }

  async function selectPlan(planId) {
    if (!user) {
      toast.error('Connecte-toi pour selectionner un plan')
      navigate('/login')
      return
    }

    setSelecting(planId)

    try {
      const plan = plans.find((p) => p.id === planId)

      await updateDoc(doc(db, 'users', user.uid), {
        'subscription.planId': planId,
        'subscription.status': 'active',
        'subscription.quotas': {
          emailsSentThisMonth: 0,
          emailsLimit: plan.features?.emailsPerMonth || 0,
          instagramDmsSentToday: 0,
          instagramDmsLimit: plan.features?.instagramDmsPerDay || 0,
        },
        'subscription.updatedAt': new Date(),
      })

      toast.success(`Plan ${plan.name} active ! (Mode test)`)
      setCurrentPlan(planId)
    } catch (error) {
      console.error('Error selecting plan:', error)
      toast.error('Erreur lors de la selection du plan')
    } finally {
      setSelecting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">BETA - Mode Test</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-orange-500 bg-clip-text text-transparent">
            Choisis ton Plan Hunter
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Automatise ta prospection sur Instagram, TikTok, LinkedIn et Email.
            <br />
            <span className="text-sm text-indigo-600 font-semibold">
              Pas de paiement - Selectionne un plan pour tester
            </span>
          </p>
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun plan disponible</h3>
            <p className="text-gray-500 mb-4">
              Les plans doivent etre crees dans Firestore
            </p>
            <p className="text-sm text-gray-400">
              Va dans Admin → Creer/MAJ Plans Tarification
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={plan.id === currentPlan}
                onSelect={selectPlan}
                selecting={selecting === plan.id}
              />
            ))}
          </div>
        )}

        {/* Comparison Table */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <h3 className="text-2xl font-bold mb-6 text-center">
              Comparaison Detaillee
            </h3>
            <ComparisonTable plans={plans} />
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h3 className="text-2xl font-bold mb-2">Mode Test Actif</h3>
          <p className="opacity-90 max-w-xl mx-auto">
            Aucun paiement requis. Selectionne un plan pour debloquer les fonctionnalites.
            Stripe sera integre prochainement.
          </p>
        </div>
      </div>
    </div>
  )
}

function PlanCard({ plan, current, onSelect, selecting }) {
  const isPopular = plan.popular || plan.id === 'hunter_pro'

  const getPlanIcon = (planId) => {
    const icons = {
      email_pro: <Mail className="w-10 h-10 text-blue-600" />,
      instagram_standard: <Instagram className="w-10 h-10 text-pink-600" />,
      instagram_premium: <Zap className="w-10 h-10 text-purple-600" />,
      hunter_pro: <Sparkles className="w-10 h-10 text-orange-500" />,
    }
    return icons[planId] || <Users className="w-10 h-10 text-gray-600" />
  }

  return (
    <div
      className={`
        relative rounded-2xl p-6 border-2 transition-all duration-300
        ${current
          ? 'border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-2xl scale-105'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-xl'
        }
        ${isPopular ? 'ring-4 ring-indigo-200' : ''}
      `}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-indigo-600 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">
            PLUS POPULAIRE
          </span>
        </div>
      )}

      {current && (
        <div className="absolute -top-3 -right-3">
          <div className="bg-green-500 text-white rounded-full p-2">
            <Check className="w-5 h-5" />
          </div>
        </div>
      )}

      <div className="mb-4">{getPlanIcon(plan.id)}</div>

      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

      <div className="mb-6">
        <span className="text-4xl font-bold">{plan.price}€</span>
        <span className="text-gray-600">/mois</span>
      </div>

      <ul className="space-y-2 mb-6">
        {renderFeatures(plan.features || {})}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={current || selecting}
        className={`
          w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2
          ${current
            ? 'bg-green-500 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
          }
          disabled:opacity-70
        `}
      >
        {selecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Activation...
          </>
        ) : current ? (
          <>
            <Check className="w-4 h-4" />
            Plan Actuel
          </>
        ) : (
          'Selectionner'
        )}
      </button>
    </div>
  )
}

function renderFeatures(features) {
  const items = []

  if (features.emailsPerMonth > 0) {
    items.push(
      <FeatureItem key="emails">
        {features.emailsPerMonth.toLocaleString()} emails/mois
      </FeatureItem>
    )
  }

  if (features.emailSequences) {
    items.push(
      <FeatureItem key="sequences">
        Sequences {features.emailSequenceSteps || 7} etapes
      </FeatureItem>
    )
  }

  if (features.instagramAccounts > 0) {
    items.push(
      <FeatureItem key="ig-accounts">
        {features.instagramAccounts} compte{features.instagramAccounts > 1 ? 's' : ''} Instagram
      </FeatureItem>
    )
  }

  if (features.instagramDmsPerDay > 0) {
    items.push(
      <FeatureItem key="dms">
        {features.instagramDmsPerDay} DMs/jour
      </FeatureItem>
    )
  }

  if (features.zeroRiskForClient) {
    items.push(
      <FeatureItem key="zero-risk" highlight>
        Comptes burner fournis
      </FeatureItem>
    )
  }

  if (features.aiPersonalization) {
    items.push(
      <FeatureItem key="ai">
        Personnalisation IA
      </FeatureItem>
    )
  }

  if (features.whatsappAutomation) {
    items.push(
      <FeatureItem key="whatsapp" highlight>
        WhatsApp automation
      </FeatureItem>
    )
  }

  if (features.tiktokScraping) {
    items.push(
      <FeatureItem key="tiktok">
        TikTok scraping
      </FeatureItem>
    )
  }

  return items
}

function FeatureItem({ children, highlight = false }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${highlight ? 'text-indigo-600' : 'text-green-600'}`} />
      <span className={highlight ? 'font-semibold text-indigo-900' : 'text-gray-700'}>
        {children}
      </span>
    </li>
  )
}

function ComparisonTable({ plans }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2">
            <th className="text-left py-3 px-4 font-semibold">Fonctionnalite</th>
            {plans.map((plan) => (
              <th key={plan.id} className="text-center py-3 px-4 font-semibold">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <ComparisonRow
            label="Emails/mois"
            plans={plans}
            getValue={(p) => p.features?.emailsPerMonth || 0}
            format={(v) => (v > 0 ? v.toLocaleString() : '-')}
          />
          <ComparisonRow
            label="Comptes Instagram"
            plans={plans}
            getValue={(p) => p.features?.instagramAccounts || 0}
            format={(v) => (v > 0 ? v : '-')}
          />
          <ComparisonRow
            label="DMs Instagram/jour"
            plans={plans}
            getValue={(p) => p.features?.instagramDmsPerDay || 0}
            format={(v) => (v > 0 ? v : '-')}
          />
          <ComparisonRow
            label="Sequences email"
            plans={plans}
            getValue={(p) => p.features?.emailSequences}
            format={(v) => (v ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : '-')}
          />
          <ComparisonRow
            label="WhatsApp"
            plans={plans}
            getValue={(p) => p.features?.whatsappAutomation}
            format={(v) => (v ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : '-')}
          />
          <ComparisonRow
            label="Type comptes IG"
            plans={plans}
            getValue={(p) => p.features?.instagramAccountType || 'client'}
            format={(v) => (v === 'burner' ? <span className="text-indigo-600 font-medium">Burner</span> : 'Client')}
          />
          <ComparisonRow
            label="TikTok scraping"
            plans={plans}
            getValue={(p) => p.features?.tiktokScraping}
            format={(v) => (v ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : '-')}
          />
        </tbody>
      </table>
    </div>
  )
}

function ComparisonRow({ label, plans, getValue, format }) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4 font-medium text-gray-700">{label}</td>
      {plans.map((plan) => (
        <td key={plan.id} className="text-center py-3 px-4">
          {format(getValue(plan))}
        </td>
      ))}
    </tr>
  )
}
