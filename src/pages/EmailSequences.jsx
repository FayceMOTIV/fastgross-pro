/**
 * Email Sequences Page
 * Create and manage email sequence campaigns
 */

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Plus,
  Mail,
  Trash2,
  Edit2,
  Send,
  Clock,
  TrendingUp,
  Eye,
  X,
  Loader2,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'

export default function EmailSequences() {
  const { user } = useAuth()
  const { currentOrg } = useOrg()
  const [sequences, setSequences] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedSeq, setExpandedSeq] = useState(null)

  useEffect(() => {
    if (currentOrg?.id) {
      loadSequences()
    }
  }, [currentOrg])

  async function loadSequences() {
    try {
      const seqRef = collection(db, 'organizations', currentOrg.id, 'emailSequences')
      const seqQuery = query(seqRef, orderBy('createdAt', 'desc'))
      const seqSnapshot = await getDocs(seqQuery)

      const loadedSequences = seqSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))

      setSequences(loadedSequences)
    } catch (error) {
      console.error('Error loading sequences:', error)
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  async function deleteSequence(seqId) {
    if (!confirm('Supprimer cette sequence ?')) return

    try {
      await deleteDoc(doc(db, 'organizations', currentOrg.id, 'emailSequences', seqId))
      setSequences(sequences.filter((s) => s.id !== seqId))
      toast.success('Sequence supprimee')
    } catch (error) {
      console.error('Error deleting sequence:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  async function toggleSequenceStatus(seqId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'

    try {
      await updateDoc(doc(db, 'organizations', currentOrg.id, 'emailSequences', seqId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })

      setSequences(sequences.map((s) =>
        s.id === seqId ? { ...s, status: newStatus } : s
      ))

      toast.success(newStatus === 'active' ? 'Sequence activee' : 'Sequence mise en pause')
    } catch (error) {
      console.error('Error updating sequence:', error)
      toast.error('Erreur')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des sequences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-indigo-600" />
            Sequences Email
          </h1>
          <p className="text-gray-500 mt-1">
            Cree et gere tes campagnes email automatisees
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Sequence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Mail className="w-5 h-5 text-blue-600" />}
          label="Sequences"
          value={sequences.length}
        />
        <StatCard
          icon={<Play className="w-5 h-5 text-green-600" />}
          label="Actives"
          value={sequences.filter((s) => s.status === 'active').length}
        />
        <StatCard
          icon={<Send className="w-5 h-5 text-purple-600" />}
          label="Emails envoyes"
          value="0"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
          label="Taux ouverture"
          value="0%"
        />
      </div>

      {/* Sequences List */}
      {sequences.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Aucune sequence</h3>
          <p className="text-gray-500 mb-6">
            Cree ta premiere sequence email pour automatiser ton outreach
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-5 h-5" />
            Creer une sequence
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              expanded={expandedSeq === seq.id}
              onToggleExpand={() => setExpandedSeq(expandedSeq === seq.id ? null : seq.id)}
              onDelete={() => deleteSequence(seq.id)}
              onToggleStatus={() => toggleSequenceStatus(seq.id, seq.status)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSequenceModal
          orgId={currentOrg.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadSequences()
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

function SequenceCard({ sequence, expanded, onToggleExpand, onDelete, onToggleStatus }) {
  const totalSteps = sequence.steps?.length || 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{sequence.name}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  sequence.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {sequence.status === 'active' ? 'Actif' : 'Pause'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {totalSteps} etape{totalSteps > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {sequence.createdAt?.toDate?.()?.toLocaleDateString('fr-FR') || 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStatus}
              className={`p-2 rounded-lg transition ${
                sequence.status === 'active'
                  ? 'text-yellow-600 hover:bg-yellow-50'
                  : 'text-green-600 hover:bg-green-50'
              }`}
              title={sequence.status === 'active' ? 'Mettre en pause' : 'Activer'}
            >
              {sequence.status === 'active' ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Supprimer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500">Envoyes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500">Ouverts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500">Reponses</p>
          </div>
        </div>
      </div>

      {/* Expanded Steps */}
      {expanded && sequence.steps && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <h4 className="font-semibold text-gray-700 mb-4 pt-4">Etapes de la sequence</h4>
          <div className="space-y-3">
            {sequence.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {step.stepNumber || index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {step.subject || '(Sans sujet)'}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.delayDays === 0 ? 'Immediat' : `J+${step.delayDays}`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {step.template || '(Message vide)'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateSequenceModal({ orgId, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [steps, setSteps] = useState([
    { stepNumber: 1, delayDays: 0, subject: '', template: '' },
  ])
  const [saving, setSaving] = useState(false)

  function addStep() {
    if (steps.length >= 7) {
      toast.error('Maximum 7 etapes')
      return
    }
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        delayDays: steps.length === 0 ? 0 : 3,
        subject: '',
        template: '',
      },
    ])
  }

  function removeStep(index) {
    if (steps.length <= 1) return
    const updated = steps.filter((_, i) => i !== index)
    // Re-number steps
    updated.forEach((step, i) => {
      step.stepNumber = i + 1
    })
    setSteps(updated)
  }

  function updateStep(index, field, value) {
    const updated = [...steps]
    updated[index][field] = value
    setSteps(updated)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Nom de la sequence requis')
      return
    }

    if (steps.some((s) => !s.subject.trim() || !s.template.trim())) {
      toast.error('Chaque etape doit avoir un sujet et un message')
      return
    }

    setSaving(true)

    try {
      await addDoc(collection(db, 'organizations', orgId, 'emailSequences'), {
        name: name.trim(),
        steps,
        status: 'active',
        stats: {
          sent: 0,
          opened: 0,
          replied: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success('Sequence creee avec succes')
      onCreated()
    } catch (error) {
      console.error('Error creating sequence:', error)
      toast.error('Erreur lors de la creation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Creer une Sequence Email
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom de la sequence
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: TikTok Cold Outreach"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">
                Etapes ({steps.length}/7)
              </h3>
            </div>

            {steps.map((step, index) => (
              <StepEditor
                key={index}
                step={step}
                index={index}
                onUpdate={(field, value) => updateStep(index, field, value)}
                onRemove={() => removeStep(index)}
                canRemove={steps.length > 1}
              />
            ))}

            <button
              onClick={addStep}
              disabled={steps.length >= 7}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une etape
              {steps.length >= 7 && <span className="text-xs">(Max atteint)</span>}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-medium flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Creer la Sequence
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepEditor({ step, index, onUpdate, onRemove, canRemove }) {
  return (
    <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-200 transition">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-gray-900 flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
            {step.stepNumber}
          </div>
          Etape {step.stepNumber}
          {step.delayDays === 0 ? (
            <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-1 rounded">
              Immediat
            </span>
          ) : (
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
              J+{step.delayDays}
            </span>
          )}
        </h4>

        {canRemove && (
          <button
            onClick={onRemove}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Delai (jours)
          </label>
          <input
            type="number"
            min="0"
            max="30"
            value={step.delayDays}
            onChange={(e) => onUpdate('delayDays', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Sujet
          </label>
          <input
            type="text"
            value={step.subject}
            onChange={(e) => onUpdate('subject', e.target.value)}
            placeholder="Ex: Automatise ta prospection TikTok"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Message
          <span className="ml-2 font-normal text-gray-400">
            Variables: {'{firstName}'}, {'{fullName}'}, {'{username}'}, {'{company}'}
          </span>
        </label>
        <textarea
          value={step.template}
          onChange={(e) => onUpdate('template', e.target.value)}
          placeholder={`Salut {firstName},

J'ai vu ton profil et je pense que Face Media Factory pourrait t'interesser.

On automatise la prospection sur Instagram, TikTok et LinkedIn.

Interesse ?`}
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  )
}
