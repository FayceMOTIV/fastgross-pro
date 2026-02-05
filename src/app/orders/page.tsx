"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle2
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhonePreviewButton } from "@/components/ui/phone-preview";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// Mock data - at least 10 orders
const mockOrders = [
  {
    id: "ORD-2024-001",
    client: "Le Kebab du Coin",
    items: 5,
    total: 197.40,
    status: "pending" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-002",
    client: "Pizza Express",
    items: 8,
    total: 338.40,
    status: "preparing" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-003",
    client: "Burger House",
    items: 12,
    total: 456.80,
    status: "delivering" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-004",
    client: "Sushi Master",
    items: 6,
    total: 289.50,
    status: "delivered" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-005",
    client: "Bistro du Centre",
    items: 15,
    total: 567.90,
    status: "pending" as const,
    date: "2024-02-02",
  },
  {
    id: "ORD-2024-006",
    client: "La Brasserie",
    items: 9,
    total: 412.30,
    status: "delivered" as const,
    date: "2024-02-02",
  },
  {
    id: "ORD-2024-007",
    client: "Pâtes & Co",
    items: 7,
    total: 324.60,
    status: "cancelled" as const,
    date: "2024-02-01",
  },
  {
    id: "ORD-2024-008",
    client: "Le Petit Resto",
    items: 11,
    total: 498.70,
    status: "delivering" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-009",
    client: "Café Central",
    items: 4,
    total: 178.90,
    status: "delivered" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-010",
    client: "Traiteur Deluxe",
    items: 18,
    total: 689.20,
    status: "preparing" as const,
    date: "2024-02-03",
  },
  {
    id: "ORD-2024-011",
    client: "Fast Food 24",
    items: 10,
    total: 445.50,
    status: "pending" as const,
    date: "2024-02-01",
  },
  {
    id: "ORD-2024-012",
    client: "Le Gourmet",
    items: 13,
    total: 578.80,
    status: "delivered" as const,
    date: "2024-02-03",
  },
];

type OrderStatus = "pending" | "preparing" | "delivering" | "delivered" | "cancelled";

interface Order {
  id: string;
  client: string;
  items: number;
  total: number;
  status: OrderStatus;
  date: string;
}

const statusConfig = {
  pending: {
    label: "En attente",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-400",
    icon: Clock,
  },
  preparing: {
    label: "Préparation",
    className: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400",
    icon: Package,
  },
  delivering: {
    label: "En livraison",
    className: "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-400",
    icon: Truck,
  },
  delivered: {
    label: "Livré",
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Annulé",
    className: "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-400",
    icon: Trash2,
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  const itemsPerPage = 8;

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    delivering: orders.filter((o) => o.status === "delivering").length,
    deliveredToday: orders.filter(
      (o) => o.status === "delivered" && o.date === new Date().toISOString().split("T")[0]
    ).length,
  };

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleView = (orderId: string) => {
    toast.info(`Visualisation de la commande ${orderId}`);
    // Navigate to order details
  };

  const handleEdit = (orderId: string) => {
    toast.info(`Modification de la commande ${orderId}`);
    // Navigate to order edit
  };

  const handleDelete = (orderId: string) => {
    setOrders(orders.filter((o) => o.id !== orderId));
    setShowDeleteModal(null);
    toast.success("Commande supprimée avec succès");
  };

  const handleNewOrder = () => {
    setShowNewOrderModal(true);
    toast.info("Ouverture du formulaire de nouvelle commande");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Gestion des commandes
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Suivez et gérez toutes vos commandes en temps réel
            </p>
          </div>
          <Button
            onClick={handleNewOrder}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/30 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle commande
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total commandes
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {stats.total}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950 dark:to-indigo-950 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  En attente
                </p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-500 mt-2">
                  {stats.pending}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  En livraison
                </p>
                <p className="text-3xl font-bold text-violet-600 dark:text-violet-500 mt-2">
                  {stats.delivering}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-950 dark:to-purple-950 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Livrées aujourd'hui
                </p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-500 mt-2">
                  {stats.deliveredToday}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-950 dark:to-green-950 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Rechercher par ID ou client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-200 dark:border-slate-700">
                  <Filter className="h-4 w-4 mr-2" />
                  {statusFilter === "all" ? "Tous les statuts" : statusConfig[statusFilter].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Tous les statuts
                </DropdownMenuItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setStatusFilter(status as OrderStatus)}
                  >
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    ID Commande
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Articles
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-slate-500 dark:text-slate-400">
                        Aucune commande trouvée
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status].icon;
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {order.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {order.client}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {order.items} articles
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(order.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={statusConfig[order.status].className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status].label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {new Date(order.date).toLocaleDateString("fr-FR")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(order.id)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-violet-600 hover:bg-violet-50 dark:text-slate-400 dark:hover:text-violet-400 dark:hover:bg-violet-950"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(order.id)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteModal(order.id)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Affichage de {startIndex + 1} à{" "}
                {Math.min(startIndex + itemsPerPage, filteredOrders.length)} sur{" "}
                {filteredOrders.length} commandes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-slate-200 dark:border-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                          : "text-slate-600 dark:text-slate-400"
                      }
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-slate-200 dark:border-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Confirmer la suppression
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Êtes-vous sûr de vouloir supprimer la commande {showDeleteModal} ? Cette action est
              irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(null)}
                className="border-slate-200 dark:border-slate-700"
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteModal)}
                className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white"
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Nouvelle commande
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Le formulaire de création de commande sera disponible prochainement.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewOrderModal(false)}
                className="border-slate-200 dark:border-slate-700"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
      <PhonePreviewButton />
    </AppLayout>
  );
}
