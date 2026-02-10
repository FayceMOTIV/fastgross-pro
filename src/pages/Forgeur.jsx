import { useState, useEffect } from 'react'
import {
  Wand2,
  Mail,
  Phone,
  MessageCircle,
  Mic,
  Send,
  Instagram,
  ArrowRight,
  ChevronDown,
  Clock,
  Sparkles,
  Edit3,
  RotateCcw,
  Play,
  Save,
  Users,
  Target,
  Check,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { CHANNELS, isChannelAvailable } from '@/services/plans'

// Mock prospects for demo
const mockProspects = [
  { id: '1', name: 'Jean Dupont', company: 'TechCorp', email: 'jean@techcorp.fr', industry: 'SaaS' },
  { id: '2', name: 'Marie Martin', company: 'InnovatLab', email: 'marie@innovatlab.com', industry: 'Conseil' },
  { id: '3', name: 'Pierre Bernard', company: 'GrowthCo', email: 'pierre@growthco.fr', industry: 'Marketing' },
]

const objectives = [
  { id: 'rdv', label: 'Prise de RDV', icon: Target, description: 'Obtenir un appel ou une reunion' },
  { id: 'demo', label: 'Demo produit', icon: Play, description: 'Presenter votre solution' },
  { id: 'contact', label: 'Premier contact', icon: Users, description: 'Initier la relation' },
  { id: 'reactivation', label: 'Reactivation', icon: RotateCcw, description: 'Relancer un ancien contact' },
]

const tones = [
  { id: 'professional', label: 'Professionnel', emoji: '👔' },
  { id: 'friendly', label: 'Amical', emoji: '😊' },
  { id: 'challenger', label: 'Challenger', emoji: '🎯' },
  { id: 'storyteller', label: 'Storyteller', emoji: '📖' },
]

// Generate mock sequence
const generateMockSequence = (prospect, channels, objective, tone, steps) => {
  const templates = {
    email: [
      {
        subject: `${prospect.company} + [Votre entreprise] ?`,
        body: `Bonjour ${prospect.name},\n\nJ'ai decouvert ${prospect.company} et votre approche innovante dans le ${prospect.industry}.\n\nNous aidons des entreprises comme la votre a automatiser leur prospection et generer 3x plus de leads qualifies.\n\nSeriez-vous disponible pour un echange de 15 minutes cette semaine ?\n\nCordialement`,
        cta: 'Repondre a cet email',
      },
      {
        subject: `Re: ${prospect.company}`,
        body: `Bonjour ${prospect.name},\n\nJe me permets de vous relancer suite a mon precedent message.\n\nNos clients dans le ${prospect.industry} obtiennent en moyenne +45% de taux de reponse grace a notre approche multicanale.\n\nAvez-vous 10 minutes a m'accorder ?\n\nBien a vous`,
        cta: 'Proposer un creneau',
      },
    ],
    sms: [
      {
        body: `Bonjour ${prospect.name.split(' ')[0]}, suite a mon email - disponible pour un call de 10min sur l'automatisation de votre prospection ?`,
        cta: 'Repondre oui/non',
      },
    ],
    whatsapp: [
      {
        body: `Bonjour ${prospect.name.split(' ')[0]} ! 👋 Je vous ai envoye un email concernant l'automatisation de la prospection pour ${prospect.company}. Avez-vous eu le temps d'y jeter un oeil ?`,
        cta: 'Engager la conversation',
      },
    ],
    voicemail: [
      {
        body: `Bonjour ${prospect.name}, c'est [Votre nom] de [Votre entreprise]. Je vous laisse ce message suite a mes emails concernant l'optimisation de votre prospection chez ${prospect.company}. Je serais ravi d'echanger 10 minutes avec vous. Vous pouvez me rappeler au [numero] ou me repondre par email. A bientot !`,
        cta: 'Rappel telephonique',
      },
    ],
  }

  const sequence = []
  let dayOffset = 0

  channels.forEach((channelId, idx) => {
    const channel = CHANNELS[channelId]
    const channelTemplates = templates[channelId] || templates.email

    channelTemplates.slice(0, idx === 0 ? 2 : 1).forEach((template, tIdx) => {
      sequence.push({
        step: sequence.length + 1,
        channel: channelId,
        channelInfo: channel,
        delay_days: dayOffset,
        subject: template.subject || null,
        body: template.body,
        call_to_action: template.cta,
        personalization_notes: `Personnalise pour ${prospect.company} (${prospect.industry})`,
      })
      dayOffset += channel.minDelayDays || 2
    })
  })

  return sequence.slice(0, steps)
}

const channelIcons = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageCircle,
  instagram: Instagram,
  voicemail: Mic,
  courrier: Send,
}

function SequenceStep({ step, onEdit, onRegenerate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedBody, setEditedBody] = useState(step.body)
  const Icon = channelIcons[step.channel] || Mail

  const handleSave = () => {
    onEdit({ ...step, body: editedBody })
    setIsEditing(false)
  }

  return (
    <div className="relative">
      {/* Timeline connector */}
      {step.step > 1 && (
        <div className="absolute left-6 -top-6 w-0.5 h-6 bg-gray-200" />
      )}

      <div className="flex gap-4">
        {/* Step indicator */}
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${step.channelInfo?.color || 'violet'}-100 border-2 border-${step.channelInfo?.color || 'violet'}-200`}>
            <Icon className={`w-6 h-6 text-${step.channelInfo?.color || 'violet'}-600`} />
          </div>
          <div className="text-xs text-gray-400 mt-1">J+{step.delay_days}</div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                Etape {step.step}
              </span>
              <span className="text-sm font-medium text-gray-900">{step.channelInfo?.name}</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                Jour {step.delay_days}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRegenerate}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Regenerer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Editer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {step.subject && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Objet</p>
                <p className="font-medium text-gray-900">{step.subject}</p>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 text-sm min-h-[150px]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-line">{step.body}</p>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">CTA: {step.call_to_action}</span>
              <span className="text-xs text-violet-500 italic">{step.personalization_notes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Forgeur() {
  const { user } = useAuth()
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [selectedChannels, setSelectedChannels] = useState(['email'])
  const [selectedObjective, setSelectedObjective] = useState('rdv')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [stepCount, setStepCount] = useState(4)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sequence, setSequence] = useState([])

  // Demo: use mock plan
  const currentPlan = 'pro'

  const toggleChannel = (channelId) => {
    if (!isChannelAvailable(currentPlan, channelId)) {
      toast.error('Canal non disponible dans votre forfait')
      return
    }

    if (selectedChannels.includes(channelId)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter((c) => c !== channelId))
      }
    } else {
      setSelectedChannels([...selectedChannels, channelId])
    }
  }

  const handleGenerate = async () => {
    if (!selectedProspect) {
      toast.error('Selectionnez un prospect')
      return
    }

    if (selectedChannels.length === 0) {
      toast.error('Selectionnez au moins un canal')
      return
    }

    setIsGenerating(true)
    setSequence([])

    try {
      // Simulate AI generation
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const newSequence = generateMockSequence(
        selectedProspect,
        selectedChannels,
        selectedObjective,
        selectedTone,
        stepCount
      )

      setSequence(newSequence)
      toast.success('Sequence generee avec succes !')
    } catch (error) {
      console.error('Error generating sequence:', error)
      toast.error('Erreur lors de la generation')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditStep = (updatedStep) => {
    setSequence(sequence.map((s) => (s.step === updatedStep.step ? updatedStep : s)))
    toast.success('Modification sauvegardee')
  }

  const handleRegenerateStep = (stepIndex) => {
    toast.success('Etape regeneree')
    // In production, this would call the AI API
  }

  const handleActivateSequence = () => {
    toast.success('Sequence activee ! Les messages seront envoyes automatiquement.')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900">Forgeur</h1>
        <p className="text-gray-500 mt-1">Generez des sequences de prospection personnalisees avec l'IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Prospect Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              Prospect
            </h3>
            <div className="space-y-2">
              {mockProspects.map((prospect) => (
                <button
                  key={prospect.id}
                  onClick={() => setSelectedProspect(prospect)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedProspect?.id === prospect.id
                      ? 'bg-violet-50 border-2 border-violet-300'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <p className="font-medium text-gray-900">{prospect.name}</p>
                  <p className="text-sm text-gray-500">{prospect.company}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Channel Selection */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Canaux</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(CHANNELS).map((channel) => {
                const Icon = channelIcons[channel.id] || Mail
                const isSelected = selectedChannels.includes(channel.id)
                const isAvailable = isChannelAvailable(currentPlan, channel.id)

                return (
                  <button
                    key={channel.id}
                    onClick={() => toggleChannel(channel.id)}
                    disabled={!isAvailable}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-violet-100 border-2 border-violet-300'
                        : isAvailable
                        ? 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                        : 'bg-gray-100 border-2 border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-violet-600' : 'text-gray-400'}`} />
                    <span className={`text-xs ${isSelected ? 'text-violet-700 font-medium' : 'text-gray-500'}`}>
                      {channel.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Objective */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Objectif</h3>
            <div className="space-y-2">
              {objectives.map((obj) => {
                const Icon = obj.icon
                return (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObjective(obj.id)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      selectedObjective === obj.id
                        ? 'bg-violet-50 border-2 border-violet-300'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selectedObjective === obj.id ? 'text-violet-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <p className={`font-medium ${selectedObjective === obj.id ? 'text-violet-700' : 'text-gray-700'}`}>
                        {obj.label}
                      </p>
                      <p className="text-xs text-gray-500">{obj.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tone */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ton</h3>
            <div className="grid grid-cols-2 gap-2">
              {tones.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                    selectedTone === tone.id
                      ? 'bg-violet-50 border-2 border-violet-300'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-lg">{tone.emoji}</span>
                  <span className={`text-sm ${selectedTone === tone.id ? 'text-violet-700 font-medium' : 'text-gray-600'}`}>
                    {tone.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Steps Count */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Nombre d'etapes</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="2"
                max="8"
                value={stepCount}
                onChange={(e) => setStepCount(Number(e.target.value))}
                className="flex-1 accent-violet-600"
              />
              <span className="w-8 text-center font-semibold text-violet-600">{stepCount}</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedProspect}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generation en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generer la sequence
              </>
            )}
          </button>
        </div>

        {/* Sequence Preview */}
        <div className="lg:col-span-2">
          {sequence.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Sequence pour {selectedProspect?.name}
                  </h2>
                  <p className="text-sm text-gray-500">{sequence.length} etapes sur {selectedChannels.length} canal(aux)</p>
                </div>
                <button
                  onClick={handleActivateSequence}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  <Play className="w-5 h-5" />
                  Activer
                </button>
              </div>

              <div className="space-y-8">
                {sequence.map((step, idx) => (
                  <SequenceStep
                    key={step.step}
                    step={step}
                    onEdit={handleEditStep}
                    onRegenerate={() => handleRegenerateStep(idx)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Creez votre sequence</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Selectionnez un prospect, configurez vos options et generez une sequence
                de messages personnalises avec l'IA.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
