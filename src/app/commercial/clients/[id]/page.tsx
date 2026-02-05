'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  TrendingUp,
  Euro,
  Lightbulb,
  Star,
  ShoppingCart,
  Navigation,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getClientDetails,
  getUsualProducts,
  CommercialClient,
  UsualProduct,
} from '@/services/commercial-service';

const PRICE_GRID_STYLES: Record<string, { label: string; className: string; icon?: boolean }> = {
  standard: { label: 'Standard', className: 'bg-gray-100 text-gray-700' },
  premium: { label: 'Premium', className: 'bg-blue-100 text-blue-700' },
  gold: { label: 'Gold', className: 'bg-amber-100 text-amber-700', icon: true },
  vip: { label: 'VIP', className: 'bg-purple-100 text-purple-700', icon: true },
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<CommercialClient | null>(null);
  const [usualProducts, setUsualProducts] = useState<UsualProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientData, productsData] = await Promise.all([
          getClientDetails(clientId),
          getUsualProducts(clientId),
        ]);
        setClient(clientData);
        setUsualProducts(productsData);
      } catch (error) {
        console.error('Erreur chargement client:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-24 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-muted-foreground">Client non trouvé</p>
        <Button onClick={() => router.back()} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  const gridStyle = PRICE_GRID_STYLES[client.priceGrid] || PRICE_GRID_STYLES.standard;

  // Mock des dernières commandes
  const recentOrders = [
    { date: '25/01', amount: 458, status: 'paid' },
    { date: '18/01', amount: 612, status: 'paid' },
    { date: '11/01', amount: 890, status: 'overdue' },
    { date: '04/01', amount: 389, status: 'paid' },
  ];

  // Mock suggestion IA
  const aiSuggestion = usualProducts.find((p) => p.hasAlert)
    ? {
        title: 'Relance produit',
        description: `Ce client a arrêté le ${
          usualProducts.find((p) => p.hasAlert)?.name
        } depuis 3 semaines. Proposer promo -8% pour relancer (marge OK: 12%)`,
        action: 'Appliquer l\'offre',
      }
    : null;

  return (
    <div className="pb-32">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Retour</span>
          </button>

          {/* Nom et infos */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {getTypeEmoji(client.type)} {client.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {client.type} • Client depuis 2022
              </p>
            </div>
            <Badge className={cn('text-xs px-2 py-1', gridStyle.className)}>
              {gridStyle.icon && <Star className="h-3 w-3 mr-1" />}
              {gridStyle.label}
            </Badge>
          </div>

          {/* CA annuel */}
          <div className="flex items-center gap-2 mt-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {client.yearlyRevenue.toLocaleString('fr-FR')}€/an
            </span>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-4">
          <a href={`tel:${client.contact.phone}`}>
            <Button variant="outline" className="w-full h-14 flex-col gap-1">
              <Phone className="h-5 w-5" />
              <span className="text-[10px]">Appeler</span>
            </Button>
          </a>
          {client.contact.email && (
            <a href={`mailto:${client.contact.email}`}>
              <Button variant="outline" className="w-full h-14 flex-col gap-1">
                <Mail className="h-5 w-5" />
                <span className="text-[10px]">Email</span>
              </Button>
            </a>
          )}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${client.address.street}, ${client.address.postalCode} ${client.address.city}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full h-14 flex-col gap-1">
              <Navigation className="h-5 w-5" />
              <span className="text-[10px]">Y aller</span>
            </Button>
          </a>
          <Button variant="outline" className="w-full h-14 flex-col gap-1">
            <FileText className="h-5 w-5" />
            <span className="text-[10px]">Note</span>
          </Button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="p-4 space-y-4">
        {/* Alertes */}
        {client.alerts.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Alertes
            </h2>
            <div className="space-y-2">
              {client.alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={cn(
                    'border-l-4',
                    alert.severity === 'high' && 'border-l-red-500 bg-red-50/50',
                    alert.severity === 'medium' && 'border-l-orange-500 bg-orange-50/50'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={cn(
                          'h-4 w-4 mt-0.5 flex-shrink-0',
                          alert.severity === 'high' && 'text-red-600',
                          alert.severity === 'medium' && 'text-orange-600'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{alert.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {alert.description}
                        </div>
                        {alert.actionLabel && (
                          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
                            {alert.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats ce mois */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Ce mois
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {client.monthlyRevenue.toLocaleString('fr-FR')}€
                  </div>
                  <div className="text-xs text-muted-foreground">CA du mois</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">4</div>
                  <div className="text-xs text-muted-foreground">Commandes</div>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">+12%</span>
                <span className="text-muted-foreground">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dernières commandes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Dernières commandes
            </h2>
            <button className="text-xs text-primary hover:underline">
              Voir tout
            </button>
          </div>
          <Card>
            <CardContent className="p-0">
              {recentOrders.map((order, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-3',
                    index !== recentOrders.length - 1 && 'border-b'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{order.date}</span>
                    <span className="text-sm font-medium">{order.amount}€</span>
                  </div>
                  {order.status === 'paid' ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Payée
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Impayée
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Produits habituels */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Produits habituels
          </h2>
          <Card>
            <CardContent className="p-0">
              {usualProducts.slice(0, 5).map((product, index) => (
                <div
                  key={product.id}
                  className={cn(
                    'flex items-center justify-between p-3',
                    index !== 4 && 'border-b'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {getCategoryEmoji(product.category)} {product.name}
                      </span>
                      {product.hasAlert && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200 text-[10px] px-1.5">
                          Arrêté?
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {product.frequency}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.avgQuantity}x
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Suggestion IA */}
        {aiSuggestion && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              Suggestion IA
            </h2>
            <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{aiSuggestion.description}</p>
                    <Button
                      size="sm"
                      className="mt-3 h-8 text-xs bg-violet-600 hover:bg-violet-700"
                    >
                      {aiSuggestion.action}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Adresse */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Adresse
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm">{client.address.street}</div>
                  <div className="text-sm">
                    {client.address.postalCode} {client.address.city}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Contact
          </h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{client.contact.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {client.contact.phone}
                  </div>
                </div>
                <a href={`tel:${client.contact.phone}`}>
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              {client.contact.email && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {client.contact.email}
                  </div>
                  <a href={`mailto:${client.contact.email}`}>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bouton nouvelle commande fixe */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Link href={`/commercial/clients/${clientId}/order`}>
          <Button className="w-full h-12 text-base" size="lg">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Nouvelle commande
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Helper pour emoji type
function getTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    'Fast-food': '🍔',
    Pizzeria: '🍕',
    Kebab: '🥙',
    Snack: '🍟',
    Restaurant: '🍽️',
  };
  return emojis[type] || '🏪';
}

// Helper pour emoji catégorie produit
function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    Huiles: '🛢️',
    Surgelés: '🍟',
    Fromages: '🧀',
    Sauces: '🥫',
    Pains: '🍞',
    Viandes: '🥩',
    Boissons: '🥤',
  };
  return emojis[category] || '📦';
}
