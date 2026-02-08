import { Star, Reply, Forward, MoreHorizontal, Paperclip, Archive, Trash2 } from 'lucide-react'

export default function EmailPreview({
  from = { name: 'Jean Dupont', email: 'jean@example.com' },
  to = 'prospect@entreprise.com',
  subject,
  body,
  date = new Date(),
}) {
  const formatDate = (d) => {
    const date = d instanceof Date ? d : new Date(d)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Convert plain text body to HTML paragraphs
  const formatBody = (text) => {
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line, i) => (
        <p key={i} className="mb-3 last:mb-0">
          {line}
        </p>
      ))
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Gmail-like header */}
      <div className="bg-dark-800/50 px-4 py-2 flex items-center gap-2 border-b border-dark-700">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-dark-500 ml-2">Aperçu email</span>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-dark-800/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
            <Archive className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
            <Reply className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
            <Forward className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="p-6">
        {/* Subject */}
        <h2 className="text-xl font-semibold text-white mb-4">{subject}</h2>

        {/* Sender info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {from.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{from.name}</span>
                <span className="text-xs text-dark-500">&lt;{from.email}&gt;</span>
              </div>
              <div className="text-xs text-dark-500">
                à <span className="text-dark-400">{to}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-500">{formatDate(date)}</span>
            <button className="p-1 rounded hover:bg-dark-800 text-dark-500">
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="text-dark-200 leading-relaxed text-sm">{formatBody(body)}</div>
      </div>
    </div>
  )
}
