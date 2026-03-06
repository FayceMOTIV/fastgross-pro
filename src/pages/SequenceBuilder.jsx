import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '@/contexts/OrgContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import { collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Plus,
  Mail,
  MessageSquare,
  Phone,
  Linkedin,
  Clock,
  Trash2,
  Copy,
  Play,
  Pause,
  Wand2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Zap,
  BarChart3,
  Users,
  ArrowRight,
  Loader2,
  Workflow,
  Settings,
} from 'lucide-react'

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  linkedin: Linkedin,
  call: Phone,
}

const CHANNEL_COLORS = {
  email: 'bg-blue-100 text-blue-700 border-blue-200',
  sms: 'bg-green-100 text-green-700 border-green-200',
  whatsapp: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  linkedin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  call: 'bg-amber-100 text-amber-700 border-amber-200',
}

// Psych sequence template (from psychSequenceEngine)
const PSYCH_TECHNIQUES = {
  curiosity: { label: 'Curiosite', color: 'text-purple-600 bg-purple-50', emoji: '🤔' },
  value: { label: 'Valeur', color: 'text-blue-600 bg-blue-50', emoji: '💎' },
  social_proof: { label: 'Preuve sociale', color: 'text-green-600 bg-green-50', emoji: '⭐' },
  urgency: { label: 'Urgence', color: 'text-orange-600 bg-orange-50', emoji: '⏰' },
  rupture: { label: 'Rupture', color: 'text-red-600 bg-red-50', emoji: '🚪' },
}

const TEMPLATES = [
  {
    name: 'Psychologique - 14 jours',
    desc: 'Sequence basee sur la psychologie de vente',
    psychEnabled: true,
    steps: [
      {
        channel: 'email',
        delay: 0,
        content: 'Question intrigante (curiosite)',
        conditions: {},
        technique: 'curiosity',
      },
      {
        channel: 'email',
        delay: 3,
        content: 'Insight gratuit personnalise (valeur)',
        conditions: { skipIfReplied: true },
        technique: 'value',
      },
      {
        channel: 'whatsapp',
        delay: 5,
        content: 'Message court + cas client (preuve sociale)',
        conditions: { skipIfReplied: true },
        technique: 'social_proof',
      },
      {
        channel: 'email',
        delay: 7,
        content: 'Cas client similaire (preuve sociale)',
        conditions: { skipIfReplied: true },
        technique: 'social_proof',
      },
      {
        channel: 'email',
        delay: 10,
        content: 'Offre limitee dans le temps (urgence)',
        conditions: { skipIfReplied: true },
        technique: 'urgency',
      },
      {
        channel: 'email',
        delay: 14,
        content: 'Cloture du dossier (rupture)',
        conditions: { skipIfReplied: true },
        technique: 'rupture',
      },
    ],
  },
  {
    name: '7 touches - 21 jours',
    desc: 'Sequence standard B2B',
    steps: [
      { channel: 'email', delay: 0, content: 'Premier email de prospection', conditions: {} },
      {
        channel: 'email',
        delay: 3,
        content: 'Relance email #1',
        conditions: { skipIfReplied: true },
      },
      {
        channel: 'linkedin',
        delay: 5,
        content: 'Connexion LinkedIn',
        conditions: { skipIfReplied: true },
      },
      {
        channel: 'email',
        delay: 7,
        content: 'Email valeur ajoutee',
        conditions: { skipIfReplied: true },
      },
      { channel: 'sms', delay: 10, content: 'SMS court', conditions: { skipIfReplied: true } },
      {
        channel: 'email',
        delay: 14,
        content: 'Dernier email',
        conditions: { skipIfReplied: true },
      },
      {
        channel: 'call',
        delay: 21,
        content: 'Appel telephonique',
        conditions: { skipIfReplied: true, onlyIfScoreAbove: 50 },
      },
    ],
  },
  {
    name: 'Hot Lead - 3 jours',
    desc: 'Leads tres chauds, action rapide',
    steps: [
      { channel: 'email', delay: 0, content: 'Email personnalise urgent', conditions: {} },
      { channel: 'call', delay: 1, content: 'Appel direct', conditions: { onlyIfScoreAbove: 70 } },
      {
        channel: 'sms',
        delay: 2,
        content: 'SMS avec lien calendly',
        conditions: { skipIfReplied: true },
      },
      {
        channel: 'email',
        delay: 3,
        content: 'Derniere relance',
        conditions: { skipIfReplied: true },
      },
    ],
  },
  {
    name: 'Nurturing - 90 jours',
    desc: 'Leads froids, nurturing long terme',
    steps: [
      { channel: 'email', delay: 0, content: 'Email introduction', conditions: {} },
      {
        channel: 'email',
        delay: 14,
        content: 'Contenu educatif #1',
        conditions: { skipIfReplied: true },
      },
      { channel: 'linkedin', delay: 21, content: 'Connexion + message', conditions: {} },
      { channel: 'email', delay: 30, content: 'Etude de cas', conditions: { skipIfReplied: true } },
      {
        channel: 'email',
        delay: 60,
        content: 'Offre speciale',
        conditions: { skipIfReplied: true },
      },
      {
        channel: 'email',
        delay: 90,
        content: 'Dernier contact',
        conditions: { skipIfReplied: true },
      },
    ],
  },
  {
    name: 'Concurrent Review',
    desc: 'Prospects utilisant un concurrent',
    steps: [
      { channel: 'email', delay: 0, content: 'Comparaison objective', conditions: {} },
      {
        channel: 'email',
        delay: 4,
        content: 'Etude de cas migration',
        conditions: { skipIfReplied: true },
      },
      {
        channel: 'call',
        delay: 7,
        content: 'Appel decouverte',
        conditions: { skipIfReplied: true, onlyIfScoreAbove: 40 },
      },
      {
        channel: 'email',
        delay: 14,
        content: 'Offre migration',
        conditions: { skipIfReplied: true },
      },
    ],
  },
]

const VARIABLES = ['{prenom}', '{entreprise}', '{site_web}', '{signal_intention}', '{poste}']

function StepCard({ step, index, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = CHANNEL_ICONS[step.channel] || Mail
  const color = CHANNEL_COLORS[step.channel] || CHANNEL_COLORS.email

  return (
    <Draggable draggableId={`step-${index}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`border rounded-xl bg-white transition-shadow ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}`}
        >
          <div className="flex items-center gap-3 p-3">
            <div
              {...provided.dragHandleProps}
              className="cursor-grab text-gray-300 hover:text-gray-500"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Etape {index + 1}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  J+{step.delay}
                </span>
                {step.technique && PSYCH_TECHNIQUES[step.technique] && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded font-medium ${PSYCH_TECHNIQUES[step.technique].color}`}
                  >
                    {PSYCH_TECHNIQUES[step.technique].emoji}{' '}
                    {PSYCH_TECHNIQUES[step.technique].label}
                  </span>
                )}
                {step.conditions?.skipIfReplied && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                    Skip si repondu
                  </span>
                )}
                {step.conditions?.onlyIfScoreAbove && (
                  <span className="text-xs px-1.5 py-0.5 bg-indigo-50 rounded text-indigo-600">
                    Score &gt; {step.conditions.onlyIfScoreAbove}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 truncate mt-0.5">
                {step.content || 'Message vide'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expanded && (
            <div className="border-t p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Canal</label>
                  <select
                    value={step.channel}
                    onChange={(e) => onUpdate({ ...step, channel: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="call">Appel</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Delai (jours)</label>
                  <input
                    type="number"
                    min={0}
                    value={step.delay}
                    onChange={(e) => onUpdate({ ...step, delay: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Message</label>
                <textarea
                  value={step.content}
                  onChange={(e) => onUpdate({ ...step, content: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Bonjour {prenom}, ..."
                />
                <div className="flex gap-1 mt-1 flex-wrap">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      onClick={() => onUpdate({ ...step, content: (step.content || '') + ' ' + v })}
                      className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Conditions</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={step.conditions?.skipIfReplied || false}
                      onChange={(e) =>
                        onUpdate({
                          ...step,
                          conditions: { ...step.conditions, skipIfReplied: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    Skip si repondu
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={step.conditions?.skipIfOpened || false}
                      onChange={(e) =>
                        onUpdate({
                          ...step,
                          conditions: { ...step.conditions, skipIfOpened: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    Skip si ouvert
                  </label>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    Score min:
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={step.conditions?.onlyIfScoreAbove || ''}
                      onChange={(e) =>
                        onUpdate({
                          ...step,
                          conditions: {
                            ...step.conditions,
                            onlyIfScoreAbove: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-14 border border-gray-200 rounded px-1.5 py-0.5 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

export default function SequenceBuilder() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [sequences, setSequences] = useState([])
  const [selectedSeq, setSelectedSeq] = useState(null)
  const [steps, setSteps] = useState([])
  const [seqName, setSeqName] = useState('')
  const [generating, setGenerating] = useState(false)
  const { callFunction } = useCloudFunction()

  // Load sequences
  useEffect(() => {
    if (!orgId) {
      setSequences(
        TEMPLATES.map((t, i) => ({
          id: `template-${i}`,
          name: t.name,
          desc: t.desc,
          steps: t.steps,
          stepsCount: t.steps.length,
          active: i === 0,
          leadsActive: [12, 5, 8, 3][i],
          replyRate: [8.5, 15.2, 3.1, 6.7][i],
        }))
      )
      return
    }
    const ref = collection(db, 'organizations', orgId, 'sequences')
    const q = query(ref, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setSequences(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [orgId])

  const selectSequence = (seq) => {
    setSelectedSeq(seq)
    setSeqName(seq.name || '')
    setSteps(seq.steps || [])
  }

  const loadTemplate = (template) => {
    setSelectedSeq(null)
    setSeqName(template.name)
    setSteps([...template.steps])
  }

  const addStep = () => {
    setSteps([
      ...steps,
      {
        channel: 'email',
        delay: steps.length > 0 ? (steps[steps.length - 1].delay || 0) + 3 : 0,
        content: '',
        conditions: { skipIfReplied: true },
      },
    ])
  }

  const updateStep = (index, updated) => {
    const newSteps = [...steps]
    newSteps[index] = updated
    setSteps(newSteps)
  }

  const deleteStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const onDragEnd = (result) => {
    if (!result.destination) return
    const reordered = [...steps]
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setSteps(reordered)
  }

  const saveSequence = async () => {
    if (!seqName || steps.length === 0) {
      toast.error('Nom et au moins 1 etape requis')
      return
    }
    if (!orgId) {
      toast.success('[Demo] Sequence sauvegardee')
      return
    }
    try {
      const seqId = selectedSeq?.id || doc(collection(db, 'organizations', orgId, 'sequences')).id
      await setDoc(doc(db, 'organizations', orgId, 'sequences', seqId), {
        name: seqName,
        steps,
        stepsCount: steps.length,
        active: selectedSeq?.active ?? false,
        updatedAt: new Date(),
        createdAt: selectedSeq?.createdAt || new Date(),
      })
      toast.success('Sequence sauvegardee')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const generateWithAI = async () => {
    if (!seqName) {
      toast.error("Donnez un nom a la sequence d'abord")
      return
    }
    setGenerating(true)
    try {
      if (!orgId) {
        // Demo: generate from template
        const template = TEMPLATES[0]
        setSteps([...template.steps])
        toast.success('[Demo] Sequence generee par IA')
      } else {
        const result = await callFunction('generateSequence', {
          orgId,
          name: seqName,
          stepsCount: 5,
        })
        if (result?.steps) setSteps(result.steps)
        toast.success('Sequence generee par IA')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left: Sequence list */}
      <div className="w-72 border-r bg-gray-50 overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-indigo-500" />
            Sequences
          </h2>
        </div>

        {/* Templates */}
        <div className="p-3">
          <p className="text-xs font-medium text-gray-400 uppercase mb-2">Templates</p>
          <div className="space-y-1">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => loadTemplate(t)}
                className="w-full text-left p-2 rounded-lg hover:bg-white hover:shadow-sm text-sm transition-all"
              >
                <p className="font-medium text-gray-700">{t.name}</p>
                <p className="text-xs text-gray-400">{t.steps.length} etapes</p>
              </button>
            ))}
          </div>
        </div>

        {/* Saved sequences */}
        <div className="p-3 border-t">
          <p className="text-xs font-medium text-gray-400 uppercase mb-2">Mes sequences</p>
          <div className="space-y-1">
            {sequences.map((seq) => (
              <button
                key={seq.id}
                onClick={() => selectSequence(seq)}
                className={`w-full text-left p-2 rounded-lg text-sm transition-all ${
                  selectedSeq?.id === seq.id
                    ? 'bg-indigo-50 border border-indigo-200'
                    : 'hover:bg-white hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-700">{seq.name}</p>
                  {seq.active && <span className="w-2 h-2 rounded-full bg-green-400" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {seq.stepsCount || seq.steps?.length || 0} etapes
                  </span>
                  {seq.leadsActive > 0 && (
                    <span className="text-xs text-gray-400">· {seq.leadsActive} leads</span>
                  )}
                  {seq.replyRate > 0 && (
                    <span className="text-xs text-green-600">{seq.replyRate}%</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {/* Sequence header */}
          <div className="flex items-center gap-3 mb-6">
            <input
              value={seqName}
              onChange={(e) => setSeqName(e.target.value)}
              placeholder="Nom de la sequence..."
              className="flex-1 text-lg font-bold text-gray-900 border-0 border-b-2 border-transparent focus:border-indigo-400 bg-transparent outline-none px-0"
            />
            <button
              onClick={generateWithAI}
              disabled={generating}
              className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generer IA
            </button>
            <button
              onClick={saveSequence}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Sauvegarder
            </button>
          </div>

          {/* Steps timeline */}
          {steps.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Workflow className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">Aucune etape</p>
              <p className="text-sm mt-1 mb-4">Choisissez un template ou ajoutez des etapes</p>
              <button
                onClick={addStep}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Ajouter une etape
              </button>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="steps">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {steps.map((step, index) => (
                      <div key={`step-${index}`}>
                        {index > 0 && (
                          <div className="flex items-center justify-center py-1">
                            <div className="w-px h-4 bg-gray-200" />
                          </div>
                        )}
                        <StepCard
                          step={step}
                          index={index}
                          onUpdate={(updated) => updateStep(index, updated)}
                          onDelete={() => deleteStep(index)}
                        />
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {steps.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={addStep}
                className="px-4 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-indigo-300 hover:text-indigo-600 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter une etape
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
