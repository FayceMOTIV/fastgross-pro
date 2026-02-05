'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Camera,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DeliveryStop, failDelivery, FAIL_REASONS } from '@/services/livreur-service';

interface DeliveryProblemProps {
  delivery: DeliveryStop;
  onComplete: () => void;
  onCancel: () => void;
}

export function DeliveryProblem({
  delivery,
  onComplete,
  onCancel,
}: DeliveryProblemProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedReasonData = FAIL_REASONS.find(r => r.id === selectedReason);
  const requiresPhoto = selectedReasonData?.requirePhoto || false;

  const handleAddPhoto = () => {
    // Simulate photo capture (in real app, would use camera API)
    const mockPhoto = `data:image/png;base64,problem-photo-${Date.now()}`;
    setPhotos(prev => [...prev, mockPhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    if (requiresPhoto && photos.length === 0) return;

    setIsSubmitting(true);
    try {
      await failDelivery(delivery.id, {
        reason: selectedReasonData?.label || selectedReason,
        details: details.trim() || undefined,
        photos,
      });
      onComplete();
    } catch (error) {
      console.error('Erreur signalement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    selectedReason &&
    (!requiresPhoto || photos.length > 0) &&
    (selectedReason !== 'other' || details.trim());

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          <h1 className="font-semibold flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Signaler un problème
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Info livraison */}
        <div className="text-center pb-4 border-b">
          <p className="font-medium">{delivery.client.name}</p>
          <p className="text-sm text-muted-foreground">
            Livraison #{delivery.sequence}
          </p>
        </div>

        {/* Liste des raisons */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Sélectionnez le problème:
          </label>
          <div className="space-y-2">
            {FAIL_REASONS.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                  selectedReason === reason.id
                    ? 'border-red-500 bg-red-50'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <span className="text-2xl">{reason.icon}</span>
                <span className="flex-1 font-medium">{reason.label}</span>
                {selectedReason === reason.id && (
                  <Check className="h-5 w-5 text-red-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Photo obligatoire si requis */}
        {selectedReason && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photo {requiresPhoto ? '(obligatoire)' : '(optionnel)'}
              {requiresPhoto && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-3 flex-wrap">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden"
                >
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    📷
                  </div>
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddPhoto}
                className={cn(
                  'w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors',
                  requiresPhoto && photos.length === 0
                    ? 'border-red-300 text-red-500'
                    : 'text-muted-foreground'
                )}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">
                  {photos.length === 0 ? 'Prendre' : 'Ajouter'}
                </span>
              </button>
            </div>
            {requiresPhoto && photos.length === 0 && (
              <p className="text-xs text-red-500">
                Une photo est requise pour ce type de problème
              </p>
            )}
          </div>
        )}

        {/* Détails */}
        {selectedReason && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Détails {selectedReason === 'other' && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                selectedReason === 'other'
                  ? 'Décrivez le problème rencontré...'
                  : 'Informations complémentaires (optionnel)...'
              }
              className="min-h-[120px]"
            />
          </div>
        )}

        {/* Avertissement */}
        {selectedReason && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Attention</p>
                <p>
                  Ce signalement sera transmis au dispatch immédiatement.
                  La livraison sera marquée comme échouée.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bouton signaler */}
        <div className="pt-4">
          <Button
            size="lg"
            variant="destructive"
            className="w-full h-16 text-lg"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              'Signalement en cours...'
            ) : (
              <>
                <AlertTriangle className="h-6 w-6 mr-2" />
                SIGNALER LE PROBLÈME
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
