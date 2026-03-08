import { useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'

export default function ZoneSelector({ city, radius, onCityChange, onRadiusChange }) {
  const [localCity, setLocalCity] = useState(city || '')

  const handleCitySubmit = () => {
    onCityChange?.(localCity.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCitySubmit()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 rounded-xl bg-white border border-gray-200">
      {/* City input */}
      <div className="flex-1 w-full">
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Ville ou code postal
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={localCity}
            onChange={(e) => setLocalCity(e.target.value)}
            onBlur={handleCitySubmit}
            onKeyDown={handleKeyDown}
            placeholder="Paris, Lyon, 75001..."
            className="input-field pl-9 w-full"
          />
        </div>
      </div>

      {/* Radius slider */}
      <div className="w-full sm:w-48">
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          Rayon : {radius || 15} km
        </label>
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={radius || 15}
            onChange={(e) => onRadiusChange?.(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
          />
          <span className="text-xs text-text-muted font-medium w-8 text-right">
            {radius || 15}
          </span>
        </div>
      </div>
    </div>
  )
}
