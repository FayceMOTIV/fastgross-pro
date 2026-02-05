'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Edit,
  Clock,
  ShoppingCart,
  Tag,
  UserPlus,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getPendingValidations,
  approveValidation,
  rejectValidation,
  modifyAndApprove,
  PendingValidation,
  VALIDATION_TYPE_LABELS,
} from '@/services/manager-service';

type ValidationFilter = 'all' | 'order' | 'discount' | 'new_client';

export default function ValidationsPage() {
  const [validations, setValidations] = useState<PendingValidation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ValidationFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadValidations();
  }, []);

  const loadValidations = async () => {
    setIsLoading(true);
    try {
      const data = await getPendingValidations('manager-1');
      setValidations(data);
    } catch (error) {
      console.error('Erreur chargement validations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (validationId: string) => {
    setProcessingId(validationId);
    try {
      await approveValidation(validationId);
      setValidations(prev => prev.filter(v => v.id !== validationId));
    } catch (error) {
      console.error('Erreur approbation:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (validationId: string, reason: string) => {
    setProcessingId(validationId);
    try {
      await rejectValidation(validationId, reason);
      setValidations(prev => prev.filter(v => v.id !== validationId));
    } catch (error) {
      console.error('Erreur rejet:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleModifyAndApprove = async (validationId: string, modifications: Record<string, unknown>) => {
    setProcessingId(validationId);
    try {
      await modifyAndApprove(validationId, modifications);
      setValidations(prev => prev.filter(v => v.id !== validationId));
    } catch (error) {
      console.error('Erreur modification:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredValidations = validations.filter(v => {
    if (filter === 'all') return true;
    return v.type === filter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)} jours`;
  };

  const getValidationIcon = (type: PendingValidation['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-5 w-5" />;
      case 'discount':
        return <Tag className="h-5 w-5" />;
      case 'new_client':
        return <UserPlus className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const counts = {
    all: validations.length,
    order: validations.filter(v => v.type === 'order').length,
    discount: validations.filter(v => v.type === 'discount').length,
    new_client: validations.filter(v => v.type === 'new_client').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/supervision">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Validations en attente</h1>
                <p className="text-sm text-muted-foreground">
                  {validations.length} demande{validations.length > 1 ? 's' : ''} à traiter
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes ({counts.all})
            </Button>
            <Button
              variant={filter === 'order' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('order')}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Commandes ({counts.order})
            </Button>
            <Button
              variant={filter === 'discount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('discount')}
            >
              <Tag className="h-4 w-4 mr-1" />
              Remises ({counts.discount})
            </Button>
            <Button
              variant={filter === 'new_client' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('new_client')}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Nouveaux clients ({counts.new_client})
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-40 bg-muted rounded-lg" />
            ))}
          </div>
        ) : filteredValidations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tout est à jour !</h3>
              <p className="text-muted-foreground text-center">
                Aucune validation en attente pour le moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredValidations.map((validation) => (
            <ValidationCard
              key={validation.id}
              validation={validation}
              isProcessing={processingId === validation.id}
              isExpanded={expandedId === validation.id}
              onToggleExpand={() => setExpandedId(expandedId === validation.id ? null : validation.id)}
              onApprove={() => handleApprove(validation.id)}
              onReject={(reason) => handleReject(validation.id, reason)}
              onModifyAndApprove={(mods) => handleModifyAndApprove(validation.id, mods)}
              formatCurrency={formatCurrency}
              formatTimeAgo={formatTimeAgo}
              getIcon={getValidationIcon}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ValidationCard({
  validation,
  isProcessing,
  isExpanded,
  onToggleExpand,
  onApprove,
  onReject,
  onModifyAndApprove,
  formatCurrency,
  formatTimeAgo,
  getIcon,
}: {
  validation: PendingValidation;
  isProcessing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onModifyAndApprove: (modifications: Record<string, unknown>) => void;
  formatCurrency: (amount: number) => string;
  formatTimeAgo: (date: Date) => string;
  getIcon: (type: PendingValidation['type']) => React.ReactNode;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [modifiedDiscount, setModifiedDiscount] = useState<number | null>(null);

  const typeInfo = VALIDATION_TYPE_LABELS[validation.type];

  const renderOrderValidation = () => {
    const data = validation.data as {
      orderId: string;
      clientName: string;
      amount: number;
      itemCount: number;
      marginPercent: number;
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Commande</p>
            <p className="font-medium">{data.orderId}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-medium">{data.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Montant</p>
            <p className="font-bold text-lg">{formatCurrency(data.amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Articles</p>
            <p className="font-medium">{data.itemCount} produits</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm">
            Marge: <span className={cn(
              'font-medium',
              data.marginPercent >= 15 ? 'text-green-600' :
              data.marginPercent >= 10 ? 'text-amber-600' :
              'text-red-600'
            )}>{data.marginPercent}%</span>
          </span>
        </div>
      </div>
    );
  };

  const renderDiscountValidation = () => {
    const data = validation.data as {
      clientName: string;
      productName: string;
      originalPrice: number;
      proposedPrice: number;
      discountPercent: number;
      marginAfter: number;
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-medium">{data.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Produit</p>
            <p className="font-medium">{data.productName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Prix actuel</p>
            <p className="font-medium">{data.originalPrice.toFixed(2)}€</p>
          </div>
          <span className="text-xl">→</span>
          <div>
            <p className="text-sm text-muted-foreground">Prix proposé</p>
            <p className="font-bold text-red-600">{data.proposedPrice.toFixed(2)}€</p>
          </div>
          <Badge variant="outline" className="text-red-600 border-red-300">
            -{data.discountPercent}%
          </Badge>
        </div>

        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
          <span className="text-sm">Marge après remise: <span className={cn(
            'font-medium',
            data.marginAfter >= 10 ? 'text-green-600' :
            data.marginAfter >= 5 ? 'text-amber-600' :
            'text-red-600'
          )}>{data.marginAfter}%</span></span>
        </div>

        {validation.aiSuggestion && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Suggestion IA</p>
              <p className="text-sm text-blue-700">{validation.aiSuggestion}</p>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground">Modifier la remise:</p>
            <div className="flex gap-2">
              {[5, 10, 12, 15].map(percent => (
                <Button
                  key={percent}
                  variant={modifiedDiscount === percent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModifiedDiscount(percent)}
                >
                  -{percent}%
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNewClientValidation = () => {
    const data = validation.data as {
      clientName: string;
      type: string;
      zone: string;
      proposedGrid: string;
      estimatedPotential: number;
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Nom</p>
            <p className="font-medium">{data.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium">{data.type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Zone</p>
            <p className="font-medium">{data.zone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Grille proposée</p>
            <p className="font-medium">{data.proposedGrid}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
          <span className="text-sm">
            Potentiel estimé: <span className="font-medium text-green-600">
              {formatCurrency(data.estimatedPotential)}/mois
            </span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isProcessing && 'opacity-50 pointer-events-none'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              validation.type === 'order' && 'bg-blue-100 text-blue-600',
              validation.type === 'discount' && 'bg-amber-100 text-amber-600',
              validation.type === 'new_client' && 'bg-green-100 text-green-600'
            )}>
              {getIcon(validation.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{typeInfo.icon} {typeInfo.label}</CardTitle>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeAgo(validation.createdAt)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Demandé par {validation.requestedBy.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {validation.reason && (
          <div className="p-2 bg-muted rounded text-sm">
            <span className="text-muted-foreground">Raison: </span>
            {validation.reason}
          </div>
        )}

        {validation.type === 'order' && renderOrderValidation()}
        {validation.type === 'discount' && renderDiscountValidation()}
        {validation.type === 'new_client' && renderNewClientValidation()}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {!showRejectInput ? (
            <>
              <Button
                className="flex-1"
                onClick={() => {
                  if (validation.type === 'discount' && modifiedDiscount) {
                    onModifyAndApprove({ discountPercent: modifiedDiscount });
                  } else {
                    onApprove();
                  }
                }}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {validation.type === 'discount' && modifiedDiscount
                  ? `Approuver à -${modifiedDiscount}%`
                  : 'Approuver'}
              </Button>
              {validation.type === 'discount' && (
                <Button
                  variant="outline"
                  onClick={onToggleExpand}
                  disabled={isProcessing}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              )}
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectInput(true)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </Button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <Input
                placeholder="Raison du refus..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="destructive"
                onClick={() => {
                  onReject(rejectReason || 'Refusé par le manager');
                  setShowRejectInput(false);
                  setRejectReason('');
                }}
                disabled={isProcessing}
              >
                Confirmer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason('');
                }}
              >
                Annuler
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
