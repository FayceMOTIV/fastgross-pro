/**
 * AlexMemoryDashboard.jsx
 * Visualise ce qu'Alex a appris par niche.
 * Accessible dans le dashboard client FMF.
 */

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const NICHES_LABELS = {
  '4322A': 'Plombiers',
  '4321A': 'Electriciens',
  '5610A': 'Restaurants',
  '9602A': 'Coiffeurs',
  '1071A': 'Boulangers',
  '4334Z': 'Peintres',
  '4120A': 'Macons',
  '6920Z': 'Comptables',
  '6831Z': 'Immobilier',
  '4332A': 'Menuisiers',
};

const ZONES_LABELS = {
  '69': 'Lyon / Rhone',
  '75': 'Paris',
  '33': 'Bordeaux / Gironde',
  '13': 'Marseille / BdR',
  '31': 'Toulouse / Hte-Garonne',
  '59': 'Lille / Nord',
  '67': 'Strasbourg / Bas-Rhin',
  '44': 'Nantes / Loire-Atl.',
  '01': 'Ain',
  '38': 'Isere',
};

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function AlexMemoryDashboard() {
  const [selectedNaf, setSelectedNaf] = useState('4322A');
  const [selectedZone, setSelectedZone] = useState('69');
  const [memoryContext, setMemoryContext] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const functions = getFunctions(undefined, 'europe-west1');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadMemoryContext();
  }, [selectedNaf, selectedZone]);

  const loadStats = async () => {
    try {
      const getStats = httpsCallable(functions, 'getAlexMemoryStats');
      const result = await getStats({});
      setStats(result.data.stats);
    } catch (e) {
      console.error('Stats error:', e);
    }
  };

  const loadMemoryContext = async () => {
    setLoading(true);
    setError('');
    try {
      const getContext = httpsCallable(functions, 'getAlexMemoryContext');
      const result = await getContext({ nafCode: selectedNaf, zone: selectedZone });
      setMemoryContext(result.data.context || '');
    } catch (e) {
      setError(e.message);
      setMemoryContext('');
    }
    setLoading(false);
  };

  const handleForceConsolidate = async () => {
    setLoading(true);
    try {
      const consolidate = httpsCallable(functions, 'forceConsolidateNiche');
      await consolidate({ nafCode: selectedNaf, zone: selectedZone });
      await loadMemoryContext();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Memoire Collective Alex</h2>
          <p className="text-sm text-gray-500">Ce qu'Alex a appris de toutes les conversations FMF</p>
        </div>
        {stats && (
          <div className="flex gap-4">
            <div className="bg-indigo-50 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-indigo-600 font-medium">Episodes</p>
              <p className="text-lg font-bold text-indigo-900">{stats.totalEpisodes}</p>
            </div>
            <div className="bg-green-50 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-green-600 font-medium">Niches</p>
              <p className="text-lg font-bold text-green-900">{stats.totalNiches}</p>
            </div>
            <div className="bg-purple-50 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-purple-600 font-medium">Regles</p>
              <p className="text-lg font-bold text-purple-900">{stats.totalRuleSets}</p>
            </div>
          </div>
        )}
      </div>

      {/* Selecteurs */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Niche</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(NICHES_LABELS).map(([naf, label]) => (
            <button
              key={naf}
              onClick={() => setSelectedNaf(naf)}
              className={`px-3 py-1 rounded-lg text-sm transition ${selectedNaf === naf ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zone</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(ZONES_LABELS).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setSelectedZone(code)}
              className={`px-3 py-1 rounded-lg text-sm transition ${selectedZone === code ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <div className="text-center text-gray-400 py-8">Chargement...</div>}
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4">{error}</div>}

      {/* Pas de donnees */}
      {!loading && !memoryContext && !error && (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-500">Pas encore de donnees pour {NICHES_LABELS[selectedNaf] || selectedNaf} / {ZONES_LABELS[selectedZone] || selectedZone}.</p>
          <p className="text-sm text-gray-400 mt-1">Les donnees apparaitront apres les premieres conversations.</p>
        </div>
      )}

      {/* Contexte memoire (format brut) */}
      {!loading && memoryContext && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Contexte memoire : {NICHES_LABELS[selectedNaf] || selectedNaf} / {ZONES_LABELS[selectedZone] || selectedZone}
            </h3>
            <button
              onClick={handleForceConsolidate}
              disabled={loading}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Forcer consolidation
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
            {memoryContext}
          </div>

          <p className="text-xs text-gray-400">
            Ce contexte est automatiquement injecte dans le system prompt d'Alex lors de chaque conversation avec un prospect de cette niche/zone.
          </p>
        </div>
      )}

      {/* Top niches */}
      {stats?.topNiches?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top niches apprises</h3>
          <div className="space-y-2">
            {stats.topNiches.map((n, i) => (
              <div key={n.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-6">{i + 1}.</span>
                <span className="font-medium text-gray-900 flex-1">
                  {NICHES_LABELS[n.nafCode] || n.nafCode} / {ZONES_LABELS[n.zone] || n.zone}
                </span>
                <span className="text-gray-500">{n.sampleSize} conversations</span>
                <button
                  onClick={() => { setSelectedNaf(n.nafCode); setSelectedZone(n.zone); }}
                  className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                >
                  Voir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
