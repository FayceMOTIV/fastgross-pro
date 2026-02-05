import { useState } from 'react'
import { useForgeur } from '@/hooks/useCloudFunctions'
import { useClients, useCampaigns } from '@/hooks/useFirestore'
import { useOrg } from '@/contexts/OrgContext'
import EmailPreview from '@/components/EmailPreview'
import Modal from '@/components/Modal'
import { demoSequences, toneDescriptions } from '@/data/demoSequences'
import toast from 'react-hot-toast'
import {
  Mail,
  Sparkles,
  Loader2,
  Edit3,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  Check,
  Eye,
  BookOpen,
  Target,
  Heart,
  Zap,
} from 'lucide-react'

export default function Forgeur() {
  const { generate, sequence, generating } = useForgeur()
  const { clients } = useClients()
  const { campaigns, add: addCampaign } = useCampaigns()
  const { org } = useOrg()

  const [selectedClient, setSelectedClient] = useState('')
  const [tone, setTone] = useState('expert')
  const [emailCount, setEmailCount] = useState(4)
  const [generatedEmails, setGeneratedEmails] = useState([])
  const [expandedEmail, setExpandedEmail] = useState(0)
  const [copied, setCopied] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewEmail, setPreviewEmail] = useState(null)
  const [showExamples, setShowExamples] = useState(false)
  const [selectedExampleTone, setSelectedExampleTone] = useState('expert')

  const handlePreview = (email) => {
    setPreviewEmail(email)
    setShowPreview(true)
  }

  const getSelectedClientName = () => {
    const client = clients.find(c => c.id === selectedClient)
    return client?.name || 'Client'
  }

  const handleUseTemplate = (toneKey) => {
    const sequence = demoSequences[toneKey]
    setTone(toneKey)
    setGeneratedEmails(sequence.emails)
    setEmailCount(sequence.emails.length)
    setShowExamples(false)
    toast.success(`Template "${sequence.name}" chargé`)
  }

  const toneIcons = {
    expert: Target,
    friendly: Heart,
    challenger: Zap,
    storyteller: BookOpen,
  }

  const tones = [
    { value: 'expert', label: '🎯 Expert', desc: 'Approche d\'autorité et d\'expertise' },
    { value: 'friendly', label: '🤝 Amical', desc: 'Ton conversationnel et accessible' },
    { value: 'challenger', label: '⚡ Challenger', desc: 'Remise en question constructive' },
    { value: 'storyteller', label: '📖 Storyteller', desc: 'Approche narrative et engageante' },
  ]

  const handleGenerate = async () => {
    if (!selectedClient) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    try {
      const result = await generate(selectedClient, null, { tone, emailCount })
      if (result?.emails && result.emails.length > 0) {
        setGeneratedEmails(result.emails)
        toast.success('Séquence générée avec succès')
      } else {
        toast.error('Aucun email généré. Veuillez réessayer.')
      }
    } catch (err) {
      console.error('Erreur génération:', err)
      toast.error('Erreur lors de la génération. Veuillez réessayer.')
    }
  }

  const handleCopy = (index, text) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSaveCampaign = async () => {
    if (!selectedClient || generatedEmails.length === 0) return
    await addCampaign({
      clientId: selectedClient,
      name: `Séquence ${tone} - ${new Date().toLocaleDateString('fr-FR')}`,
      tone,
      status: 'draft',
      emails: generatedEmails,
      emailCount: generatedEmails.length,
    })
  }

  // Demo emails pour preview
  const demoEmails = [
    {
      subject: 'Question rapide sur votre stratégie digitale',
      body: `Bonjour {prénom},\n\nJ'ai pris le temps d'analyser {entreprise} et votre positionnement sur le marché. Ce qui m'a frappé, c'est la qualité de votre offre — mais je pense que votre visibilité en ligne ne lui rend pas justice.\n\nJ'ai identifié 3 leviers concrets qui pourraient doubler votre flux de prospects qualifiés en 60 jours. Pas de la théorie, des actions précises adaptées à votre secteur.\n\nSeriez-vous ouvert à un échange de 15 min cette semaine pour que je vous les présente ?\n\nCordialement,\n{signature}`,
      delay: 'Jour 1',
    },
    {
      subject: 'Re: Les 3 leviers que j\'ai identifiés pour {entreprise}',
      body: `{prénom},\n\nJe me permets de revenir vers vous — j'ai finalisé l'analyse que j'avais commencée sur {entreprise}.\n\nConcrètement, voici ce que j'ai trouvé :\n→ Votre page d'accueil perd ~60% des visiteurs en moins de 3 secondes\n→ Vos concurrents investissent massivement sur un canal que vous n'exploitez pas\n→ Il y a une opportunité SEO inexploitée sur 12 mots-clés stratégiques\n\nJ'ai préparé un mini-audit gratuit de 2 pages. Voulez-vous que je vous l'envoie ?\n\nBonne journée,\n{signature}`,
      delay: 'Jour 3',
    },
    {
      subject: 'L\'audit de {entreprise} est prêt',
      body: `Bonjour {prénom},\n\nComme promis, j'ai finalisé le mini-audit pour {entreprise}. Il contient des recommandations actionnables que vous pouvez implémenter dès cette semaine.\n\nJe préfère vous le présenter en 15 min plutôt que de l'envoyer par mail — les chiffres ont plus d'impact quand on peut en discuter.\n\nQuel créneau vous conviendrait ?\n• Mardi entre 10h et 12h\n• Mercredi après 14h\n• Ou proposez-moi le vôtre\n\n{signature}`,
      delay: 'Jour 6',
    },
    {
      subject: 'Dernière relance — je ne vais pas insister',
      body: `{prénom},\n\nJe comprends que votre agenda est chargé. C'est mon dernier message sur ce sujet.\n\nSi un échange de 15 min sur la croissance de {entreprise} ne vous intéresse pas, aucun souci — je ne vous relancerai plus.\n\nMais si vous voulez en discuter dans les prochaines semaines/mois, ma porte est toujours ouverte. Répondez simplement "plus tard" et je vous recontacterai au moment qui vous convient.\n\nBelle continuation,\n{signature}`,
      delay: 'Jour 10',
    },
  ]

  const displayEmails = generatedEmails.length > 0 ? generatedEmails : []

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Mail className="w-8 h-8 text-blue-400" />
          Forgeur
        </h1>
        <p className="text-dark-400 mt-1">
          Générez des séquences email personnalisées par l'IA
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Config panel */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-5">
            <h2 className="section-title">Configuration</h2>

            {/* Client selector */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="input-field"
              >
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tone selector */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">Ton de la séquence</label>
              <div className="space-y-2">
                {tones.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      tone === t.value
                        ? 'border-brand-500/50 bg-brand-500/5'
                        : 'border-dark-700 bg-dark-800/30 hover:border-dark-600'
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{t.label}</p>
                    <p className="text-xs text-dark-500">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Email count */}
            <div>
              <label className="block text-sm text-dark-300 mb-2">
                Nombre d'emails : {emailCount}
              </label>
              <input
                type="range"
                min={2}
                max={6}
                value={emailCount}
                onChange={(e) => setEmailCount(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-xs text-dark-500 mt-1">
                <span>2</span>
                <span>6</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedClient || generating}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Générer la séquence
                </>
              )}
            </button>

            <button
              onClick={() => setShowExamples(true)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Voir les exemples
            </button>
          </div>

          {/* Saved campaigns */}
          {campaigns.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-dark-300 mb-3">Séquences sauvegardées</h3>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/30">
                    <div>
                      <p className="text-sm text-white">{c.name}</p>
                      <p className="text-xs text-dark-500">{c.emailCount} emails</p>
                    </div>
                    <span className={c.status === 'active' ? 'badge-success' : 'badge-info'}>
                      {c.status === 'active' ? 'Active' : 'Brouillon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2 space-y-4">
          {displayEmails.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <Mail className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold text-dark-400">
                Aucune séquence générée
              </h3>
              <p className="text-dark-500 text-sm mt-2">
                Sélectionnez un client et cliquez sur "Générer" pour créer votre séquence
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="section-title">
                  Séquence générée ({displayEmails.length} emails)
                </h2>
                <div className="flex gap-2">
                  <button onClick={handleSaveCampaign} className="btn-secondary text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Sauvegarder
                  </button>
                  <button className="btn-primary text-sm flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Activer
                  </button>
                </div>
              </div>

              {/* Email timeline */}
              <div className="space-y-3">
                {displayEmails.map((email, index) => (
                  <div key={index} className="glass-card overflow-hidden">
                    <button
                      onClick={() => setExpandedEmail(expandedEmail === index ? -1 : index)}
                      className="w-full flex items-center justify-between p-5 hover:bg-dark-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-sm font-bold text-brand-400">
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{email.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-dark-500" />
                            <span className="text-xs text-dark-500">{email.delay}</span>
                          </div>
                        </div>
                      </div>
                      {expandedEmail === index ? (
                        <ChevronUp className="w-5 h-5 text-dark-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-dark-400" />
                      )}
                    </button>

                    {expandedEmail === index && (
                      <div className="px-5 pb-5 border-t border-dark-800/50">
                        <div className="mt-4 p-4 rounded-xl bg-dark-800/30 font-mono text-sm text-dark-300 whitespace-pre-wrap leading-relaxed">
                          {email.body}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleCopy(index, email.body)}
                            className="btn-ghost text-xs flex items-center gap-1.5"
                          >
                            {copied === index ? (
                              <><Check className="w-3.5 h-3.5 text-brand-400" /> Copié</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" /> Copier</>
                            )}
                          </button>
                          <button
                            onClick={() => handlePreview(email)}
                            className="btn-ghost text-xs flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Prévisualiser
                          </button>
                          <button className="btn-ghost text-xs flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" /> Modifier
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreview && previewEmail && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowPreview(false)}
                className="text-dark-400 hover:text-white text-sm"
              >
                Fermer ✕
              </button>
            </div>
            <EmailPreview
              from={{
                name: org?.name || 'Face Media',
                email: org?.senderEmail || 'contact@facemedia.fr'
              }}
              to={`prospect@${getSelectedClientName().toLowerCase().replace(/\s+/g, '')}.com`}
              subject={previewEmail.subject.replace('{entreprise}', getSelectedClientName())}
              body={previewEmail.body
                .replace(/{prénom}/g, 'Jean')
                .replace(/{entreprise}/g, getSelectedClientName())
                .replace(/{signature}/g, org?.signature || 'Cordialement,\nL\'équipe Face Media')}
              date={new Date()}
            />
          </div>
        </div>
      )}

      {/* Demo Sequences Modal */}
      <Modal
        isOpen={showExamples}
        onClose={() => setShowExamples(false)}
        title="Exemples de séquences"
        size="xl"
      >
        <div className="space-y-6">
          <p className="text-dark-400 text-sm">
            Choisissez un template pour pré-remplir votre séquence, puis personnalisez-le selon vos besoins.
          </p>

          {/* Tone selector tabs */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(demoSequences).map(([key, seq]) => {
              const Icon = toneIcons[key]
              return (
                <button
                  key={key}
                  onClick={() => setSelectedExampleTone(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedExampleTone === key
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/50'
                      : 'bg-dark-800/50 text-dark-300 border border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {seq.name}
                </button>
              )
            })}
          </div>

          {/* Selected sequence preview */}
          {demoSequences[selectedExampleTone] && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">{demoSequences[selectedExampleTone].name}</h4>
                  <p className="text-dark-500 text-sm">{demoSequences[selectedExampleTone].description}</p>
                </div>
                <button
                  onClick={() => handleUseTemplate(selectedExampleTone)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Utiliser ce template
                </button>
              </div>

              {/* Tone description */}
              {toneDescriptions[selectedExampleTone] && (
                <div className="p-4 rounded-xl bg-dark-800/30 border border-dark-700">
                  <p className="text-dark-300 text-sm mb-2">{toneDescriptions[selectedExampleTone].description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-dark-500 text-xs">Idéal pour :</span>
                    {toneDescriptions[selectedExampleTone].bestFor.map((item, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-dark-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emails preview */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {demoSequences[selectedExampleTone].emails.map((email, index) => (
                  <div key={index} className="p-4 rounded-xl bg-dark-800/30 border border-dark-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center text-xs font-bold text-brand-400">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{email.subject}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-dark-500 text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {email.delay}
                          </span>
                          {email.psychology && (
                            <span className="text-brand-400/70 text-xs">• {email.psychology}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-dark-400 text-xs whitespace-pre-wrap line-clamp-4 font-mono">
                      {email.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
