/**
 * Message Generator Component (Backend AI)
 * Uses Groq/OpenRouter/Gemini via Cloud Functions
 */

import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  Zap,
  Send,
  Loader2,
  Copy,
  CheckCircle,
  User,
  Briefcase,
  Users,
  Target,
  Sparkles,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MessageGenerator() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)

  const [formData, setFormData] = useState({
    prospectName: '',
    prospectBio: '',
    prospectCategory: '',
    prospectFollowers: '',
    businessType: '',
    targetService: 'Services de creation de contenu video',
    strategy: 'speed'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.prospectName || !formData.prospectBio) {
      toast.error('Nom et bio du prospect requis')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const personalizeMessage = httpsCallable(functions, 'personalizeMessage')
      const response = await personalizeMessage(formData)

      if (response.data.success) {
        setResult(response.data.data)
        toast.success(`Genere via ${response.data.data.provider} en ${response.data.data.latency}ms`)
      } else {
        throw new Error('Generation failed')
      }
    } catch (err) {
      console.error('Error generating personalization:', err)
      toast.error(err.message || 'Erreur lors de la generation')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success('Copie dans le presse-papier')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error('Erreur de copie')
    }
  }

  const fillDemoData = () => {
    setFormData({
      prospectName: 'Sophie Martin',
      prospectBio: 'Coach en developpement personnel | Auteure | Conferences TEDx | +50K vies transformees',
      prospectCategory: 'Coach',
      prospectFollowers: '45000',
      businessType: 'Coaching',
      targetService: 'Services de creation de contenu video',
      strategy: 'speed'
    })
    toast.success('Donnees demo chargees')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Generateur Backend
          </h3>
          <p className="text-sm text-gray-500">Groq / OpenRouter / Gemini</p>
        </div>
        <button
          onClick={fillDemoData}
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Charger demo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prospect Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Nom du prospect *
            </label>
            <input
              type="text"
              name="prospectName"
              value={formData.prospectName}
              onChange={handleChange}
              placeholder="Ex: Sophie Martin"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Categorie
            </label>
            <input
              type="text"
              name="prospectCategory"
              value={formData.prospectCategory}
              onChange={handleChange}
              placeholder="Ex: Coach, Consultant..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Target className="w-4 h-4 inline mr-1" />
            Bio du prospect *
          </label>
          <textarea
            name="prospectBio"
            value={formData.prospectBio}
            onChange={handleChange}
            rows={3}
            placeholder="Collez la bio Instagram/LinkedIn du prospect..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Followers
            </label>
            <input
              type="text"
              name="prospectFollowers"
              value={formData.prospectFollowers}
              onChange={handleChange}
              placeholder="Ex: 10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de business
            </label>
            <input
              type="text"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              placeholder="Ex: SaaS, Coaching..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strategie
            </label>
            <select
              name="strategy"
              value={formData.strategy}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="speed">Vitesse (Groq prioritaire)</option>
              <option value="balanced">Equilibre (rotation)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service a proposer
          </label>
          <input
            type="text"
            name="targetService"
            value={formData.targetService}
            onChange={handleChange}
            placeholder="Ex: Services de creation de contenu video"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generation en cours...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Generer les angles
            </>
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Angles de personnalisation
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded-full">{result.provider}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {result.latency}ms
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {result.angles?.map((angle, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded mb-2">
                      Angle {index + 1}
                    </span>
                    <p className="text-gray-800">{angle}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(angle, index)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Copier"
                  >
                    {copiedIndex === index ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
