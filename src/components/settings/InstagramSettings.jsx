/**
 * Instagram Settings Component
 * Configuration Meta Graph API
 */

import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import {
  Instagram,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  MessageSquare,
  Hash,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

export default function InstagramSettings() {
  const { currentOrg } = useOrg();
  const [config, setConfig] = useState({
    accessToken: '',
    igUserId: '',
    pageId: '',
    appSecret: '',
    enabled: false
  });
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const [activeTab, setActiveTab] = useState('config');
  const [newTrigger, setNewTrigger] = useState({
    keywords: '',
    action: 'private_reply',
    message: ''
  });

  useEffect(() => {
    if (currentOrg?.id) {
      loadConfig();
      loadTriggers();
      loadStats();
      loadRateLimit();
    }
  }, [currentOrg?.id]);

  const loadConfig = async () => {
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'instagram');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig(prev => ({ ...prev, ...configSnap.data() }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTriggers = async () => {
    try {
      const triggersRef = collection(db, 'organizations', currentOrg.id, 'instagramTriggers');
      const triggersSnap = await getDocs(triggersRef);

      setTriggers(triggersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading triggers:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analyticsRef = doc(db, 'organizations', currentOrg.id, 'channelAnalytics', today);
      const analyticsSnap = await getDoc(analyticsRef);

      if (analyticsSnap.exists()) {
        setStats(analyticsSnap.data().channels?.instagram || null);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRateLimit = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const limitRef = doc(db, 'organizations', currentOrg.id, 'rateLimits', `instagram_${today}`);
      const limitSnap = await getDoc(limitRef);

      if (limitSnap.exists()) {
        setRateLimit(limitSnap.data());
      }
    } catch (error) {
      console.error('Error loading rate limit:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'instagram');
      await setDoc(configRef, {
        ...config,
        updatedAt: new Date()
      }, { merge: true });

      toast.success('Configuration Instagram enregistree');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrigger = async () => {
    if (!newTrigger.keywords || !newTrigger.message) {
      toast.error('Remplissez tous les champs');
      return;
    }

    try {
      const triggersRef = collection(db, 'organizations', currentOrg.id, 'instagramTriggers');
      await addDoc(triggersRef, {
        ...newTrigger,
        keywords: newTrigger.keywords.split(',').map(k => k.trim().toLowerCase()),
        enabled: true,
        createdAt: new Date()
      });

      toast.success('Trigger ajoute');
      setNewTrigger({ keywords: '', action: 'private_reply', message: '' });
      loadTriggers();
    } catch (error) {
      console.error('Error adding trigger:', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleDeleteTrigger = async (triggerId) => {
    try {
      await deleteDoc(doc(db, 'organizations', currentOrg.id, 'instagramTriggers', triggerId));
      toast.success('Trigger supprime');
      loadTriggers();
    } catch (error) {
      console.error('Error deleting trigger:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const dailyLimit = 70;
  const used = rateLimit?.count || 0;
  const remaining = dailyLimit - used;
  const usagePercent = (used / dailyLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration Instagram</h3>
            <p className="text-sm text-gray-500">Meta Graph API DM</p>
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

      {/* Rate Limit Warning */}
      {usagePercent >= 80 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Limite journaliere proche</h4>
            <p className="text-sm text-amber-700">
              Vous avez utilise {used}/{dailyLimit} DM aujourd'hui ({remaining} restants)
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">DM Envoyes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.dmSent || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Lus</p>
            <p className="text-2xl font-bold text-blue-600">{stats.read || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Reponses</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.replied || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Quota jour</p>
            <p className="text-2xl font-bold text-gray-900">{remaining}/{dailyLimit}</p>
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
            onClick={() => setActiveTab('triggers')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'triggers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Hash className="w-4 h-4 inline mr-2" />
            Comment Triggers ({triggers.length})
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
                Access Token
              </label>
              <input
                type="password"
                value={config.accessToken}
                onChange={(e) => setConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                placeholder="EAAxxxxxxxxxx..."
                className="input-field w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram User ID
                </label>
                <input
                  type="text"
                  value={config.igUserId}
                  onChange={(e) => setConfig(prev => ({ ...prev, igUserId: e.target.value }))}
                  placeholder="17841444444444444"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page ID (liee a IG)
                </label>
                <input
                  type="text"
                  value={config.pageId}
                  onChange={(e) => setConfig(prev => ({ ...prev, pageId: e.target.value }))}
                  placeholder="123456789012345"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Secret (pour webhooks)
              </label>
              <input
                type="password"
                value={config.appSecret}
                onChange={(e) => setConfig(prev => ({ ...prev, appSecret: e.target.value }))}
                placeholder="••••••••••••"
                className="input-field w-full"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="ig-enabled"
                checked={config.enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="ig-enabled" className="text-sm text-gray-700">
                Activer Instagram DM
              </label>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Regles Instagram</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Cold DM interdit - interaction prealable requise</li>
                  <li>• Maximum 70 DM / jour (safe zone)</li>
                  <li>• Varier les messages pour eviter detection spam</li>
                  <li>• Minimum 5 secondes entre chaque DM</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'triggers' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Repondez automatiquement aux commentaires contenant des mots-cles specifiques
          </p>

          {/* Add Trigger Form */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h5 className="font-medium text-gray-900">Nouveau trigger</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Mots-cles (separes par virgule)
                </label>
                <input
                  type="text"
                  value={newTrigger.keywords}
                  onChange={(e) => setNewTrigger(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="guide, info, demo"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Action
                </label>
                <select
                  value={newTrigger.action}
                  onChange={(e) => setNewTrigger(prev => ({ ...prev, action: e.target.value }))}
                  className="input-field w-full"
                >
                  <option value="private_reply">Reponse privee (DM)</option>
                  <option value="public_reply">Reponse publique</option>
                  <option value="add_to_sequence">Ajouter a sequence</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Message de reponse
              </label>
              <textarea
                value={newTrigger.message}
                onChange={(e) => setNewTrigger(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Merci pour votre interet ! Voici le lien..."
                className="input-field w-full h-20"
              />
            </div>
            <button
              onClick={handleAddTrigger}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter trigger
            </button>
          </div>

          {/* Triggers List */}
          {triggers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucun trigger configure</p>
            </div>
          ) : (
            <div className="space-y-3">
              {triggers.map(trigger => (
                <div
                  key={trigger.id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {trigger.keywords?.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{trigger.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Action: {trigger.action}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTrigger(trigger.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {activeTab === 'config' && (
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
