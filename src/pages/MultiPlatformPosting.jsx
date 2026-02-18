/**
 * Multi-Platform Posting Page
 * Post to 13 platforms in 1 click (Postiz unlimited + Late API 20/month)
 */

import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  Send,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Clock,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'from-purple-500 to-pink-500' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-gray-900 to-gray-700' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'from-blue-600 to-blue-800' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'from-blue-400 to-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: '👥', color: 'from-blue-500 to-blue-700' },
  { id: 'threads', name: 'Threads', icon: '🧵', color: 'from-gray-800 to-black' },
  { id: 'youtube', name: 'YouTube', icon: '📺', color: 'from-red-500 to-red-700' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: 'from-red-600 to-red-800' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', color: 'from-orange-500 to-orange-700' },
  { id: 'bluesky', name: 'Bluesky', icon: '☁️', color: 'from-sky-400 to-sky-600' },
  { id: 'mastodon', name: 'Mastodon', icon: '🐘', color: 'from-purple-600 to-purple-800' },
  { id: 'dribbble', name: 'Dribbble', icon: '🏀', color: 'from-pink-500 to-pink-700' },
  { id: 'discord', name: 'Discord', icon: '💬', color: 'from-indigo-500 to-indigo-700' }
]

export default function MultiPlatformPosting() {
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState([])
  const [scheduledTime, setScheduledTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const togglePlatform = (platformId) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    )
  }

  const selectAll = () => {
    setSelectedPlatforms(PLATFORMS.map((p) => p.id))
  }

  const clearAll = () => {
    setSelectedPlatforms([])
  }

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error('Ajoutez du contenu')
      return
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Selectionnez au moins une plateforme')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const createMultiPlatformPost = httpsCallable(functions, 'createMultiPlatformPost')

      const response = await createMultiPlatformPost({
        content,
        platforms: selectedPlatforms,
        scheduledAt: scheduledTime || null
      })

      setResult(response.data)
      if (response.data.success) {
        toast.success(
          scheduledTime
            ? 'Post programme!'
            : `Publie sur ${selectedPlatforms.length} plateforme(s)`
        )
      }
    } catch (error) {
      setResult({ success: false, error: error.message })
      toast.error('Erreur: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Send className="w-7 h-7 text-pink-500" />
          Multi-Platform Posting
        </h1>
        <p className="text-gray-600 mt-1">
          Publiez sur 13 plateformes en 1 clic (Postiz unlimited + Late API 20/mois)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Composer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Composer votre post
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  rows="6"
                  placeholder="Ecrivez votre message...&#10;&#10;Utilisez des emojis, hashtags, etc.&#10;&#10;#FaceMediaFactory #AI #Automation"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{content.length} caracteres</span>
                  <span>Twitter: max 280 | LinkedIn: max 3000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Planification (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>

              <button
                onClick={handlePost}
                disabled={loading || selectedPlatforms.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Publication...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Publier sur {selectedPlatforms.length} plateforme(s)
                  </>
                )}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`mt-4 p-4 border rounded-lg ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {result.success ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-semibold text-green-800">
                        Post {result.status === 'scheduled' ? 'programme' : 'publie'}!
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>Post ID: {result.postId}</p>
                      <p>Provider: {result.provider}</p>
                      <p>Plateformes: {result.platforms?.join(', ')}</p>
                      {result.scheduledAt && (
                        <p className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Programme pour: {new Date(result.scheduledAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-800">Erreur</span>
                    </div>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {content && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                Apercu
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="whitespace-pre-wrap text-gray-900">{content}</div>
              </div>
            </div>
          )}
        </div>

        {/* Platform Selector */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Plateformes</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Tout
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Aucun
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="font-medium text-gray-900">{platform.name}</span>
                  </div>
                  {selectedPlatforms.includes(platform.id) && (
                    <CheckCircle className="w-5 h-5 text-pink-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <strong>Info:</strong> {selectedPlatforms.length} plateforme(s) selectionnee(s)
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Disponibles:</span>
                <span className="font-bold text-blue-600">13 platforms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Primary:</span>
                <span className="font-bold">Postiz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fallback:</span>
                <span className="font-bold">Late API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Limite:</span>
                <span className="font-bold text-green-600">UNLIMITED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
