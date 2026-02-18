/**
 * AI Personalization Page
 * Multi-provider AI system for generating personalized prospect messages
 *
 * Features:
 * - Backend generators (Groq, OpenRouter, Gemini) via Cloud Functions
 * - Frontend generator (Puter.js) - unlimited, user pays
 * - Provider status dashboard with real-time stats
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Zap,
  Server,
  Globe,
  TrendingUp,
  Info,
  ChevronRight
} from 'lucide-react'

import ProviderStatus from '@/components/ai/ProviderStatus'
import MessageGenerator from '@/components/ai/MessageGenerator'
import PuterMessageGenerator from '@/components/ai/PuterMessageGenerator'

// Tabs configuration
const TABS = [
  {
    id: 'backend',
    label: 'Backend (Serveur)',
    icon: Server,
    description: 'Groq, OpenRouter, Gemini - 16K req/jour gratuits',
    color: 'text-orange-500',
    bg: 'bg-orange-50'
  },
  {
    id: 'puter',
    label: 'Puter.js (Client)',
    icon: Globe,
    description: 'GPT-4o-mini illimite - L\'utilisateur paie',
    color: 'text-purple-500',
    bg: 'bg-purple-50'
  }
]

export default function AIPersonalization() {
  const [activeTab, setActiveTab] = useState('backend')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-500" />
            AI Personalization
          </h1>
          <p className="text-gray-600 mt-1">
            Generez des angles de personnalisation pour vos prospects
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <strong>Capacite totale :</strong> 16,200 requetes/jour gratuites via le backend
              (Groq 14.4K + OpenRouter 1K + Gemini 1K) + illimite via Puter.js cote client.
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                Groq: 300 tok/sec
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                OpenRouter: 4 modeles
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Gemini: 1M context
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Provider Status */}
      <ProviderStatus />

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 flex gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? `${tab.bg} ${tab.color} font-medium`
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </button>
          )
        })}
      </div>

      {/* Tab Description */}
      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
        {TABS.find((t) => t.id === activeTab)?.description}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'backend' && <MessageGenerator />}
        {activeTab === 'puter' && <PuterMessageGenerator />}
      </motion.div>

      {/* Usage Tips */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Conseils d'utilisation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-orange-700">Backend (Groq)</span>
            </div>
            <p className="text-sm text-orange-600">
              Ideal pour les gros volumes. Ultra-rapide (300 tokens/sec).
              14,400 requetes/jour gratuites.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-purple-500" />
              <span className="font-medium text-purple-700">Puter.js (Client)</span>
            </div>
            <p className="text-sm text-purple-600">
              Illimite pour vous. L'utilisateur se connecte a son compte Puter
              et paie ses propres tokens.
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-700">Fallback automatique</span>
            </div>
            <p className="text-sm text-blue-600">
              Si Groq est indisponible, le systeme bascule automatiquement
              vers OpenRouter puis Gemini.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
