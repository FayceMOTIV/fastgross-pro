/**
 * SMS Settings Component
 * Configuration Twilio Messaging Service
 */

import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import {
  MessageSquare,
  Phone,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Shield,
  TestTube
} from 'lucide-react';

export default function SMSSettings() {
  const { currentOrg } = useOrg();
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    messagingServiceSid: '',
    phoneNumber: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (currentOrg?.id) {
      loadConfig();
      loadStats();
    }
  }, [currentOrg?.id]);

  const loadConfig = async () => {
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'sms');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig(prev => ({ ...prev, ...configSnap.data() }));
      }
    } catch (error) {
      console.error('Error loading SMS config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analyticsRef = doc(db, 'organizations', currentOrg.id, 'channelAnalytics', today);
      const analyticsSnap = await getDoc(analyticsRef);

      if (analyticsSnap.exists()) {
        setStats(analyticsSnap.data().channels?.sms || null);
      }
    } catch (error) {
      console.error('Error loading SMS stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'sms');
      await setDoc(configRef, {
        ...config,
        updatedAt: new Date()
      }, { merge: true });

      toast.success('Configuration SMS enregistree');
    } catch (error) {
      console.error('Error saving SMS config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone) {
      toast.error('Entrez un numero de telephone');
      return;
    }

    setTesting(true);
    try {
      // Call Cloud Function to send test SMS
      const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/sendTestSMS`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          phone: testPhone
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('SMS de test envoye !');
      } else {
        toast.error(result.error || 'Echec envoi test');
      }
    } catch (error) {
      console.error('Test SMS error:', error);
      toast.error('Erreur lors du test');
    } finally {
      setTesting(false);
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
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration SMS</h3>
            <p className="text-sm text-gray-500">Twilio Messaging Service</p>
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

      {/* Stats du jour */}
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
            <p className="text-sm text-gray-500">Reponses</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.replied || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Opt-out</p>
            <p className="text-2xl font-bold text-red-600">{stats.optOut || 0}</p>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Identifiants Twilio
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account SID
            </label>
            <input
              type="text"
              value={config.accountSid}
              onChange={(e) => setConfig(prev => ({ ...prev, accountSid: e.target.value }))}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth Token
            </label>
            <input
              type="password"
              value={config.authToken}
              onChange={(e) => setConfig(prev => ({ ...prev, authToken: e.target.value }))}
              placeholder="••••••••••••••••"
              className="input-field w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Messaging Service SID
            </label>
            <input
              type="text"
              value={config.messagingServiceSid}
              onChange={(e) => setConfig(prev => ({ ...prev, messagingServiceSid: e.target.value }))}
              placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommande pour le sender pool et la conformite
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numero expediteur (fallback)
            </label>
            <input
              type="text"
              value={config.phoneNumber}
              onChange={(e) => setConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+33612345678"
              className="input-field w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="sms-enabled"
            checked={config.enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="sms-enabled" className="text-sm text-gray-700">
            Activer l'envoi SMS
          </label>
        </div>
      </div>

      {/* Compliance Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Conformite CNIL / France</h4>
            <ul className="text-sm text-amber-700 mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horaires legaux : 8h-20h en semaine (pas dimanche)
              </li>
              <li>• Opt-in explicite requis avant envoi</li>
              <li>• STOP automatique inclus dans chaque message</li>
              <li>• Maximum 160 caracteres / segment</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <TestTube className="w-4 h-4" />
          Tester la configuration
        </h4>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+33612345678"
              className="input-field w-full"
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !config.enabled}
            className="btn-secondary flex items-center gap-2"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            Envoyer test
          </button>
        </div>
      </div>

      {/* Actions */}
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
    </div>
  );
}
