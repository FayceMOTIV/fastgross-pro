import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import toast from 'react-hot-toast';

export default function WhatsAppLinkSettings() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('idle'); // idle | sent | verified
  const [linkedPhone, setLinkedPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportHour, setReportHour] = useState('08');

  const orgId = currentOrg?.id;

  // Charger l'etat actuel
  useEffect(() => {
    if (!orgId) return;
    const loadPrefs = async () => {
      try {
        const prefDoc = await getDoc(doc(db, `organizations/${orgId}/alexMemory/preferences`));
        if (prefDoc.exists()) {
          const data = prefDoc.data();
          if (data.userWhatsApp) {
            setLinkedPhone(data.userWhatsApp);
            setStep('verified');
          }
          if (data.dailyReportWhatsApp) setReportEnabled(true);
          if (data.dailyReportHour) setReportHour(data.dailyReportHour);
        }
      } catch {
        // ignore
      }
    };
    loadPrefs();
  }, [orgId]);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      toast.error('Entre ton numero de telephone');
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'sendWhatsAppVerification');
      await fn({ phone: phone.trim() });
      setStep('sent');
      toast.success('Code envoye par WhatsApp !');
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      toast.error('Entre le code a 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'verifyWhatsAppCode');
      const result = await fn({ code: code.trim() });
      setLinkedPhone(result.data.phone);
      setStep('verified');
      toast.success('WhatsApp connecte !');
    } catch (error) {
      toast.error(error.message || 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'unlinkWhatsApp');
      await fn({});
      setLinkedPhone(null);
      setStep('idle');
      setPhone('');
      setCode('');
      toast.success('WhatsApp deconnecte');
    } catch (error) {
      toast.error(error.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Connecter Alex a ton WhatsApp</h3>
          <p className="text-sm text-gray-500">Parle a Alex directement depuis WhatsApp</p>
        </div>
      </div>

      {step === 'verified' && linkedPhone ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-800">
              Connecte : +{linkedPhone}
            </span>
            <button
              onClick={handleUnlink}
              disabled={loading}
              className="ml-auto text-sm text-red-600 hover:text-red-700"
            >
              Deconnecter
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">Rapport quotidien par WhatsApp</p>
              <p className="text-xs text-gray-500">Recois tes KPIs chaque matin</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reportHour}
                onChange={(e) => setReportHour(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1"
              >
                {Array.from({ length: 13 }, (_, i) => i + 7).map(h => (
                  <option key={h} value={String(h).padStart(2, '0')}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <button
                onClick={() => setReportEnabled(!reportEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  reportEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    reportEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      ) : step === 'sent' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Un code a 6 chiffres a ete envoye au {phone}
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code a 6 chiffres"
            className="input-field w-full text-center text-lg tracking-widest"
            maxLength={6}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setStep('idle'); setCode(''); }}
              className="btn-secondary flex-1"
            >
              Retour
            </button>
            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className="btn-primary flex-1"
            >
              {loading ? 'Verification...' : 'Verifier'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Entre ton numero pour recevoir un code de verification par WhatsApp.
          </p>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            className="input-field w-full"
          />
          <button
            onClick={handleSendCode}
            disabled={loading || !phone.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le code'}
          </button>
        </div>
      )}
    </div>
  );
}
