'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Camera,
  Clock,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getMessages,
  sendMessage,
  Message,
} from '@/services/livreur-service';
import { QuickMessages } from '@/components/livreur/quick-messages';

export default function LivreurMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await getMessages('driver-1');
      setMessages(data);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (text?: string) => {
    const messageText = text || newMessage.trim();
    if (!messageText) return;

    setIsSending(true);
    try {
      const msg = await sendMessage('driver-1', messageText);
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      setShowQuickMessages(false);
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickMessage = (message: string) => {
    handleSend(message);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-16 bg-muted rounded w-3/4" />
            <div className="h-16 bg-muted rounded w-2/3 ml-auto" />
            <div className="h-16 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <h1 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages Dispatch
          </h1>
          <p className="text-sm text-muted-foreground">
            Communication avec le bureau
          </p>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                {date}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {msgs.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick messages panel */}
      {showQuickMessages && (
        <QuickMessages
          onSelect={handleQuickMessage}
          onClose={() => setShowQuickMessages(false)}
        />
      )}

      {/* Input area */}
      <div className="sticky bottom-16 bg-background border-t p-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-12 w-12"
            onClick={() => setShowQuickMessages(!showQuickMessages)}
          >
            <Clock className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="h-12 pr-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-10 w-10"
              disabled={!newMessage.trim() || isSending}
              onClick={() => handleSend()}
            >
              <Send className={cn(
                'h-5 w-5',
                newMessage.trim() ? 'text-primary' : 'text-muted-foreground'
              )} />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 h-12 w-12"
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  formatTime,
}: {
  message: Message;
  formatTime: (date: Date) => string;
}) {
  const isDriver = message.from === 'driver';

  return (
    <div className={cn('flex', isDriver ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isDriver
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
        )}
      >
        {/* Sender label for dispatch */}
        {!isDriver && (
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Dispatch
          </p>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Time and status */}
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isDriver ? 'justify-end' : 'justify-start'
        )}>
          <span className={cn(
            'text-xs',
            isDriver ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {formatTime(message.timestamp)}
          </span>
          {isDriver && (
            message.read ? (
              <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
            ) : (
              <Check className="h-3 w-3 text-primary-foreground/70" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
