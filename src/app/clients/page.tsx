"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Phone,
  Mail,
  Eye,
  Edit,
  TrendingUp,
  Users,
  UserPlus,
  Crown,
  MoreVertical,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Mock data
const mockClients = [
  {
    id: "1",
    name: "Le Kebab du Coin",
    businessType: "kebab",
    contact: {
      name: "Ahmed Benali",
      phone: "06 12 34 56 78",
      email: "contact@kebab-coin.fr",
    },
    address: {
      city: "Paris",
      postalCode: "75011",
    },
    lastOrder: "2024-01-08",
    totalSpent: 45280,
    status: "active",
    avatar: "AB",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "2",
    name: "Pizza Express",
    businessType: "pizzeria",
    contact: {
      name: "Marco Rossi",
      phone: "06 98 76 54 32",
      email: "marco@pizzaexpress.fr",
    },
    address: {
      city: "Lyon",
      postalCode: "69001",
    },
    lastOrder: "2024-01-05",
    totalSpent: 38450,
    status: "active",
    avatar: "MR",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "3",
    name: "Burger House",
    businessType: "restaurant",
    contact: {
      name: "Jean Dupont",
      phone: "04 91 00 00 00",
      email: "info@burgerhouse.fr",
    },
    address: {
      city: "Marseille",
      postalCode: "13001",
    },
    lastOrder: "2024-01-10",
    totalSpent: 52190,
    status: "active",
    avatar: "JD",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "4",
    name: "Snack Gourmet",
    businessType: "snack",
    contact: {
      name: "Marie Martin",
      phone: "05 61 00 00 00",
      email: "marie@snackgourmet.fr",
    },
    address: {
      city: "Toulouse",
      postalCode: "31000",
    },
    lastOrder: "2023-12-15",
    totalSpent: 18750,
    status: "inactive",
    avatar: "MM",
    color: "from-amber-500 to-yellow-500",
  },
  {
    id: "5",
    name: "La Trattoria",
    businessType: "restaurant",
    contact: {
      name: "Giuseppe Verdi",
      phone: "01 45 67 89 01",
      email: "giuseppe@trattoria.fr",
    },
    address: {
      city: "Paris",
      postalCode: "75001",
    },
    lastOrder: "2024-01-11",
    totalSpent: 67890,
    status: "active",
    avatar: "GV",
    color: "from-indigo-500 to-blue-500",
  },
  {
    id: "6",
    name: "Sushi Master",
    businessType: "restaurant",
    contact: {
      name: "Takeshi Yamada",
      phone: "01 23 45 67 89",
      email: "contact@sushimaster.fr",
    },
    address: {
      city: "Nice",
      postalCode: "06000",
    },
    lastOrder: "2024-01-09",
    totalSpent: 48320,
    status: "active",
    avatar: "TY",
    color: "from-cyan-500 to-teal-500",
  },
  {
    id: "7",
    name: "Tacos Loco",
    businessType: "fastfood",
    contact: {
      name: "Carlos Rodriguez",
      phone: "04 56 78 90 12",
      email: "carlos@tacosloco.fr",
    },
    address: {
      city: "Bordeaux",
      postalCode: "33000",
    },
    lastOrder: "2024-01-12",
    totalSpent: 31240,
    status: "active",
    avatar: "CR",
    color: "from-rose-500 to-pink-500",
  },
  {
    id: "8",
    name: "Le Petit Bistrot",
    businessType: "restaurant",
    contact: {
      name: "Sophie Dubois",
      phone: "02 34 56 78 90",
      email: "sophie@petitbistrot.fr",
    },
    address: {
      city: "Nantes",
      postalCode: "44000",
    },
    lastOrder: "2024-01-07",
    totalSpent: 29850,
    status: "active",
    avatar: "SD",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "9",
    name: "Poke Bowl Paradise",
    businessType: "snack",
    contact: {
      name: "Emma Wilson",
      phone: "03 45 67 89 01",
      email: "emma@pokebowl.fr",
    },
    address: {
      city: "Lille",
      postalCode: "59000",
    },
    lastOrder: "2024-01-13",
    totalSpent: 22340,
    status: "active",
    avatar: "EW",
    color: "from-lime-500 to-green-500",
  },
  {
    id: "10",
    name: "Bagel Corner",
    businessType: "snack",
    contact: {
      name: "David Cohen",
      phone: "01 56 78 90 12",
      email: "david@bagelcorner.fr",
    },
    address: {
      city: "Paris",
      postalCode: "75009",
    },
    lastOrder: "2024-01-14",
    totalSpent: 19560,
    status: "active",
    avatar: "DC",
    color: "from-fuchsia-500 to-purple-500",
  },
];

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "inactive";

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

// Helper to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Business type badges config
const businessTypeBadges: Record<string, { label: string; className: string }> = {
  restaurant: {
    label: "Restaurant",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  pizzeria: {
    label: "Pizzeria",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  kebab: {
    label: "Kebab",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  snack: {
    label: "Snack",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  fastfood: {
    label: "Fast Food",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
};

export default function ClientsPage() {
  const [clients] = useState(mockClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Get current month for stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;
    const matchesBusinessType =
      businessTypeFilter === "all" || client.businessType === businessTypeFilter;
    return matchesSearch && matchesStatus && matchesBusinessType;
  });

  // Calculate stats
  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    newThisMonth: clients.filter((c) => {
      const lastOrderDate = new Date(c.lastOrder);
      return (
        lastOrderDate.getMonth() === currentMonth &&
        lastOrderDate.getFullYear() === currentYear
      );
    }).length,
    topSpenders: clients
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 3).length,
  };

  // Get top 3 spenders
  const topSpenders = clients
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 3);

  // Handle actions
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleView = (clientId: string) => {
    console.log("View client:", clientId);
    // Navigate to client details page
  };

  const handleEdit = (clientId: string) => {
    console.log("Edit client:", clientId);
    // Open edit dialog or navigate to edit page
  };

  const handleAddClient = () => {
    console.log("Add new client");
    // Open add client dialog
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Clients
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gérez et suivez votre portefeuille clients
            </p>
          </div>
          <Button
            onClick={handleAddClient}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/30"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un client
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total clients
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.total}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Actifs
                  </p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                    {stats.active}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Nouveaux ce mois
                  </p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                    {stats.newThisMonth}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Top dépensiers
                  </p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                    {stats.topSpenders}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl">
                  <Crown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Rechercher par nom, contact ou ville..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-gray-200 dark:border-gray-700"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {statusFilter === "all"
                        ? "Statut"
                        : statusFilter === "active"
                        ? "Actifs"
                        : "Inactifs"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                      Tous les statuts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                      Actifs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                      Inactifs
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Business Type Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-gray-200 dark:border-gray-700"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {businessTypeFilter === "all"
                        ? "Type"
                        : businessTypeBadges[businessTypeFilter]?.label || businessTypeFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("all")}>
                      Tous les types
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("restaurant")}>
                      Restaurant
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("pizzeria")}>
                      Pizzeria
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("kebab")}>
                      Kebab
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("snack")}>
                      Snack
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("fastfood")}>
                      Fast Food
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Mode Toggle */}
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2.5 transition-colors",
                      viewMode === "grid"
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    aria-label="Vue grille"
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-2.5 transition-colors border-l border-gray-200 dark:border-gray-700",
                      viewMode === "list"
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                    aria-label="Vue liste"
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(statusFilter !== "all" || businessTypeFilter !== "all") && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Filtres actifs:
                </span>
                {statusFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer rounded-lg"
                    onClick={() => setStatusFilter("all")}
                  >
                    {statusFilter === "active" ? "Actifs" : "Inactifs"} ×
                  </Badge>
                )}
                {businessTypeFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer rounded-lg"
                    onClick={() => setBusinessTypeFilter("all")}
                  >
                    {businessTypeBadges[businessTypeFilter]?.label || businessTypeFilter} ×
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Grid/List */}
        {filteredClients.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Aucun client trouvé
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Essayez de modifier vos filtres ou ajoutez un nouveau client
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4"
            )}
          >
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className={cn(
                  "rounded-2xl border-0 shadow-sm hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800 group",
                  viewMode === "list" && "hover:scale-[1.01]"
                )}
              >
                <CardContent className="p-6">
                  <div
                    className={cn(
                      "flex gap-4",
                      viewMode === "list" ? "items-center" : "flex-col"
                    )}
                  >
                    {/* Avatar and Main Info */}
                    <div
                      className={cn(
                        "flex gap-4",
                        viewMode === "list" ? "flex-1 items-center" : "items-start"
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "flex items-center justify-center rounded-xl font-bold text-white bg-gradient-to-br shadow-lg",
                          client.color,
                          viewMode === "grid" ? "h-16 w-16 text-xl" : "h-14 w-14 text-lg"
                        )}
                      >
                        {client.avatar}
                      </div>

                      {/* Client Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                              {client.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {client.contact.name}
                            </p>
                          </div>
                          {topSpenders.find((s) => s.id === client.id) && (
                            <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge
                            className={cn(
                              "rounded-lg font-medium",
                              businessTypeBadges[client.businessType]?.className ||
                                "bg-gray-100 text-gray-700"
                            )}
                          >
                            {businessTypeBadges[client.businessType]?.label ||
                              client.businessType}
                          </Badge>
                          <Badge
                            className={cn(
                              "rounded-lg font-medium",
                              client.status === "active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                            )}
                          >
                            {client.status === "active" ? "Actif" : "Inactif"}
                          </Badge>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            <span>{client.contact.phone}</span>
                          </div>
                          {client.contact.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{client.contact.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div
                          className={cn(
                            "grid gap-3 pt-3 border-t border-gray-100 dark:border-gray-700",
                            viewMode === "grid" ? "grid-cols-2" : "grid-cols-4"
                          )}
                        >
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Dernière commande
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                              {formatDate(client.lastOrder)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Total dépensé
                            </p>
                            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                              {formatCurrency(client.totalSpent)}
                            </p>
                          </div>
                          {viewMode === "list" && (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Ville
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                  {client.address.city}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Code postal
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                  {client.address.postalCode}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      className={cn(
                        "flex gap-2",
                        viewMode === "list" ? "flex-shrink-0" : "w-full"
                      )}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCall(client.contact.phone)}
                        className={cn(
                          "rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors",
                          viewMode === "grid" && "flex-1"
                        )}
                      >
                        <Phone className="h-4 w-4" />
                        {viewMode === "grid" && <span className="ml-2">Appeler</span>}
                      </Button>
                      {client.contact.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEmail(client.contact.email!)}
                          className={cn(
                            "rounded-lg hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-colors",
                            viewMode === "grid" && "flex-1"
                          )}
                        >
                          <Mail className="h-4 w-4" />
                          {viewMode === "grid" && <span className="ml-2">Email</span>}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(client.id)}
                        className={cn(
                          "rounded-lg hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-700 transition-colors",
                          viewMode === "grid" && "flex-1"
                        )}
                      >
                        <Eye className="h-4 w-4" />
                        {viewMode === "grid" && <span className="ml-2">Voir</span>}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            onClick={() => handleEdit(client.id)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleView(client.id)}
                            className="cursor-pointer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Détails
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}
