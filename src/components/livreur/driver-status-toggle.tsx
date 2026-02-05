'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { updateDriverStatus } from '@/services/livreur-service';

type Status = 'online' | 'pause' | 'offline';

interface DriverStatusToggleProps {
  currentStatus: Status;
  onStatusChange: (status: Status) => void;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; bgColor: string; icon: string }> = {
  online: {
    label: 'En ligne',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    icon: '🟢',
  },
  pause: {
    label: 'Pause',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-300',
    icon: '⏸️',
  },
  offline: {
    label: 'Hors ligne',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    icon: '🔴',
  },
};

export function DriverStatusToggle({ currentStatus, onStatusChange }: DriverStatusToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (status: Status) => {
    if (status === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateDriverStatus('driver-1', status);
      onStatusChange(status);
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const config = STATUS_CONFIG[currentStatus];

  if (isOpen) {
    return (
      <div className="flex gap-1">
        {(Object.keys(STATUS_CONFIG) as Status[]).map((status) => {
          const statusConfig = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating}
              className={cn(
                'px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
                'min-h-[36px]',
                status === currentStatus
                  ? statusConfig.bgColor
                  : 'bg-muted hover:bg-muted/80 border-transparent',
                statusConfig.color,
                isUpdating && 'opacity-50'
              )}
            >
              {statusConfig.icon} {statusConfig.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
        'min-h-[36px]',
        config.bgColor,
        config.color
      )}
    >
      {config.icon} {config.label}
    </button>
  );
}

export function DriverStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      {config.icon} {config.label}
    </span>
  );
}
