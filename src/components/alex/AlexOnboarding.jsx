import { useState } from 'react';

const EXAMPLE_BUSINESSES = [
  { label: 'Plombier a Marseille', text: 'Je suis plombier a Marseille, je cherche des clients particuliers' },
  { label: 'Restaurant a Lyon', text: 'J\'ai un restaurant a Lyon, je cherche plus de clients' },
  { label: 'Coach sportif', text: 'Je suis coach sportif, je cherche des clients en ligne' },
  { label: 'Agence web', text: 'J\'ai une agence web, je cherche des TPE/PME a accompagner' },
];

export default function AlexOnboarding({ onStart }) {
  const [selectedExample, setSelectedExample] = useState(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl mb-6">
        A
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Bienvenue ! Je suis Alex.
      </h1>
      <p className="text-gray-600 mb-8 max-w-md">
        Ton associe commercial IA. Mon job : trouver des clients pour toi pendant que tu fais ton metier.
      </p>

      <p className="text-sm text-gray-500 mb-4">
        Dis-moi ce que tu fais, par exemple :
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-lg w-full mb-8">
        {EXAMPLE_BUSINESSES.map((example) => (
          <button
            key={example.label}
            onClick={() => {
              setSelectedExample(example.text);
              onStart?.(example.text);
            }}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedExample === example.text
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
          >
            <p className="font-medium text-gray-900 text-sm">{example.label}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Ou tape directement ton message dans le chat ci-dessous
      </p>
    </div>
  );
}
