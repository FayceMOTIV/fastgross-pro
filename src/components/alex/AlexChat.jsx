import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import AlexActionCard from './AlexActionCard';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `Salut ! Je suis Alex, ton associe commercial IA.\n\nMon job c'est simple : je trouve des clients pour toi pendant que tu fais ton metier.\n\nPour commencer, dis-moi ce que tu fais. Par exemple :\n- "Je suis plombier a Marseille"\n- "J'ai un restaurant a Lyon"\n- "Je suis coach sportif, je cherche des clients en ligne"\n\nDis-moi tout, je m'adapte a n'importe quel business.`,
  actions: [],
  suggestions: [
    'Je suis plombier a Marseille',
    'J\'ai un restaurant a Lyon',
    'Je suis coach sportif',
  ],
};

export default function AlexChat() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState(WELCOME_MESSAGE.suggestions);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const orgId = currentOrg?.id;

  // Ecouter les messages en temps reel
  useEffect(() => {
    if (!orgId) return;

    const q = query(
      collection(db, `organizations/${orgId}/alexConversations`),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.reverse().map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (msgs.length === 0) {
        setMessages([WELCOME_MESSAGE]);
      } else {
        setMessages(msgs);
        const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
        if (lastAssistant?.suggestions) {
          setLastSuggestions(lastAssistant.suggestions);
        }
      }
    });

    return () => unsubscribe();
  }, [orgId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading || !orgId) return;

    setInput('');
    setLoading(true);

    try {
      const chatFn = httpsCallable(functions, 'chatWithAlex');
      const result = await chatFn({ message: text, organizationId: orgId });

      if (result.data?.suggestions) {
        setLastSuggestions(result.data.suggestions);
      }
    } catch (error) {
      console.error('Erreur Alex:', error);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
          A
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Alex — Votre associe commercial</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'En train de reflechir...' : 'En ligne'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={msg.id || i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>

            {/* Action cards */}
            {msg.actions?.length > 0 && (
              <div className="mt-2 ml-12 space-y-2">
                {msg.actions.map((action, j) => (
                  <AlexActionCard key={j} action={action} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {lastSuggestions?.length > 0 && !loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {lastSuggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:border-indigo-400 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
