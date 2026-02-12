/**
 * WhatsApp Settings Component
 * Configuration Meta Cloud API
 */

import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import {
  MessageCircle,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  FileText,
  Plus,
  Trash2,
  Eye,
  Clock
} from 'lucide-react';

export default function WhatsAppSettings() {
  const { currentOrg } = useOrg();
  const [config, setConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: '',
    enabled: false
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'whatsapp');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig(prev => ({ ...prev, ...configSnap.data() }));
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesRef = collection(db, 'organizations', currentOrg.id, 'whatsappTemplates');
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
        setStats(analyticsSnap.data().channels?.whatsapp || null);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'whatsapp');
      await setDoc(configRef, {
        ...config,
        updatedAt: new Date()
      }, { merge: true });

      toast.success('Configuration WhatsApp enregistree');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/syncWhatsAppTemplates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.synced} templates synchronises`);
        loadTemplates();
      } else {
        toast.error(result.error || 'Echec synchronisation');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erreur de synchronisation');
    } finally {
      setSyncing(false);
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
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration WhatsApp</h3>
            <p className="text-sm text-gray-500">Meta Cloud API</p>
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
            <p className="text-sm text-gray-500">Lus</p>
            <p className="text-2xl font-bold text-blue-600">{stats.read || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Reponses</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.replied || 0}</p>
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
            onClick={() => setActiveTab('templates')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Templates ({templates.length})
          </button>
        </nav>
      </div>

      {activeTab === 'config' && (
        <>
          {/* Configuration */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h4 className="font-medium text-gray-900">Identifiants Meta Business</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token (permanent)
              </label>
              <input
                type="password"
                value={config.accessToken}
                onChange={(e) => setConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                placeholder="EAAxxxxxxxxxx..."
                className="input-field w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token genere depuis Meta Business Suite avec permissions whatsapp_business_messaging
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={config.phoneNumberId}
                  onChange={(e) => setConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  placeholder="123456789012345"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Account ID
                </label>
                <input
                  type="text"
                  value={config.businessAccountId}
                  onChange={(e) => setConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                  placeholder="123456789012345"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={config.webhookVerifyToken}
                onChange={(e) => setConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                placeholder="Votre token de verification"
                className="input-field w-full"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="wa-enabled"
                checked={config.enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="wa-enabled" className="text-sm text-gray-700">
                Activer WhatsApp Business
              </label>
            </div>
          </div>

          {/* Session Window Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Fenetre de session 24h</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Vous pouvez envoyer des messages libres pendant 24h apres une interaction du prospect.
                  En dehors de cette fenetre, seuls les templates approuves par Meta peuvent etre envoyes.
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Conformite WhatsApp Business</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Opt-in specifique WhatsApp requis (distinct du SMS)</li>
                  <li>• Templates doivent etre approuves par Meta</li>
                  <li>• Maximum 2 WhatsApp par prospect sur 30 jours</li>
                  <li>• Tarification par message Pay-per-conversation</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Templates approuves par Meta pour vos envois
            </p>
            <button
              onClick={handleSyncTemplates}
              disabled={syncing}
              className="btn-secondary flex items-center gap-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Synchroniser
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucun template synchronise</p>
              <p className="text-sm text-gray-500 mt-1">
                Cliquez sur "Synchroniser" pour importer vos templates Meta
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{template.name}</h5>
                      <p className="text-sm text-gray-500 mt-1">
                        {template.language} • {template.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        template.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : template.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {template.status}
                      </span>
                    </div>
                  </div>
                  {template.body && (
                    <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded">
                      {template.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {activeTab === 'config' && (
        <div className="flex justify-end gap-3">
          <button
            onClick={loadConfig}
            className="btn-secondary"
          >
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
