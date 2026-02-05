'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUICK_MESSAGES } from '@/services/livreur-service';

interface QuickMessagesProps {
  onSelect: (message: string) => void;
  onClose: () => void;
}

export function QuickMessages({ onSelect, onClose }: QuickMessagesProps) {
  return (
    <div className="bg-background border-t p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Messages rapides</p>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_MESSAGES.map((message) => (
          <button
            key={message}
            onClick={() => onSelect(message)}
            className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
          >
            {message}
          </button>
        ))}
      </div>
    </div>
  );
}
