import { useState } from 'react';

const EXAMPLE_BUSINESSES = [
  { label: 'Plombier a Marseille', text: 'Je suis plombier a Marseille, je cherche des clients particuliers', icon: '🔧', sub: 'Artisan local' },
  { label: 'Restaurant a Lyon', text: 'J\'ai un restaurant a Lyon, je cherche plus de clients', icon: '🍽️', sub: 'Restauration' },
  { label: 'Coach sportif', text: 'Je suis coach sportif, je cherche des clients en ligne', icon: '💪', sub: 'Services en ligne' },
  { label: 'Agence web', text: 'J\'ai une agence web, je cherche des TPE/PME a accompagner', icon: '💻', sub: 'B2B Services' },
  { label: 'Architecte a Paris', text: 'Je suis architecte a Paris, je cherche des projets de renovation', icon: '📐', sub: 'Liberal' },
  { label: 'Salon de coiffure', text: 'J\'ai un salon de coiffure, je cherche plus de clients', icon: '✂️', sub: 'Commerce local' },
];

const FEATURES = [
  { icon: '🔍', label: '201 sources web', desc: 'Scraping intelligent' },
  { icon: '🎯', label: 'Qualification BANT', desc: 'Budget, Autorite, Besoin, Timing' },
  { icon: '📩', label: 'Multicanal', desc: 'Email, SMS, WhatsApp, LinkedIn' },
  { icon: '🤖', label: 'IA conversationnelle', desc: 'Alex comprend tes besoins' },
];

export default function AlexOnboarding({ onStart }) {
  const [selectedExample, setSelectedExample] = useState(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-10 text-center animate-fade-in">
      {/* Avatar */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-indigo-500/20">
          A
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-4 border-[#FAFBFE] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2 font-display">
        Salut ! Je suis Alex.
      </h1>
      <p className="text-gray-500 mb-6 max-w-md text-sm leading-relaxed">
        Ton associe commercial IA. Je scanne <strong className="text-gray-900">201 sources</strong> pour trouver tes clients pendant que tu fais ton metier.
      </p>

      {/* Features row */}
      <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-lg">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm">
            <span className="text-xs">{f.icon}</span>
            <span className="text-[11px] font-medium text-gray-700">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Dis-moi ce que tu fais
      </p>

      {/* Example cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-xl w-full mb-6">
        {EXAMPLE_BUSINESSES.map((example) => (
          <button
            key={example.label}
            onClick={() => {
              setSelectedExample(example.text);
              onStart?.(example.text);
            }}
            className={`p-3.5 rounded-xl border text-left transition-all group ${
              selectedExample === example.text
                ? 'border-indigo-400 bg-indigo-50 shadow-md shadow-indigo-500/10'
                : 'border-gray-200/80 bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5'
            }`}
          >
            <span className="text-lg mb-1.5 block group-hover:scale-110 transition-transform">{example.icon}</span>
            <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">{example.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{example.sub}</p>
          </button>
        ))}
      </div>

      {/* Bottom hint */}
      <p className="text-[11px] text-gray-300">
        Ou tape directement ton message ci-dessous
      </p>
    </div>
  );
}
