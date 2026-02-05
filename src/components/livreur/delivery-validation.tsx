'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Camera,
  Trash2,
  X,
  User,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DeliveryStop, completeDelivery } from '@/services/livreur-service';

interface DeliveryValidationProps {
  delivery: DeliveryStop;
  onComplete: () => void;
  onCancel: () => void;
}

export function DeliveryValidation({
  delivery,
  onComplete,
  onCancel,
}: DeliveryValidationProps) {
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Configure drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getSignatureData = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  const handleAddPhoto = () => {
    // Simulate photo capture (in real app, would use camera API)
    const mockPhoto = `data:image/png;base64,photo-${Date.now()}`;
    setPhotos(prev => [...prev, mockPhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!receiverName.trim() || !hasSignature) return;

    setIsSubmitting(true);
    try {
      await completeDelivery(delivery.id, {
        receiverName: receiverName.trim(),
        signature: getSignatureData(),
        photos: photos.length > 0 ? photos : undefined,
        notes: notes.trim() || undefined,
      });
      onComplete();
    } catch (error) {
      console.error('Erreur validation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = receiverName.trim() && hasSignature;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          <h1 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Validation
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Info livraison */}
        <div className="text-center pb-4 border-b">
          <p className="font-medium">{delivery.client.name}</p>
          <p className="text-sm text-muted-foreground">
            {delivery.totalAmount.toLocaleString('fr-FR')}€
          </p>
        </div>

        {/* Nom du réceptionnaire */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Nom du réceptionnaire *
          </label>
          <Input
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Entrez le nom..."
            className="h-14 text-lg"
          />
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Signature *</label>
            {hasSignature && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          <div className="border-2 border-dashed rounded-lg bg-white relative">
            <canvas
              ref={canvasRef}
              className="w-full touch-none"
              style={{ height: '200px' }}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground text-sm">
                  Signez ici avec le doigt
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Photo (optionnel)
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
            {photos.length < 3 && (
              <button
                onClick={handleAddPhoto}
                className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">Ajouter</span>
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes (optionnel)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informations complémentaires..."
            className="min-h-[100px]"
          />
        </div>

        {/* Bouton confirmer */}
        <div className="pt-4">
          <Button
            size="lg"
            className={cn(
              'w-full h-16 text-lg',
              canSubmit ? 'bg-green-600 hover:bg-green-700' : ''
            )}
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              'Validation en cours...'
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 mr-2" />
                CONFIRMER LA LIVRAISON
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
