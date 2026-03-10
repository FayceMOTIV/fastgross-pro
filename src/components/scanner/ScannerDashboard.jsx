/**
 * ScannerDashboard.jsx — Dashboard du scanner avec lancement de scan et resultats
 */
import { useState } from 'react';
import { useCloudFunctions } from '../../hooks/useCloudFunctions';
import ProspectDiagnostic from './ProspectDiagnostic';

export default function ScannerDashboard({ organizationId }) {
  const [domain, setDomain] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [siren, setSiren] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const { call: runScan, loading } = useCloudFunctions('runProspectScan');

  const handleScan = async () => {
    if (!domain.trim()) return;

    try {
      const result = await runScan({
        domain: domain.trim(),
        organizationId,
        businessName: businessName.trim() || undefined,
        siren: siren.trim() || undefined,
      });
      setScanResult(result);
    } catch (error) {
      console.error('[Scanner] Erreur:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Scanner de Prospect</h2>
        <p className="text-sm text-gray-500 mb-6">
          Analysez la presence digitale d un prospect avec 20 sources differentes
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domaine *
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="exemple.fr"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom entreprise
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ma Societe SAS"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SIREN
            </label>
            <input
              type="text"
              value={siren}
              onChange={(e) => setSiren(e.target.value)}
              placeholder="123456789"
              className="input-field w-full"
              maxLength={9}
            />
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={loading || !domain.trim()}
          className="btn-primary px-6 py-2 disabled:opacity-50"
        >
          {loading ? 'Analyse en cours...' : 'Lancer le scan'}
        </button>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Analyse de {domain} en cours...</p>
          <p className="text-xs text-gray-400 mt-1">20 sources scannees en parallele</p>
        </div>
      )}

      {scanResult && !loading && <ProspectDiagnostic scanResult={scanResult} />}
    </div>
  );
}
