/**
 * ProspectDiagnostic.jsx — Affiche le diagnostic IA d'un prospect scanne
 */
import { useState } from 'react';

const priorityConfig = {
  critical: { label: 'Critique', color: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { label: 'Basse', color: 'bg-green-100 text-green-700 border-green-200' },
};

export default function ProspectDiagnostic({ scanResult }) {
  const [expanded, setExpanded] = useState(false);

  if (!scanResult) {
    return (
      <div className="card p-6 text-center text-gray-400">
        Aucun scan disponible pour ce prospect
      </div>
    );
  }

  const { diagnosticSummary, signals, totalSignalScore, priority, domain } = scanResult;
  const pConfig = priorityConfig[priority] || priorityConfig.low;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Diagnostic IA</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${pConfig.color}`}>
          Priorite {pConfig.label}
        </span>
      </div>

      <div className="text-sm text-gray-500">
        {domain} &middot; Score total : {totalSignalScore} &middot; {signals?.length || 0} signaux
      </div>

      {diagnosticSummary && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{diagnosticSummary.summary}</p>

          {diagnosticSummary.topPriority && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <span className="text-xs font-medium text-indigo-600">Priorite #1</span>
              <p className="text-sm text-indigo-900 mt-1">{diagnosticSummary.topPriority}</p>
            </div>
          )}

          {diagnosticSummary.approachMessage && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-500">Message d approche suggere</span>
              <p className="text-sm text-gray-800 mt-1 italic">
                &ldquo;{diagnosticSummary.approachMessage}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}

      {signals && signals.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {expanded ? 'Masquer' : 'Voir'} les {signals.length} signaux
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {signals.map((signal, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm"
                >
                  <span className="text-gray-700">{signal.message}</span>
                  <span className="text-xs font-mono text-gray-400">+{signal.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
