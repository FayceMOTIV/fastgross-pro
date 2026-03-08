/**
 * GeoZoneSelector.jsx
 * Composant React pour definir la zone de prospection.
 * Deux modes : saisie libre (NLP) + selection manuelle.
 */

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const EXEMPLES_ZONES = [
  "Dans l'Ain",
  "Lyon et alentours 30km",
  "Auvergne-Rhone-Alpes",
  "Paris 75",
  "Bordeaux, Gironde",
];

const SECTEURS_COMMUNS = [
  { label: 'Plombiers', naf: '4322A' },
  { label: 'Electriciens', naf: '4321A' },
  { label: 'Restaurants', naf: '5610A' },
  { label: 'Coiffeurs', naf: '9602A' },
  { label: 'Boulangers', naf: '1071A' },
  { label: 'Macons', naf: '4120A' },
  { label: 'Peintres', naf: '4334Z' },
  { label: 'Menuisiers', naf: '4332A' },
  { label: 'Expert-comptables', naf: '6920Z' },
  { label: 'Agents immobiliers', naf: '6831Z' },
];

export default function GeoZoneSelector({ orgId, onSave }) {
  const [mode, setMode] = useState('text');
  const [freeText, setFreeText] = useState('');
  const [resolvedZones, setResolvedZones] = useState([]);
  const [selectedNafs, setSelectedNafs] = useState([]);
  const [maxLeads, setMaxLeads] = useState(50);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const functions = getFunctions(undefined, 'europe-west1');

  const handleDetect = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    setStatus('Analyse de votre zone...');
    try {
      const detectGeo = httpsCallable(functions, 'detectGeoFromMessage');
      const result = await detectGeo({ message: freeText });
      const { zones, secteur, nafCode } = result.data;

      setResolvedZones(prev => [...prev, ...(zones || [])]);
      if (nafCode && !selectedNafs.includes(nafCode)) {
        setSelectedNafs(prev => [...prev, nafCode]);
      }
      setStatus(`${zones?.length || 0} zone(s) detectee(s)${secteur ? ` | Secteur : ${secteur}` : ''}`);
    } catch (e) {
      setStatus(`Erreur : ${e.message}`);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (resolvedZones.length === 0) return;
    setLoading(true);
    try {
      const updateGeo = httpsCallable(functions, 'updateClientGeoSettings');
      await updateGeo({
        orgId,
        zones: resolvedZones,
        nafs: selectedNafs,
        maxLeadsPerDay: maxLeads
      });
      setStatus('Zone enregistree');
      onSave?.({ zones: resolvedZones, nafs: selectedNafs });
    } catch (e) {
      setStatus(`Erreur : ${e.message}`);
    }
    setLoading(false);
  };

  const toggleNaf = (naf) => {
    setSelectedNafs(prev =>
      prev.includes(naf) ? prev.filter(n => n !== naf) : [...prev, naf]
    );
  };

  const removeZone = (index) => {
    setResolvedZones(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Zone de prospection</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('text')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${mode === 'text' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Texte libre
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Manuel
          </button>
        </div>
      </div>

      {mode === 'text' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDetect()}
              placeholder="Ex: plombiers dans l'Ain, restaurants a Lyon..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleDetect}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Detecter
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {EXEMPLES_ZONES.map(ex => (
              <button
                key={ex}
                onClick={() => setFreeText(ex)}
                className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs hover:bg-gray-100 border border-gray-200"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {resolvedZones.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zones detectees</p>
          <div className="flex flex-wrap gap-2">
            {resolvedZones.map((z, i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm">
                <span>{z.nom || z.type}</span>
                {z.type === 'radius' && <span>({z.radiusKm}km)</span>}
                <button onClick={() => removeZone(i)} className="text-indigo-400 hover:text-indigo-600 ml-1">&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Secteurs cibles</p>
        <div className="flex flex-wrap gap-2">
          {SECTEURS_COMMUNS.map(s => (
            <button
              key={s.naf}
              onClick={() => toggleNaf(s.naf)}
              className={`px-3 py-1 rounded-lg text-sm transition ${selectedNafs.includes(s.naf) ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600">Leads/jour max :</label>
        <input
          type="range" min={10} max={200} step={10}
          value={maxLeads}
          onChange={e => setMaxLeads(parseInt(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm font-semibold text-gray-900 w-12">{maxLeads}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={loading || resolvedZones.length === 0}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          Enregistrer la zone
        </button>
        {status && <span className="text-sm text-gray-500">{status}</span>}
      </div>
    </div>
  );
}
