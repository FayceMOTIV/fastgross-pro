/**
 * GoogleMapsFilters — Filtres recherche avancee Google Maps
 */

import { useState } from 'react'
import { SlidersHorizontal, Star, MessageSquare, Globe, Phone, RotateCcw } from 'lucide-react'

const CATEGORY_OPTIONS = [
  'Restaurant',
  'Agence web',
  'Salon de coiffure',
  'Cabinet comptable',
  'Auto-ecole',
  'Veterinaire',
  'Dentiste',
  'Boulangerie',
  'Garage automobile',
  'Immobilier',
  'Avocat',
  'Coach sportif',
  'Plombier',
  'Electricien',
]

const DEFAULT_FILTERS = {
  minRating: 0,
  minReviews: 0,
  categories: [],
  hasWebsite: false,
  hasPhone: false,
}

export default function GoogleMapsFilters({ filters, onFiltersChange, onReset }) {
  const [expanded, setExpanded] = useState(false)
  const currentFilters = { ...DEFAULT_FILTERS, ...filters }

  const handleChange = (key, value) => {
    onFiltersChange({ ...currentFilters, [key]: value })
  }

  const handleCategoryToggle = (category) => {
    const current = currentFilters.categories || []
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]
    handleChange('categories', updated)
  }

  const activeFilterCount = [
    currentFilters.minRating > 0,
    currentFilters.minReviews > 0,
    (currentFilters.categories || []).length > 0,
    currentFilters.hasWebsite,
    currentFilters.hasPhone,
  ].filter(Boolean).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Filtres avances</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Rating filter */}
          <div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
              <Star className="w-3.5 h-3.5" />
              Note minimum
            </label>
            <div className="flex items-center gap-2">
              {[0, 3, 3.5, 4, 4.5].map((val) => (
                <button
                  key={val}
                  onClick={() => handleChange('minRating', val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    currentFilters.minRating === val
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {val === 0 ? 'Toutes' : `${val}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Reviews filter */}
          <div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Avis minimum
            </label>
            <div className="flex items-center gap-2">
              {[0, 10, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => handleChange('minReviews', val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    currentFilters.minReviews === val
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {val === 0 ? 'Tous' : `${val}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Boolean filters */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentFilters.hasWebsite}
                onChange={(e) => handleChange('hasWebsite', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Globe className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm text-gray-700">A un site web</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentFilters.hasPhone}
                onChange={(e) => handleChange('hasPhone', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Phone className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm text-gray-700">A un telephone</span>
            </label>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryToggle(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    (currentFilters.categories || []).includes(cat)
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => onReset?.() || onFiltersChange(DEFAULT_FILTERS)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Reinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  )
}
