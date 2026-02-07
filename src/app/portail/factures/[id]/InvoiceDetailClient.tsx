'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Download,
  CreditCard,
  Building,
  Calendar,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getInvoiceDetails,
  downloadInvoicePDF,
  initiatePayment,
  ClientInvoice,
  INVOICE_STATUS_LABELS,
} from '@/services/client-portal-service';

export default function InvoiceDetailClient() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<ClientInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await getInvoiceDetails('client-1', invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error('Erreur chargement facture:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _url = await downloadInvoicePDF(invoice.id);
      // In real app, would trigger download
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handlePayment = async (method: 'card' | 'transfer') => {
    if (!invoice) return;
    setIsProcessingPayment(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _result = await initiatePayment(invoice.id, method);
      // In real app, would redirect to payment page
      // Simulate payment success
      setTimeout(() => {
        setInvoice(prev => prev ? { ...prev, status: 'paid', paidAt: new Date() } : null);
        setIsProcessingPayment(false);
      }, 1500);
    } catch (error) {
      console.error('Erreur paiement:', error);
      setIsProcessingPayment(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Facture introuvable</p>
          <Link href="/portail/factures">
            <Button>Retour aux factures</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = INVOICE_STATUS_LABELS[invoice.status];
  const isOverdue = invoice.status === 'overdue';
  const isPending = invoice.status === 'pending' || invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-2">
          <Link href="/portail/factures">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-bold">{invoice.number}</h1>
            <Badge className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
              {isPaid ? <Check className="h-3 w-3 mr-1" /> : null}
              {statusInfo.label}
            </Badge>
          </div>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Alert for overdue */}
        {isOverdue && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">Facture en retard</p>
                  <p className="text-sm text-red-600">
                    Échue depuis {invoice.daysOverdue} jours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Summary */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Numéro de facture</p>
                <p className="font-medium">{invoice.number}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Commande associée</p>
                <p className="font-medium">{invoice.orderNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date de facturation</p>
                <p className="font-medium">{formatDate(invoice.date)}</p>
              </div>
            </div>

            {isPending && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date d'échéance</p>
                  <p className={cn('font-medium', isOverdue && 'text-red-600')}>
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>
            )}

            {isPaid && invoice.paidAt && (
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Payée le</p>
                  <p className="font-medium text-green-600">{formatDate(invoice.paidAt)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amounts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Montants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total HT</span>
              <span>{invoice.totalHT.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TVA (20%)</span>
              <span>{invoice.tva.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total TTC</span>
              <span className={isOverdue ? 'text-red-600' : ''}>
                {invoice.totalTTC.toFixed(2)}€
              </span>
            </div>

            {invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalTTC && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Déjà payé</span>
                  <span>-{invoice.paidAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Reste à payer</span>
                  <span className="text-red-600">{invoice.remainingAmount.toFixed(2)}€</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Actions */}
        {isPending && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payer cette facture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => handlePayment('card')}
                disabled={isProcessingPayment}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {isProcessingPayment ? 'Traitement...' : 'Payer par carte bancaire'}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => handlePayment('transfer')}
                disabled={isProcessingPayment}
              >
                <Building className="h-5 w-5 mr-2" />
                Demander un RIB pour virement
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Paiement sécurisé par Stripe
              </p>
            </CardContent>
          </Card>
        )}

        {/* Success message for paid invoice */}
        {isPaid && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Check className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-700">Facture payée</p>
              <p className="text-sm text-green-600">
                {invoice.paymentMethod && `Par ${invoice.paymentMethod}`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
