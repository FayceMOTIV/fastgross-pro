/**
 * Puter Message Generator Component (Client-Side AI)
 * Uses Puter.js - User pays, unlimited for the app
 */

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  CheckCircle,
  User,
  Target,
  ExternalLink,
  AlertCircle,
  Infinity
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PuterMessageGenerator() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [puterReady, setPuterReady] = useState(false)

  const [formData, setFormData] = useState({
    prospectName: '',
    prospectBio: '',
    prospectCategory: '',
    targetService: 'Services de creation de contenu video'
  })

  // Check if Puter.js is loaded
  useEffect(() => {
    const checkPuter = () => {
      if (typeof window !== 'undefined' && window.puter) {
        setPuterReady(true)
      } else {
        // Try to load Puter.js dynamically
        const script = document.createElement('script')
        script.src = 'https://js.puter.com/v2/'
        script.async = true
        script.onload = () => {
          setPuterReady(true)
        }
        script.onerror = () => {
          console.error('Failed to load Puter.js')
        }
        document.head.appendChild(script)
      }
    }
    checkPuter()
  }, [])

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

    if (!puterReady || !window.puter) {
      toast.error('Puter.js non disponible')
      return
    }

    setLoading(true)
    setResult(null)

    const prompt = `Tu es un expert en prospection B2B. Analyse ce prospect et genere 3 angles de personnalisation pour une approche commerciale.

PROSPECT :
- Nom : ${formData.prospectName}
- Bio : ${formData.prospectBio}
- Categorie : ${formData.prospectCategory || 'Non specifie'}

SERVICE A PROPOSER : ${formData.targetService}

GENERE 3 ANGLES DE PERSONNALISATION :
1. Un angle base sur leur contenu/activite
2. Un angle base sur leur audience/marche
3. Un angle base sur leurs objectifs business apparents

Reponds UNIQUEMENT avec un JSON valide, sans markdown :
{
  "angle1": "...",
  "angle2": "...",
  "angle3": "..."
}`

    const startTime = Date.now()

    try {
      const response = await window.puter.ai.chat(prompt)
      const latency = Date.now() - startTime

      // Parse response
      let angles
      try {
        // Clean response (remove markdown if present)
        let cleanResponse = response
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()

        const parsed = JSON.parse(cleanResponse)
        angles = [parsed.angle1, parsed.angle2, parsed.angle3]
      } catch {
        // If JSON parsing fails, treat as plain text
        angles = [response]
      }

      setResult({
        angles,
        provider: 'puter',
        model: 'gpt-4o-mini',
        latency
      })

      toast.success(`Genere via Puter en ${latency}ms`)
    } catch (err) {
      console.error('Error with Puter AI:', err)
      toast.error(err.message || 'Erreur Puter AI')
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
      prospectName: 'Marie Dupont',
      prospectBio: 'Formatrice en marketing digital | Ex-Google | J\'aide les entrepreneurs a scaler leur business en ligne',
      prospectCategory: 'Formatrice',
      targetService: 'Services de creation de contenu video'
    })
    toast.success('Donnees demo chargees')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Generateur Puter.js
          </h3>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Infinity className="w-4 h-4" />
            Illimite (cote utilisateur)
          </p>
        </div>
        <button
          onClick={fillDemoData}
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Charger demo
        </button>
      </div>

      {/* Puter Status Banner */}
      {!puterReady && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Chargement de Puter.js...</span>
        </div>
      )}

      {puterReady && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">Puter.js pret - Utilisation gratuite illimitee</span>
          </div>
          <a
            href="https://puter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            En savoir plus
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Ex: Marie Dupont"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categorie
            </label>
            <input
              type="text"
              name="prospectCategory"
              value={formData.prospectCategory}
              onChange={handleChange}
              placeholder="Ex: Coach, Consultant..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
          />
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !puterReady}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generation en cours...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Generer (gratuit)
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
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                {result.provider}
              </span>
              <span>{result.latency}ms</span>
            </div>
          </div>

          <div className="space-y-3">
            {result.angles?.map((angle, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded mb-2">
                      Angle {index + 1}
                    </span>
                    <p className="text-gray-800">{angle}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(angle, index)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
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
