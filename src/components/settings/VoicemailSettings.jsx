/**
 * Voicemail Settings Component
 * Configuration Drop Cowboy API + Voice Clone
 */

import { useState, useEffect, useRef } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import {
  Voicemail,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Mic,
  Upload,
  Play,
  Pause,
  Trash2,
  FileText,
  Clock,
  Volume2
} from 'lucide-react';

export default function VoicemailSettings() {
  const { currentOrg } = useOrg();
  const [config, setConfig] = useState({
    teamId: '',
    secret: '',
    brandId: '',
    callerId: '',
    defaultVoiceId: '',
    enabled: false
  });
  const [voices, setVoices] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('config');
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentOrg?.id) {
      loadConfig();
      loadVoices();
      loadScripts();
      loadStats();
    }
  }, [currentOrg?.id]);

  const loadConfig = async () => {
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'voicemail');
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

  const loadVoices = async () => {
    try {
      const voicesRef = collection(db, 'organizations', currentOrg.id, 'voiceClones');
      const voicesSnap = await getDocs(voicesRef);

      setVoices(voicesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const loadScripts = async () => {
    try {
      const scriptsRef = collection(db, 'organizations', currentOrg.id, 'voicemailScripts');
      const scriptsSnap = await getDocs(scriptsRef);

      setScripts(scriptsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error loading scripts:', error);
    }
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const analyticsRef = doc(db, 'organizations', currentOrg.id, 'channelAnalytics', today);
      const analyticsSnap = await getDoc(analyticsRef);

      if (analyticsSnap.exists()) {
        setStats(analyticsSnap.data().channels?.voicemail || null);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'voicemail');
      await setDoc(configRef, {
        ...config,
        updatedAt: new Date()
      }, { merge: true });

      toast.success('Configuration Voicemail enregistree');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadVoice = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Fichier audio requis (MP3, WAV)');
      return;
    }

    setUploading(true);
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('orgId', currentOrg.id);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

      const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/uploadVoiceClone`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Voice clone en cours de creation...');
        loadVoices();
      } else {
        toast.error(result.error || 'Echec upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePlayVoice = (voice) => {
    if (playingVoice === voice.id) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (voice.previewUrl) {
        if (audioRef.current) {
          audioRef.current.src = voice.previewUrl;
          audioRef.current.play();
        }
        setPlayingVoice(voice.id);
      } else {
        toast.error('Pas de preview disponible');
      }
    }
  };

  const handleDeleteVoice = async (voiceId) => {
    if (!confirm('Supprimer ce voice clone ?')) return;

    try {
      await deleteDoc(doc(db, 'organizations', currentOrg.id, 'voiceClones', voiceId));
      toast.success('Voice clone supprime');
      loadVoices();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSetDefaultVoice = async (voiceId) => {
    setConfig(prev => ({ ...prev, defaultVoiceId: voiceId }));
    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'integrations', 'voicemail');
      await setDoc(configRef, { defaultVoiceId: voiceId }, { merge: true });
      toast.success('Voix par defaut mise a jour');
    } catch (error) {
      console.error('Error setting default voice:', error);
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
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={() => setPlayingVoice(null)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Voicemail className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration Voicemail</h3>
            <p className="text-sm text-gray-500">Drop Cowboy - Ringless Voicemail</p>
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
            <p className="text-sm text-gray-500">Deposes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.dropped || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Delivres</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Callbacks</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.callbacks || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Cout/drop</p>
            <p className="text-2xl font-bold text-gray-900">$0.004</p>
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
            onClick={() => setActiveTab('voices')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'voices'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Voice Clones ({voices.length})
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'scripts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Scripts ({scripts.length})
          </button>
        </nav>
      </div>

      {activeTab === 'config' && (
        <>
          {/* Configuration */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h4 className="font-medium text-gray-900">Identifiants Drop Cowboy</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team ID
                </label>
                <input
                  type="text"
                  value={config.teamId}
                  onChange={(e) => setConfig(prev => ({ ...prev, teamId: e.target.value }))}
                  placeholder="team_xxxxx"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret
                </label>
                <input
                  type="password"
                  value={config.secret}
                  onChange={(e) => setConfig(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="••••••••••••"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand ID
                </label>
                <input
                  type="text"
                  value={config.brandId}
                  onChange={(e) => setConfig(prev => ({ ...prev, brandId: e.target.value }))}
                  placeholder="brand_xxxxx"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caller ID (numero affiche)
                </label>
                <input
                  type="text"
                  value={config.callerId}
                  onChange={(e) => setConfig(prev => ({ ...prev, callerId: e.target.value }))}
                  placeholder="+33612345678"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="vm-enabled"
                checked={config.enabled}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="vm-enabled" className="text-sm text-gray-700">
                Activer Voicemail Drop
              </label>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Conformite Voicemail</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horaires legaux : 8h-20h en semaine
                  </li>
                  <li>• Opt-in explicite requis</li>
                  <li>• Mobile uniquement (pas de fixe)</li>
                  <li>• Maximum 1 voicemail par prospect sur 30 jours</li>
                  <li>• Duree optimale : 20-30 secondes</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'voices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Clonez votre voix a partir d'un echantillon audio (30 sec min)
            </p>
            <label className="btn-primary flex items-center gap-2 cursor-pointer">
              {uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Uploader audio
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleUploadVoice}
                className="hidden"
              />
            </label>
          </div>

          {/* Default Voices */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h5 className="font-medium text-gray-700 mb-3">Voix par defaut</h5>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'fr_male_default', name: 'Pierre (Francais)', gender: 'male' },
                { id: 'fr_female_default', name: 'Marie (Francaise)', gender: 'female' },
                { id: 'en_male_default', name: 'John (English)', gender: 'male' },
                { id: 'en_female_default', name: 'Sarah (English)', gender: 'female' }
              ].map(voice => (
                <div
                  key={voice.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    config.defaultVoiceId === voice.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => handleSetDefaultVoice(voice.id)}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{voice.name}</span>
                    {config.defaultVoiceId === voice.id && (
                      <CheckCircle className="w-4 h-4 text-indigo-600 ml-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Voices */}
          {voices.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Vos voice clones</h5>
              <div className="space-y-3">
                {voices.map(voice => (
                  <div
                    key={voice.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayVoice(voice)}
                          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                        >
                          {playingVoice === voice.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <p className="font-medium text-gray-900">{voice.name}</p>
                          <p className="text-xs text-gray-500">
                            {voice.status === 'ready' ? 'Pret' : 'En traitement...'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetDefaultVoice(voice.id)}
                          className={`px-3 py-1 text-sm rounded ${
                            config.defaultVoiceId === voice.id
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {config.defaultVoiceId === voice.id ? 'Par defaut' : 'Definir par defaut'}
                        </button>
                        <button
                          onClick={() => handleDeleteVoice(voice.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scripts' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Scripts de voicemail personnalises avec variables dynamiques
          </p>

          {/* Default Scripts */}
          <div className="space-y-3">
            {[
              { id: 'introduction', name: 'Introduction', duration: '22 sec' },
              { id: 'follow_up', name: 'Suivi', duration: '18 sec' },
              { id: 'value_proposition', name: 'Proposition de valeur', duration: '20 sec' },
              { id: 'breakup', name: 'Dernier message', duration: '15 sec' }
            ].map(script => (
              <div
                key={script.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{script.name}</p>
                    <p className="text-xs text-gray-500">
                      Template par defaut • {script.duration}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Default
                  </span>
                </div>
              </div>
            ))}

            {scripts.map(script => (
              <div
                key={script.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{script.name}</p>
                    <p className="text-xs text-gray-500">
                      Custom • {script.estimatedDuration || '?'} sec
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
