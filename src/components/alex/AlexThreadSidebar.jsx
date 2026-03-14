import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

const GROUP_LABELS = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  week: '7 derniers jours',
  older: 'Plus ancien',
};

function groupThreads(threads) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const groups = { today: [], yesterday: [], week: [], older: [] };
  for (const t of threads) {
    const d = t.updatedAt?.toDate?.() || (t.updatedAt ? new Date(t.updatedAt) : new Date(0));
    if (d >= today) groups.today.push(t);
    else if (d >= yesterday) groups.yesterday.push(t);
    else if (d >= weekAgo) groups.week.push(t);
    else groups.older.push(t);
  }
  return groups;
}

export default function AlexThreadSidebar({ orgId, activeThreadId, onSelectThread, onNewThread, open, onClose }) {
  const [threads, setThreads] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  // Real-time listener on alexThreads
  useEffect(() => {
    if (!orgId) return;
    const q = query(
      collection(db, `organizations/${orgId}/alexThreads`),
      where('archived', '==', false),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('[AlexThreadSidebar] Snapshot error:', err.message);
    });
    return () => unsub();
  }, [orgId]);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  const handleDelete = async (threadId) => {
    setContextMenu(null);
    try {
      const fn = httpsCallable(functions, 'deleteAlexThread');
      await fn({ organizationId: orgId, threadId });
    } catch (err) {
      console.error('[AlexThreadSidebar] Delete failed:', err.message);
    }
  };

  const handleRenameStart = (thread) => {
    setContextMenu(null);
    setRenaming(thread.id);
    setRenameValue(thread.title || '');
  };

  const handleRenameSubmit = async (threadId) => {
    if (!renameValue.trim()) { setRenaming(null); return; }
    try {
      const fn = httpsCallable(functions, 'renameAlexThread');
      await fn({ organizationId: orgId, threadId, title: renameValue.trim() });
    } catch (err) {
      console.error('[AlexThreadSidebar] Rename failed:', err.message);
    }
    setRenaming(null);
  };

  const grouped = groupThreads(threads);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* New conversation button */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={onNewThread}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle conversation
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-2">
        {threads.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8 px-4">Aucune conversation</p>
        )}

        {Object.entries(grouped).map(([group, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-1">
              <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {GROUP_LABELS[group]}
              </p>
              {items.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isRenaming = renaming === thread.id;

                return (
                  <div
                    key={thread.id}
                    className={`group relative mx-2 rounded-lg cursor-pointer transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => { if (!isRenaming) { onSelectThread(thread.id); onClose?.(); } }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ threadId: thread.id, x: e.clientX, y: e.clientY }); }}
                  >
                    <div className="px-3 py-2.5 pr-8">
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRenameSubmit(thread.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(thread.id);
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-sm bg-white border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      ) : (
                        <>
                          <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                            {thread.title || 'Sans titre'}
                          </p>
                          {thread.lastMessage && (
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{thread.lastMessage}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* 3-dot menu button */}
                    {!isRenaming && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu(contextMenu?.threadId === thread.id ? null : { threadId: thread.id, x: e.clientX, y: e.clientY });
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[140px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleRenameStart(threads.find(t => t.id === contextMenu.threadId))}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Renommer
            </button>
            <button
              onClick={() => handleDelete(contextMenu.threadId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0 h-full">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden animate-slide-in-left">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
