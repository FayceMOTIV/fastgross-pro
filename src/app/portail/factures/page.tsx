'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Download,
  CreditCard,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getInvoices,
  downloadInvoicePDF,
  ClientInvoice,
  INVOICE_STATUS_LABELS,
} from '@/services/client-portal-service';

type Filter = 'all' | 'pending' | 'paid';

function FacturesContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as Filter) || 'all';

  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await getInvoices('client-1', filter);
      setInvoices(data);
    } catch (error) {
      console.error('Erreur chargement factures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (invoiceId: string) => {
    try {
      const url = await downloadInvoicePDF(invoiceId);
      // In real app, would trigger download
      console.log('Download URL:', url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: 'À payer' },
    { value: 'paid', label: 'Payées' },
  ];

  const unpaidTotal = invoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mes Factures
          </h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-4">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Alert for unpaid invoices */}
        {overdueInvoices.length > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">
                    {overdueInvoices.length} facture{overdueInvoices.length > 1 ? 's' : ''} impayée{overdueInvoices.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-red-600">
                    Montant total: {unpaidTotal.toFixed(2)}€
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune facture</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onDownload={() => handleDownload(invoice.id)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>
    </div>
  );
}

function InvoiceCard({
  invoice,
  onDownload,
  formatDate,
}: {
  invoice: ClientInvoice;
  onDownload: () => void;
  formatDate: (date: Date) => string;
}) {
  const statusInfo = INVOICE_STATUS_LABELS[invoice.status];
  const isOverdue = invoice.status === 'overdue';
  const isPending = invoice.status === 'pending' || invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  return (
    <Card className={cn(isOverdue && 'border-red-200')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {invoice.number}
            </h3>
            <p className="text-sm text-muted-foreground">
              Commande: {invoice.orderNumber}
            </p>
          </div>
          <Badge className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
            {isPaid ? <Check className="h-3 w-3 mr-1" /> : null}
            {statusInfo.label}
          </Badge>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date:</span>
            <span>{formatDate(invoice.date)}</span>
          </div>
          {isPending && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Échéance:</span>
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {formatDate(invoice.dueDate)}
                {isOverdue && invoice.daysOverdue && (
                  <span className="ml-1">(+{invoice.daysOverdue} jours)</span>
                )}
              </span>
            </div>
          )}
          {isPaid && invoice.paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payée le:</span>
              <span>{formatDate(invoice.paidAt)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-2">
            <span>Montant:</span>
            <span className={isOverdue ? 'text-red-600' : ''}>
              {invoice.totalTTC.toFixed(2)}€
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {isPending && (
            <Link href={`/portail/factures/${invoice.id}`} className="flex-1">
              <Button variant="default" size="sm" className="w-full">
                <CreditCard className="h-4 w-4 mr-1" />
                Payer
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className={isPending ? '' : 'flex-1'}
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FacturesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="p-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mes Factures
            </h1>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    }>
      <FacturesContent />
    </Suspense>
  );
}
