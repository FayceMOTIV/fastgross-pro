'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileText,
  MapPin,
  Phone,
  Calendar,
  ArrowRight,
  PlayCircle,
  XCircle,
  User,
  Euro,
  Building2,
  ClipboardCheck,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { DISTRAM_CATALOG } from '@/data/distram-catalog';

// Order status workflow
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivering' | 'delivered' | 'cancelled';

interface OrderItem {
  productId: string;
  productRef: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientType: string;
  clientAddress: string;
  clientPhone: string;
  items: OrderItem[];
  subtotal: number;
  remise: number;
  remisePourcent: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid' | 'partial';
  depot: 'Lyon' | 'Montpellier' | 'Bordeaux';
  commercial: string;
  livreur?: string;
  createdAt: Date;
  confirmedAt?: Date;
  preparedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  deliveryDate: Date;
  deliverySlot: 'morning' | 'afternoon';
  notes?: string;
}

// Generate mock orders with DISTRAM products
function generateMockOrders(): Order[] {
  const clients = [
    { id: 'CLI-001', name: 'Kebab Istanbul', type: 'Kebab', address: '15 Rue de la République, 69001 Lyon', phone: '04 72 12 34 56' },
    { id: 'CLI-002', name: 'Burger Factory', type: 'Burger', address: '28 Avenue Jean Jaurès, 69007 Lyon', phone: '04 78 23 45 67' },
    { id: 'CLI-003', name: 'Tacos House', type: 'Tacos', address: '42 Cours Charlemagne, 69002 Lyon', phone: '04 72 34 56 78' },
    { id: 'CLI-004', name: 'Pizza Napoli', type: 'Pizza', address: '8 Place Bellecour, 69002 Lyon', phone: '04 78 45 67 89' },
    { id: 'CLI-005', name: 'Snack du Marché', type: 'Snack', address: '5 Rue Victor Hugo, 69002 Lyon', phone: '04 72 56 78 90' },
    { id: 'CLI-006', name: "O'Délices", type: 'Kebab', address: '12 Rue de la Part-Dieu, 69003 Lyon', phone: '04 78 67 89 01' },
    { id: 'CLI-007', name: 'Le Grec Gourmand', type: 'Kebab', address: '33 Cours Lafayette, 69006 Lyon', phone: '04 72 78 90 12' },
    { id: 'CLI-008', name: 'Fast & Fresh', type: 'Burger', address: '67 Rue Garibaldi, 69006 Lyon', phone: '04 78 89 01 23' },
  ];

  const commerciaux = ['Mohamed K.', 'Sarah L.', 'Karim B.', 'Fatima Z.'];
  const livreurs = ['Ahmed B.', 'Omar S.', 'Youssef M.', 'Hassan T.'];
  const depots: Array<'Lyon' | 'Montpellier' | 'Bordeaux'> = ['Lyon', 'Lyon', 'Lyon', 'Montpellier', 'Bordeaux'];
  const statuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivering', 'delivered', 'delivered', 'delivered'];

  const orders: Order[] = [];

  for (let i = 0; i < 25; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const numItems = Math.floor(Math.random() * 8) + 3;
    const items: OrderItem[] = [];

    // Random products from catalog
    const shuffled = [...DISTRAM_CATALOG].sort(() => 0.5 - Math.random());
    for (let j = 0; j < numItems; j++) {
      const product = shuffled[j];
      const qty = Math.floor(Math.random() * 5) + 1;
      items.push({
        productId: product.id,
        productRef: product.ref,
        productName: product.name,
        quantity: qty,
        unitPrice: product.prixClient,
        totalPrice: product.prixClient * qty,
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const remisePourcent = Math.random() > 0.5 ? 10 : 5;
    const remise = subtotal * (remisePourcent / 100);
    const totalHT = subtotal - remise;
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const deliveryDate = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    orders.push({
      id: `ord-${String(i + 1).padStart(3, '0')}`,
      number: `CMD-2024-${String(1000 + i).padStart(4, '0')}`,
      clientId: client.id,
      clientName: client.name,
      clientType: client.type,
      clientAddress: client.address,
      clientPhone: client.phone,
      items,
      subtotal,
      remise,
      remisePourcent,
      totalHT,
      tva,
      totalTTC,
      status,
      paymentStatus: status === 'delivered' ? 'paid' : (Math.random() > 0.7 ? 'paid' : 'pending'),
      depot: depots[Math.floor(Math.random() * depots.length)],
      commercial: commerciaux[Math.floor(Math.random() * commerciaux.length)],
      livreur: ['shipped', 'delivering', 'delivered'].includes(status) ? livreurs[Math.floor(Math.random() * livreurs.length)] : undefined,
      createdAt,
      confirmedAt: ['confirmed', 'preparing', 'shipped', 'delivering', 'delivered'].includes(status) ? new Date(createdAt.getTime() + 30 * 60 * 1000) : undefined,
      preparedAt: ['preparing', 'shipped', 'delivering', 'delivered'].includes(status) ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : undefined,
      shippedAt: ['shipped', 'delivering', 'delivered'].includes(status) ? new Date(createdAt.getTime() + 4 * 60 * 60 * 1000) : undefined,
      deliveredAt: status === 'delivered' ? new Date(createdAt.getTime() + 6 * 60 * 60 * 1000) : undefined,
      deliveryDate,
      deliverySlot: Math.random() > 0.5 ? 'morning' : 'afternoon',
      notes: Math.random() > 0.7 ? 'Client fidèle - prioritaire' : undefined,
    });
  }

  return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: React.ElementType; nextStatus?: OrderStatus; nextAction?: string }> = {
  pending: {
    label: 'En attente',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: Clock,
    nextStatus: 'confirmed',
    nextAction: 'Confirmer',
  },
  confirmed: {
    label: 'Confirmée',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: CheckCircle2,
    nextStatus: 'preparing',
    nextAction: 'Préparer',
  },
  preparing: {
    label: 'En préparation',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: Package,
    nextStatus: 'shipped',
    nextAction: 'Expédier',
  },
  shipped: {
    label: 'Expédiée',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: Truck,
    nextStatus: 'delivering',
    nextAction: 'En livraison',
  },
  delivering: {
    label: 'En livraison',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    icon: Truck,
    nextStatus: 'delivered',
    nextAction: 'Livrer',
  },
  delivered: {
    label: 'Livrée',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Annulée',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: XCircle,
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(() => generateMockOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [depotFilter, setDepotFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesDepot = depotFilter === 'all' || order.depot === depotFilter;
      return matchesSearch && matchesStatus && matchesDepot;
    });
  }, [orders, searchQuery, statusFilter, depotFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      inProgress: orders.filter(o => ['confirmed', 'preparing', 'shipped', 'delivering'].includes(o.status)).length,
      deliveredToday: orders.filter(o => o.status === 'delivered' && o.deliveredAt?.toDateString() === today).length,
      totalCA: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalTTC, 0),
    };
  }, [orders]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const now = new Date();
        const updates: Partial<Order> = { status: newStatus };

        switch (newStatus) {
          case 'confirmed': updates.confirmedAt = now; break;
          case 'preparing': updates.preparedAt = now; break;
          case 'shipped': updates.shippedAt = now; break;
          case 'delivered': updates.deliveredAt = now; updates.paymentStatus = 'paid'; break;
          case 'cancelled': updates.cancelledAt = now; break;
        }

        return { ...o, ...updates };
      }
      return o;
    }));
    toast.success(`Commande passée en "${statusConfig[newStatus].label}"`);
    setSelectedOrder(null);
  };

  const _handleDelete = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setShowDeleteModal(null);
    toast.success('Commande supprimée');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des Commandes</h1>
            <p className="text-muted-foreground mt-1">
              Workflow complet de la commande à la livraison
            </p>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700 shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Commande
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                  <p className="text-sm text-blue-700">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
                  <p className="text-sm text-amber-700">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900">{stats.inProgress}</p>
                  <p className="text-sm text-purple-700">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900">{stats.deliveredToday}</p>
                  <p className="text-sm text-green-700">Livrées aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Euro className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.totalCA)}</p>
                  <p className="text-sm text-orange-700">CA Livré</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher par numéro, client, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    {statusFilter === 'all' ? 'Tous les statuts' : statusConfig[statusFilter].label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    Tous les statuts
                  </DropdownMenuItem>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setStatusFilter(status as OrderStatus)}
                    >
                      <config.icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    {depotFilter === 'all' ? 'Tous les dépôts' : depotFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDepotFilter('all')}>Tous les dépôts</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDepotFilter('Lyon')}>Lyon</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDepotFilter('Montpellier')}>Montpellier</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDepotFilter('Bordeaux')}>Bordeaux</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Commande</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Dépôt</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Articles</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Total TTC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Livraison</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                        Aucune commande trouvée
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => {
                      const StatusIcon = statusConfig[order.status].icon;
                      return (
                        <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{order.number}</p>
                              <p className="text-xs text-muted-foreground">{formatDateShort(order.createdAt)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{order.clientName}</p>
                              <p className="text-xs text-muted-foreground">{order.clientType}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{order.depot}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm">{order.items.length} articles</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold">{formatCurrency(order.totalTTC)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <p>{formatDateShort(order.deliveryDate)}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.deliverySlot === 'morning' ? 'Matin' : 'Après-midi'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn(statusConfig[order.status].bgColor, statusConfig[order.status].color, 'border-0')}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[order.status].label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {statusConfig[order.status].nextAction && order.status !== 'cancelled' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleStatusChange(order.id, statusConfig[order.status].nextStatus!)}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {['pending', 'confirmed'].includes(order.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setShowDeleteModal(order.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredOrders.length)} sur {filteredOrders.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">Page {currentPage} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Commande {selectedOrder?.number}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <OrderDetails
                order={selectedOrder}
                onStatusChange={handleStatusChange}
                formatDate={formatDate}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Annuler la commande ?</h3>
                </div>
                <p className="text-muted-foreground mb-6">
                  Cette action est irréversible. La commande sera marquée comme annulée.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowDeleteModal(null)}>
                    Retour
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      handleStatusChange(showDeleteModal, 'cancelled');
                      setShowDeleteModal(null);
                    }}
                  >
                    Annuler la commande
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function OrderDetails({
  order,
  onStatusChange,
  formatDate,
}: {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  formatDate: (date: Date) => string;
}) {
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Status and Actions */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Badge className={cn(config.bgColor, config.color, 'border-0 text-base px-3 py-1')}>
            <StatusIcon className="h-4 w-4 mr-2" />
            {config.label}
          </Badge>
          <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'} className={order.paymentStatus === 'paid' ? 'bg-green-600' : ''}>
            {order.paymentStatus === 'paid' ? 'Payée' : 'À payer'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {config.nextAction && order.status !== 'cancelled' && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onStatusChange(order.id, config.nextStatus!)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {config.nextAction}
            </Button>
          )}
          {['pending', 'confirmed'].includes(order.status) && (
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onStatusChange(order.id, 'cancelled')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Timeline */}
      <div className="flex items-center justify-between px-4">
        {(['pending', 'confirmed', 'preparing', 'shipped', 'delivering', 'delivered'] as OrderStatus[]).map((status, index, arr) => {
          const statusConf = statusConfig[status];
          const Icon = statusConf.icon;
          const isActive = order.status === status;
          const isPast = arr.indexOf(order.status) > index;
          const isCancelled = order.status === 'cancelled';

          return (
            <div key={status} className="flex items-center">
              <div className={cn(
                'flex flex-col items-center',
                (isActive || isPast) && !isCancelled ? 'opacity-100' : 'opacity-40'
              )}>
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isPast && !isCancelled ? 'bg-green-100 text-green-700' :
                  isActive && !isCancelled ? cn(statusConf.bgColor, statusConf.color) :
                  'bg-muted text-muted-foreground'
                )}>
                  {isPast ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="text-xs mt-1 whitespace-nowrap">{statusConf.label}</span>
              </div>
              {index < arr.length - 1 && (
                <div className={cn(
                  'w-12 h-0.5 mx-1',
                  isPast && !isCancelled ? 'bg-green-500' : 'bg-muted'
                )} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold">{order.clientName}</p>
            <Badge variant="outline">{order.clientType}</Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {order.clientAddress}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              {order.clientPhone}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(order.deliveryDate).split(' ')[0]}</span>
              <Badge variant="outline">{order.deliverySlot === 'morning' ? 'Matin (8h-12h)' : 'Après-midi (14h-18h)'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>Dépôt: <strong>{order.depot}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Commercial: {order.commercial}</span>
            </div>
            {order.livreur && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span>Livreur: {order.livreur}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Articles ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Réf</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Produit</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Qté</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">P.U.</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.items.map((item, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{item.productRef}</td>
                  <td className="px-4 py-2 text-sm">{item.productName}</td>
                  <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                  <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Remise ({order.remisePourcent}%)</span>
              <span>-{formatCurrency(order.remise)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total HT</span>
              <span>{formatCurrency(order.totalHT)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA (20%)</span>
              <span>{formatCurrency(order.tva)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total TTC</span>
              <span className="text-orange-600">{formatCurrency(order.totalTTC)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <TimelineItem date={order.createdAt} label="Commande créée" formatDate={formatDate} />
            {order.confirmedAt && <TimelineItem date={order.confirmedAt} label="Commande confirmée" formatDate={formatDate} />}
            {order.preparedAt && <TimelineItem date={order.preparedAt} label="Préparation terminée" formatDate={formatDate} />}
            {order.shippedAt && <TimelineItem date={order.shippedAt} label="Commande expédiée" formatDate={formatDate} />}
            {order.deliveredAt && <TimelineItem date={order.deliveredAt} label="Commande livrée" formatDate={formatDate} />}
            {order.cancelledAt && <TimelineItem date={order.cancelledAt} label="Commande annulée" formatDate={formatDate} error />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineItem({
  date,
  label,
  formatDate,
  error,
}: {
  date: Date;
  label: string;
  formatDate: (date: Date) => string;
  error?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-2 h-2 rounded-full',
        error ? 'bg-red-500' : 'bg-green-500'
      )} />
      <span className="text-sm text-muted-foreground">{formatDate(date)}</span>
      <span className={cn('text-sm', error && 'text-red-600')}>{label}</span>
    </div>
  );
}
