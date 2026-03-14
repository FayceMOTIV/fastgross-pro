import { useState, useEffect, useCallback } from 'react';
import { db, functions } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useOrg } from '@/contexts/OrgContext';
import AlexChat from '../components/alex/AlexChat';
import AlexThreadSidebar from '../components/alex/AlexThreadSidebar';

export default function AlexChatPage() {
  const { currentOrg } = useOrg();
  const [orgContext, setOrgContext] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  const orgId = currentOrg?.id;

  // Load org context for welcome message
  useEffect(() => {
    if (!orgId) return;
    const fetchContext = async () => {
      try {
        const [prospectsSnap, kpisSnap] = await Promise.all([
          getDocs(query(
            collection(db, `organizations/${orgId}/prospects`),
            orderBy('score', 'desc'),
            limit(10)
          )),
          getDoc(doc(db, `organizations/${orgId}/alexMemory/kpis`)),
        ]);

        const allProspects = prospectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setOrgContext({
          hotProspects: allProspects.filter(p => (p.score || 0) >= 60).slice(0, 5),
          kpis: kpisSnap.exists() ? kpisSnap.data() : {},
          recentReplies: [],
        });
      } catch (e) {
        console.warn('[AlexChatPage] Context fetch failed:', e.message);
        setOrgContext({ hotProspects: [], kpis: {}, recentReplies: [] });
      }
    };
    fetchContext();
  }, [orgId]);

  // Listen to conversationState for activeThreadId
  useEffect(() => {
    if (!orgId) return;
    const unsub = onSnapshot(
      doc(db, `organizations/${orgId}/alexMemory/conversationState`),
      (snap) => {
        if (snap.exists()) {
          const tid = snap.data().activeThreadId;
          if (tid && !activeThreadId) setActiveThreadId(tid);
        }
      }
    );
    return () => unsub();
  }, [orgId]);

  // Auto-migrate if no threads exist
  useEffect(() => {
    if (!orgId || migrationDone) return;
    const checkAndMigrate = async () => {
      try {
        const threadsSnap = await getDocs(query(
          collection(db, `organizations/${orgId}/alexThreads`),
          limit(1)
        ));
        if (threadsSnap.empty) {
          console.log('[AlexChatPage] No threads found, triggering migration...');
          const migrateFn = httpsCallable(functions, 'migrateAlexConversations');
          const result = await migrateFn({ organizationId: orgId });
          if (result.data?.threadId) {
            setActiveThreadId(result.data.threadId);
          }
        }
      } catch (e) {
        console.warn('[AlexChatPage] Migration check failed:', e.message);
      }
      setMigrationDone(true);
    };
    checkAndMigrate();
  }, [orgId, migrationDone]);

  const handleNewThread = useCallback(async () => {
    if (!orgId) return;
    try {
      const fn = httpsCallable(functions, 'createAlexThread');
      const result = await fn({ organizationId: orgId });
      if (result.data?.threadId) {
        setActiveThreadId(result.data.threadId);
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error('[AlexChatPage] Create thread failed:', err.message);
    }
  }, [orgId]);

  const handleSelectThread = useCallback((threadId) => {
    setActiveThreadId(threadId);
    // Update activeThreadId in Firestore
    if (orgId) {
      setDoc(doc(db, `organizations/${orgId}/alexMemory/conversationState`), {
        activeThreadId: threadId,
      }, { merge: true }).catch(() => {});
    }
  }, [orgId]);

  return (
    <div className="h-[calc(100vh-4rem)] -m-4 lg:-m-8 flex">
      <AlexThreadSidebar
        orgId={orgId}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0">
        <AlexChat
          orgContext={orgContext}
          threadId={activeThreadId}
          onNewThread={handleNewThread}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
      </div>
    </div>
  );
}
