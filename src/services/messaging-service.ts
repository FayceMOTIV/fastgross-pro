// =============================================================================
// SERVICE MESSAGERIE FIREBASE - DISTRAM by Face Media
// Chat temps réel type Slack pour les employés DISTRAM
// =============================================================================

import {
  ref,
  push,
  set,
  get,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp,
  update,
} from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import type { ChatChannel, Message } from '@/types';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface CreateChannelInput {
  name: string;
  type: 'team' | 'direct' | 'broadcast';
  members: string[];
}

export interface SendMessageInput {
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'location';
  replyTo?: string;
}

// -----------------------------------------------------------------------------
// CHANNELS
// -----------------------------------------------------------------------------

export async function createChannel(input: CreateChannelInput): Promise<string> {
  const channelsRef = ref(realtimeDb, 'channels');
  const newChannelRef = push(channelsRef);

  const channel: Omit<ChatChannel, 'id'> = {
    name: input.name,
    type: input.type,
    members: input.members,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await set(newChannelRef, {
    ...channel,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newChannelRef.key!;
}

export async function getChannels(userId: string): Promise<ChatChannel[]> {
  const channelsRef = ref(realtimeDb, 'channels');
  const snapshot = await get(channelsRef);

  if (!snapshot.exists()) {
    return [];
  }

  const channels: ChatChannel[] = [];
  snapshot.forEach((child) => {
    const data = child.val();
    // Only include channels where the user is a member
    if (data.members?.includes(userId) || data.type === 'broadcast') {
      channels.push({
        id: child.key!,
        ...data,
        createdAt: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
      });
    }
  });

  return channels;
}

export async function getChannel(channelId: string): Promise<ChatChannel | null> {
  const channelRef = ref(realtimeDb, `channels/${channelId}`);
  const snapshot = await get(channelRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val();
  return {
    id: channelId,
    ...data,
    createdAt: new Date(data.createdAt || Date.now()),
    updatedAt: new Date(data.updatedAt || Date.now()),
  };
}

export function subscribeToChannels(
  userId: string,
  callback: (channels: ChatChannel[]) => void
): () => void {
  const channelsRef = ref(realtimeDb, 'channels');

  const handleValue = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const channels: ChatChannel[] = [];
    snapshot.forEach((child: any) => {
      const data = child.val();
      if (data.members?.includes(userId) || data.type === 'broadcast') {
        channels.push({
          id: child.key!,
          ...data,
          createdAt: new Date(data.createdAt || Date.now()),
          updatedAt: new Date(data.updatedAt || Date.now()),
        });
      }
    });

    callback(channels);
  };

  onValue(channelsRef, handleValue);

  // Return unsubscribe function
  return () => off(channelsRef, 'value', handleValue);
}

// -----------------------------------------------------------------------------
// MESSAGES
// -----------------------------------------------------------------------------

export async function sendMessage(input: SendMessageInput): Promise<string> {
  const messagesRef = ref(realtimeDb, `messages/${input.channelId}`);
  const newMessageRef = push(messagesRef);

  const message: Omit<Message, 'id'> = {
    channelId: input.channelId,
    senderId: input.senderId,
    senderName: input.senderName,
    content: input.content,
    type: input.type || 'text',
    timestamp: new Date(),
    readBy: [input.senderId],
    replyTo: input.replyTo,
  };

  await set(newMessageRef, {
    ...message,
    timestamp: serverTimestamp(),
  });

  // Update channel's last message and updatedAt
  const channelRef = ref(realtimeDb, `channels/${input.channelId}`);
  await update(channelRef, {
    lastMessage: {
      content: input.content,
      senderName: input.senderName,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  return newMessageRef.key!;
}

export async function getMessages(
  channelId: string,
  limit: number = 50
): Promise<Message[]> {
  const messagesRef = ref(realtimeDb, `messages/${channelId}`);
  const messagesQuery = query(
    messagesRef,
    orderByChild('timestamp'),
    limitToLast(limit)
  );

  const snapshot = await get(messagesQuery);

  if (!snapshot.exists()) {
    return [];
  }

  const messages: Message[] = [];
  snapshot.forEach((child) => {
    const data = child.val();
    messages.push({
      id: child.key!,
      ...data,
      timestamp: new Date(data.timestamp || Date.now()),
    });
  });

  return messages.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function subscribeToMessages(
  channelId: string,
  callback: (messages: Message[]) => void,
  limit: number = 100
): () => void {
  const messagesRef = ref(realtimeDb, `messages/${channelId}`);
  const messagesQuery = query(
    messagesRef,
    orderByChild('timestamp'),
    limitToLast(limit)
  );

  const handleValue = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const messages: Message[] = [];
    snapshot.forEach((child: any) => {
      const data = child.val();
      messages.push({
        id: child.key!,
        ...data,
        timestamp: new Date(data.timestamp || Date.now()),
      });
    });

    // Sort by timestamp
    messages.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    callback(messages);
  };

  onValue(messagesQuery, handleValue);

  return () => off(messagesQuery, 'value', handleValue);
}

// -----------------------------------------------------------------------------
// READ STATUS
// -----------------------------------------------------------------------------

export async function markMessageAsRead(
  channelId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const messageRef = ref(realtimeDb, `messages/${channelId}/${messageId}/readBy`);
  const snapshot = await get(messageRef);

  const readBy: string[] = snapshot.exists() ? snapshot.val() : [];

  if (!readBy.includes(userId)) {
    await set(messageRef, [...readBy, userId]);
  }
}

export async function markChannelAsRead(
  channelId: string,
  userId: string
): Promise<void> {
  const messagesRef = ref(realtimeDb, `messages/${channelId}`);
  const snapshot = await get(messagesRef);

  if (!snapshot.exists()) return;

  const updates: Record<string, string[]> = {};

  snapshot.forEach((child) => {
    const data = child.val();
    const readBy: string[] = data.readBy || [];

    if (!readBy.includes(userId)) {
      updates[`${child.key}/readBy`] = [...readBy, userId];
    }
  });

  if (Object.keys(updates).length > 0) {
    await update(messagesRef, updates);
  }
}

// -----------------------------------------------------------------------------
// PRESENCE / TYPING
// -----------------------------------------------------------------------------

export async function setUserTyping(
  channelId: string,
  userId: string,
  userName: string,
  isTyping: boolean
): Promise<void> {
  const typingRef = ref(realtimeDb, `typing/${channelId}/${userId}`);

  if (isTyping) {
    await set(typingRef, {
      name: userName,
      timestamp: serverTimestamp(),
    });
  } else {
    await set(typingRef, null);
  }
}

export function subscribeToTyping(
  channelId: string,
  currentUserId: string,
  callback: (typingUsers: { id: string; name: string }[]) => void
): () => void {
  const typingRef = ref(realtimeDb, `typing/${channelId}`);

  const handleValue = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const typingUsers: { id: string; name: string }[] = [];
    const now = Date.now();

    snapshot.forEach((child: any) => {
      const data = child.val();
      // Only show typing indicators from last 5 seconds and not from current user
      if (child.key !== currentUserId && now - data.timestamp < 5000) {
        typingUsers.push({
          id: child.key!,
          name: data.name,
        });
      }
    });

    callback(typingUsers);
  };

  onValue(typingRef, handleValue);

  return () => off(typingRef, 'value', handleValue);
}

// -----------------------------------------------------------------------------
// INITIAL DATA (pour démo)
// -----------------------------------------------------------------------------

export async function initializeDefaultChannels(): Promise<void> {
  const channelsRef = ref(realtimeDb, 'channels');
  const snapshot = await get(channelsRef);

  // Don't initialize if channels already exist
  if (snapshot.exists()) {
    return;
  }

  // Create default channels
  const defaultChannels: CreateChannelInput[] = [
    {
      name: 'Général',
      type: 'team',
      members: ['all'],
    },
    {
      name: 'Équipe commerciale',
      type: 'team',
      members: ['commercial'],
    },
    {
      name: 'Livreurs',
      type: 'team',
      members: ['livreur'],
    },
    {
      name: 'Annonces',
      type: 'broadcast',
      members: ['admin'],
    },
    {
      name: 'Support',
      type: 'team',
      members: ['all'],
    },
  ];

  for (const channel of defaultChannels) {
    await createChannel(channel);
  }

  console.log('Default channels initialized');
}
