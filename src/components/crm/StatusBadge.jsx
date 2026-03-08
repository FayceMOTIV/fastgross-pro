const columnStyles = {
  detected: 'bg-gray-100 text-gray-600',
  warming: 'bg-yellow-50 text-yellow-600',
  contacted: 'bg-blue-50 text-blue-600',
  replied: 'bg-purple-50 text-purple-600',
  meeting: 'bg-orange-50 text-orange-600',
  won: 'bg-emerald-50 text-emerald-600',
  lost: 'bg-red-50 text-red-600',
}

const columnLabels = {
  detected: 'Detecte',
  warming: 'Warming',
  contacted: 'Contacte',
  replied: 'Repondu',
  meeting: 'RDV',
  won: 'Gagne',
  lost: 'Perdu',
}

export default function StatusBadge({ column }) {
  const style = columnStyles[column] || 'bg-gray-100 text-gray-600'
  const label = columnLabels[column] || column

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${style}`}>
      {label}
    </span>
  )
}
