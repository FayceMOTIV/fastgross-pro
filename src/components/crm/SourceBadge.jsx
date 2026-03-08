const sourceColors = {
  linkedin: 'bg-sky-50 text-sky-600',
  sirene: 'bg-emerald-50 text-emerald-600',
  boamp: 'bg-blue-50 text-blue-600',
  google_maps: 'bg-red-50 text-red-600',
  societe: 'bg-indigo-50 text-indigo-600',
  pappers: 'bg-violet-50 text-violet-600',
  leboncoin: 'bg-orange-50 text-orange-600',
  seloger: 'bg-blue-50 text-blue-600',
  mairie: 'bg-red-50 text-red-600',
  reddit: 'bg-orange-50 text-orange-600',
  twitter: 'bg-sky-50 text-sky-600',
  facebook: 'bg-blue-50 text-blue-600',
  instagram: 'bg-pink-50 text-pink-600',
  hunter: 'bg-pink-50 text-pink-600',
  manual: 'bg-gray-50 text-gray-600',
}

const sourceLabels = {
  linkedin: 'LinkedIn',
  sirene: 'SIRENE',
  boamp: 'BOAMP',
  google_maps: 'Google Maps',
  societe: 'Societe.com',
  pappers: 'Pappers',
  leboncoin: 'Leboncoin',
  seloger: 'SeLoger',
  mairie: 'Mairie',
  reddit: 'Reddit',
  twitter: 'Twitter',
  facebook: 'Facebook',
  instagram: 'Instagram',
  hunter: 'Hunter.io',
  manual: 'Manuel',
}

export default function SourceBadge({ source }) {
  const colors = sourceColors[source] || 'bg-gray-50 text-gray-600'
  const label = sourceLabels[source] || source

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors}`}>
      {label}
    </span>
  )
}
