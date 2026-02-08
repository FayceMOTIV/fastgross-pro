import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Zap, ArrowRight, Building2, Target, CheckCircle2 } from 'lucide-react'

const steps = [
  { id: 'org', title: 'Votre organisation', icon: Building2 },
  { id: 'goal', title: 'Votre objectif', icon: Target },
  { id: 'done', title: "C'est parti !", icon: CheckCircle2 },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createOrg } = useOrg()
  const [currentStep, setCurrentStep] = useState(0)
  const [orgName, setOrgName] = useState('')
  const [goal, setGoal] = useState('')

  const goals = [
    { value: 'agency', label: '🏢 Agence', desc: 'Je prospecte pour mes clients' },
    { value: 'freelance', label: '💼 Freelance', desc: 'Je cherche mes propres clients' },
    { value: 'sales', label: '📈 Commercial', desc: 'Je gère une équipe de vente' },
    { value: 'startup', label: '🚀 Startup', desc: 'Je développe mon activité' },
  ]

  const handleCreateOrg = async () => {
    if (!orgName) return
    await createOrg(orgName)
    setCurrentStep(1)
  }

  const handleFinish = async () => {
    await updateDoc(doc(db, 'users', user.uid), {
      onboardingComplete: true,
      goal,
    })
    navigate('/app')
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  i <= currentStep ? 'bg-brand-500 text-dark-950' : 'bg-dark-800 text-dark-500'
                }`}
              >
                {i < currentStep ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${i < currentStep ? 'bg-brand-500' : 'bg-dark-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Organization */}
        {currentStep === 0 && (
          <div className="glass-card p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <Building2 className="w-10 h-10 text-brand-400 mx-auto mb-3" />
              <h2 className="text-2xl font-display font-bold text-white">Créez votre espace</h2>
              <p className="text-dark-400 mt-2">Comment s'appelle votre entreprise ou activité ?</p>
            </div>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="input-field text-center text-lg"
              placeholder="Ex: Mon Agence, Jean Dupont Consulting..."
              autoFocus
            />
            <button
              onClick={handleCreateOrg}
              disabled={!orgName}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continuer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Goal */}
        {currentStep === 1 && (
          <div className="glass-card p-8 space-y-6 animate-fade-in">
            <div className="text-center">
              <Target className="w-10 h-10 text-brand-400 mx-auto mb-3" />
              <h2 className="text-2xl font-display font-bold text-white">
                Quel est votre profil ?
              </h2>
              <p className="text-dark-400 mt-2">On adapte l'expérience à votre besoin</p>
            </div>
            <div className="space-y-3">
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    goal === g.value
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <p className="font-medium text-white">{g.label}</p>
                  <p className="text-xs text-dark-500 mt-1">{g.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (goal) setCurrentStep(2)
              }}
              disabled={!goal}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continuer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {currentStep === 2 && (
          <div className="glass-card p-8 space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center animate-pulse-glow">
              <Zap className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white">Tout est prêt ! 🎉</h2>
            <p className="text-dark-400">
              Votre espace <span className="text-white font-medium">{orgName}</span> est créé.
              Commencez par scanner le site d'un de vos clients.
            </p>
            <button
              onClick={handleFinish}
              className="btn-primary flex items-center justify-center gap-2 mx-auto"
            >
              <Zap className="w-4 h-4" />
              Accéder au dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
