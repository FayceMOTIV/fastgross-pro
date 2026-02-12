/**
 * Postal Settings Component
 * Configuration PostGrid API
 */

import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import {
  Mail,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  MapPin,
  FileText,
  QrCode,
  Link2,
  DollarSign
} from 'lucide-react';

export default function PostalSettings() {
  const { currentOrg } = useOrg();
  const [config, setConfig] = useState({
    apiKey: '',
    testMode: true,
    enabled: false
  });
  const [returnAddress, setReturnAddress] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'FR'
  });
  const [purlConfig, setPurlConfig] = useState({
    defaultUrl: '',
    calendlyUrl: '',
    landingUrl: ''
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    if (currentOrg?.id) {
      loadConfig();
      loadTemplates();
      loadStats();
    }
  }, [currentOrg?.id]);

  const loadConfig = async () => {
    try {
      // Integration config
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'postal');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig(prev => ({ ...prev, ...configSnap.data() }));
      }

      // Org config for return address
      const orgRef = doc(db, 'organizations', currentOrg.id);
      const orgSnap = await orgRef.get ? await getDoc(orgRef) : null;

      if (orgSnap?.exists()) {
        const orgData = orgSnap.data();
        if (orgData.postalConfig?.returnAddress) {
          setReturnAddress(orgData.postalConfig.returnAddress);
        }
        if (orgData.postalConfig) {
          setPurlConfig({
            defaultUrl: orgData.postalConfig.defaultUrl || '',
            calendlyUrl: orgData.postalConfig.calendlyUrl || '',
            landingUrl: orgData.postalConfig.landingUrl || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesRef = collection(db, 'organizations', currentOrg.id, 'postalTemplates');
      const templatesSnap = await getDocs(templatesRef);

      setTemplates(templatesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analyticsRef = doc(db, 'organizations', currentOrg.id, 'channelAnalytics', today);
      const analyticsSnap = await getDoc(analyticsRef);

      if (analyticsSnap.exists()) {
        setStats(analyticsSnap.data().channels?.postal || null);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save integration config
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'postal');
      await setDoc(configRef, {
        ...config,
        updatedAt: new Date()
      }, { merge: true });

      // Save org config
      const orgRef = doc(db, 'organizations', currentOrg.id);
      await setDoc(orgRef, {
        postalConfig: {
          returnAddress,
          ...purlConfig
        }
      }, { merge: true });

      toast.success('Configuration Postal enregistree');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration Courrier</h3>
            <p className="text-sm text-gray-500">PostGrid - Lettres et Cartes Postales</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {config.enabled ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Actif</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>Inactif</span>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Envoyes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.sent || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Delivres</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">QR Scans</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.qrScans || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Cout moyen</p>
            <p className="text-2xl font-bold text-gray-900">$1.50</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'address'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Adresse retour
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'tracking'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode className="w-4 h-4 inline mr-2" />
            Tracking URLs
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Templates ({templates.length + 4})
          </button>
        </nav>
      </div>

      {activeTab === 'config' && (
        <>
          {/* API Configuration */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h4 className="font-medium text-gray-900">Identifiants PostGrid</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="live_sk_xxxxx ou test_sk_xxxxx"
                className="input-field w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Utilisez une cle "test_" pour les tests sans envoi reel
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="test-mode"
                  checked={config.testMode}
                  onChange={(e) => setConfig(prev => ({ ...prev, testMode: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="test-mode" className="text-sm text-gray-700">
                  Mode test (pas d'envoi reel)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="postal-enabled"
                  checked={config.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="postal-enabled" className="text-sm text-gray-700">
                  Activer l'envoi postal
                </label>
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Tarification PostGrid</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Carte postale 4x6 : ~$0.30</li>
                  <li>• Lettre standard : ~$1.50</li>
                  <li>• Lettre recommandee : ~$4.50</li>
                  <li>• International : +$0.50</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Conformite Courrier B2B</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Opt-out disponible (pas d'opt-in requis en B2B)</li>
                  <li>• Verification d'adresse avant envoi</li>
                  <li>• Maximum 1 courrier par prospect sur 30 jours</li>
                  <li>• QR code pour tracking engagement</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'address' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h4 className="font-medium text-gray-900">Adresse d'expedition (retour)</h4>
          <p className="text-sm text-gray-500">
            Cette adresse apparaitra comme expediteur sur vos courriers
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom / Entreprise
            </label>
            <input
              type="text"
              value={returnAddress.name}
              onChange={(e) => setReturnAddress(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Face Media Factory"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse ligne 1
            </label>
            <input
              type="text"
              value={returnAddress.line1}
              onChange={(e) => setReturnAddress(prev => ({ ...prev, line1: e.target.value }))}
              placeholder="123 Rue de la Paix"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse ligne 2 (optionnel)
            </label>
            <input
              type="text"
              value={returnAddress.line2}
              onChange={(e) => setReturnAddress(prev => ({ ...prev, line2: e.target.value }))}
              placeholder="Batiment A, 3eme etage"
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code postal
              </label>
              <input
                type="text"
                value={returnAddress.postalCode}
                onChange={(e) => setReturnAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                placeholder="75001"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                type="text"
                value={returnAddress.city}
                onChange={(e) => setReturnAddress(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Paris"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays
              </label>
              <select
                value={returnAddress.country}
                onChange={(e) => setReturnAddress(prev => ({ ...prev, country: e.target.value }))}
                className="input-field w-full"
              >
                <option value="FR">France</option>
                <option value="BE">Belgique</option>
                <option value="CH">Suisse</option>
                <option value="LU">Luxembourg</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              URLs de redirection
            </h4>
            <p className="text-sm text-gray-500">
              Les QR codes et PURLs redirigeront vers ces URLs avec tracking
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL par defaut
              </label>
              <input
                type="url"
                value={purlConfig.defaultUrl}
                onChange={(e) => setPurlConfig(prev => ({ ...prev, defaultUrl: e.target.value }))}
                placeholder="https://votresite.com"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Calendly (prise de RDV)
              </label>
              <input
                type="url"
                value={purlConfig.calendlyUrl}
                onChange={(e) => setPurlConfig(prev => ({ ...prev, calendlyUrl: e.target.value }))}
                placeholder="https://calendly.com/vous/30min"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Landing Page
              </label>
              <input
                type="url"
                value={purlConfig.landingUrl}
                onChange={(e) => setPurlConfig(prev => ({ ...prev, landingUrl: e.target.value }))}
                placeholder="https://votresite.com/offre"
                className="input-field w-full"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h5 className="font-medium text-gray-700 mb-2">Comment ca marche</h5>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. Un QR code unique est genere pour chaque courrier</li>
              <li>2. Le prospect scanne le QR code avec son telephone</li>
              <li>3. Il est redirige vers votre URL avec parametres UTM</li>
              <li>4. Le scan est enregistre et lie au prospect</li>
            </ol>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Templates de courrier avec variables dynamiques
          </p>

          {/* Default Templates */}
          <div className="space-y-3">
            {[
              { id: 'introduction_letter', name: 'Lettre Introduction', type: 'letter' },
              { id: 'follow_up_letter', name: 'Lettre Relance', type: 'letter' },
              { id: 'postcard_promo', name: 'Carte Postale Promo', type: 'postcard' },
              { id: 'event_invitation', name: 'Invitation Evenement', type: 'letter' }
            ].map(template => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      {template.type === 'letter' ? 'Lettre' : 'Carte postale'} • Template par defaut
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Default
                  </span>
                </div>
              </div>
            ))}

            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      {template.type} • Custom
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                    Custom
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(activeTab === 'config' || activeTab === 'address' || activeTab === 'tracking') && (
        <div className="flex justify-end gap-3">
          <button onClick={loadConfig} className="btn-secondary">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}
