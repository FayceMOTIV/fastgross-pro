"use client";

import { useState } from "react";
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
  MapPin,
  Building2,
  AlertTriangle,
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
import { cn, formatCurrency } from "@/lib/utils";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Types
type ClientStatus = "active" | "inactive" | "at_risk";
type AccountType = "Gold" | "Silver" | "Bronze" | "Standard";
type Depot = "Lyon" | "Montpellier" | "Bordeaux";

interface Client {
  id: string;
  name: string;
  businessType: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  depot: Depot;
  commercial: string;
  accountType: AccountType;
  remise: number;
  encours: number;
  encoursMax: number;
  lastOrder: string;
  ordersThisMonth: number;
  totalSpent: number;
  status: ClientStatus;
  avatar: string;
  color: string;
}

// 30 DISTRAM Clients Mock Data
const mockClients: Client[] = [
  // === LYON (15 clients) ===
  {
    id: "CLI-001",
    name: "Kebab Istanbul",
    businessType: "kebab",
    contact: { name: "Mehmet Yilmaz", phone: "04 72 12 34 56", email: "contact@kebab-istanbul.fr" },
    address: { street: "15 Rue de la République", city: "Lyon 1er", postalCode: "69001" },
    depot: "Lyon",
    commercial: "Hamza K.",
    accountType: "Gold",
    remise: 10,
    encours: 890,
    encoursMax: 5000,
    lastOrder: "2024-02-04",
    ordersThisMonth: 8,
    totalSpent: 45280,
    status: "active",
    avatar: "KI",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "CLI-002",
    name: "Chez Momo Kebab",
    businessType: "kebab",
    contact: { name: "Ahmed Berrouane", phone: "04 72 23 45 67", email: "momo@chezmomo.fr" },
    address: { street: "42 Cours Gambetta", city: "Lyon 3ème", postalCode: "69003" },
    depot: "Lyon",
    commercial: "Hamza K.",
    accountType: "Gold",
    remise: 12,
    encours: 1250,
    encoursMax: 6000,
    lastOrder: "2024-02-05",
    ordersThisMonth: 12,
    totalSpent: 67890,
    status: "active",
    avatar: "CM",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "CLI-003",
    name: "Pizza Anatolie",
    businessType: "pizzeria",
    contact: { name: "Hasan Demir", phone: "04 72 34 56 78", email: "info@pizza-anatolie.fr" },
    address: { street: "8 Place Bellecour", city: "Lyon 2ème", postalCode: "69002" },
    depot: "Lyon",
    commercial: "Fatima Z.",
    accountType: "Silver",
    remise: 8,
    encours: 450,
    encoursMax: 3000,
    lastOrder: "2024-02-03",
    ordersThisMonth: 6,
    totalSpent: 38450,
    status: "active",
    avatar: "PA",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "CLI-004",
    name: "Snack Le Médina",
    businessType: "snack",
    contact: { name: "Karim Benali", phone: "04 72 45 67 89", email: "medina.snack@gmail.com" },
    address: { street: "23 Rue Paul Bert", city: "Lyon 3ème", postalCode: "69003" },
    depot: "Lyon",
    commercial: "Hamza K.",
    accountType: "Bronze",
    remise: 5,
    encours: 320,
    encoursMax: 2000,
    lastOrder: "2024-02-01",
    ordersThisMonth: 4,
    totalSpent: 18750,
    status: "active",
    avatar: "SM",
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "CLI-005",
    name: "Le Sultan d'Orient",
    businessType: "restaurant",
    contact: { name: "Ali Mansouri", phone: "04 72 56 78 90", email: "sultan.orient@outlook.fr" },
    address: { street: "67 Avenue Jean Jaurès", city: "Lyon 7ème", postalCode: "69007" },
    depot: "Lyon",
    commercial: "Fatima Z.",
    accountType: "Gold",
    remise: 10,
    encours: 2100,
    encoursMax: 8000,
    lastOrder: "2024-02-05",
    ordersThisMonth: 15,
    totalSpent: 89450,
    status: "active",
    avatar: "SO",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "CLI-006",
    name: "Tacos King Lyon",
    businessType: "tacos",
    contact: { name: "Youssef El Amrani", phone: "04 72 67 89 01", email: "tacosking.lyon@gmail.com" },
    address: { street: "12 Rue de la Part-Dieu", city: "Lyon 3ème", postalCode: "69003" },
    depot: "Lyon",
    commercial: "Rachid M.",
    accountType: "Silver",
    remise: 7,
    encours: 680,
    encoursMax: 3500,
    lastOrder: "2024-02-04",
    ordersThisMonth: 9,
    totalSpent: 42300,
    status: "active",
    avatar: "TK",
    color: "from-yellow-500 to-amber-500",
  },
  {
    id: "CLI-007",
    name: "Döner Express",
    businessType: "kebab",
    contact: { name: "Ahmet Ozturk", phone: "04 72 78 90 12", email: "doner.express@hotmail.fr" },
    address: { street: "34 Rue Garibaldi", city: "Lyon 6ème", postalCode: "69006" },
    depot: "Lyon",
    commercial: "Hamza K.",
    accountType: "Bronze",
    remise: 5,
    encours: 0,
    encoursMax: 1500,
    lastOrder: "2024-01-28",
    ordersThisMonth: 2,
    totalSpent: 15600,
    status: "at_risk",
    avatar: "DE",
    color: "from-slate-500 to-gray-500",
  },
  {
    id: "CLI-008",
    name: "Le Petit Bosphore",
    businessType: "restaurant",
    contact: { name: "Mustafa Kaya", phone: "04 72 89 01 23", email: "bosphore.lyon@gmail.com" },
    address: { street: "56 Quai Perrache", city: "Lyon 2ème", postalCode: "69002" },
    depot: "Lyon",
    commercial: "Fatima Z.",
    accountType: "Silver",
    remise: 8,
    encours: 890,
    encoursMax: 4000,
    lastOrder: "2024-02-02",
    ordersThisMonth: 5,
    totalSpent: 31200,
    status: "active",
    avatar: "PB",
    color: "from-cyan-500 to-blue-500",
  },
  {
    id: "CLI-009",
    name: "Fast Kebab Villeurbanne",
    businessType: "kebab",
    contact: { name: "Samir Bouaziz", phone: "04 72 90 12 34", email: "fastkebab.villeurbanne@gmail.com" },
    address: { street: "89 Cours Emile Zola", city: "Villeurbanne", postalCode: "69100" },
    depot: "Lyon",
    commercial: "Rachid M.",
    accountType: "Standard",
    remise: 0,
    encours: 0,
    encoursMax: 1000,
    lastOrder: "2024-01-15",
    ordersThisMonth: 1,
    totalSpent: 8900,
    status: "inactive",
    avatar: "FK",
    color: "from-gray-400 to-gray-500",
  },
  {
    id: "CLI-010",
    name: "Grill House Bron",
    businessType: "grill",
    contact: { name: "Hassan Cherif", phone: "04 72 01 23 45", email: "grillhouse.bron@gmail.com" },
    address: { street: "15 Avenue Franklin Roosevelt", city: "Bron", postalCode: "69500" },
    depot: "Lyon",
    commercial: "Hamza K.",
    accountType: "Silver",
    remise: 6,
    encours: 450,
    encoursMax: 2500,
    lastOrder: "2024-02-03",
    ordersThisMonth: 7,
    totalSpent: 28700,
    status: "active",
    avatar: "GH",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "CLI-011",
    name: "Istanbul Grill",
    businessType: "kebab",
    contact: { name: "Emre Yildirim", phone: "04 78 12 34 56", email: "istanbul.grill@gmail.com" },
    address: { street: "78 Grande Rue de la Guillotière", city: "Lyon 7ème", postalCode: "69007" },
    depot: "Lyon",
    commercial: "Fatima Z.",
    accountType: "Gold",
    remise: 10,
    encours: 1800,
    encoursMax: 6000,
    lastOrder: "2024-02-05",
    ordersThisMonth: 11,
    totalSpent: 56780,
    status: "active",
    avatar: "IG",
    color: "from-indigo-500 to-violet-500",
  },
  {
    id: "CLI-012",
    name: "Burger & Kebab",
    businessType: "fastfood",
    contact: { name: "Adel Messaoudi", phone: "04 78 23 45 67", email: "burgerkebab.lyon@gmail.com" },
    address: { street: "45 Rue de Marseille", city: "Lyon 7ème", postalCode: "69007" },
    depot: "Lyon",
    commercial: "Rachid M.",
    accountType: "Bronze",
    remise: 5,
    encours: 200,
    encoursMax: 1500,
    lastOrder: "2024-02-04",
    ordersThisMonth: 4,
    totalSpent: 19200,
    status: "active",
    avatar: "BK",
    color: "from-rose-500 to-pink-500",
  },
  {
    id: "CLI-013",
    name: "Le Palais du Kebab",
    businessType: "kebab",
    contact: { name: "Bilal Amara", phone: "04 78 34 56 78", email: "palais.kebab@outlook.fr" },
    address: { street: "23 Place du Pont", city: "Lyon 7ème", postalCode: "69007" },
    depot: "Lyon",
    commercial: "Hamza K.",
    accountType: "Silver",
    remise: 8,
    encours: 650,
    encoursMax: 3000,
    lastOrder: "2024-02-01",
    ordersThisMonth: 6,
    totalSpent: 34500,
    status: "active",
    avatar: "PK",
    color: "from-fuchsia-500 to-purple-500",
  },
  {
    id: "CLI-014",
    name: "Antalya Kebab",
    businessType: "kebab",
    contact: { name: "Osman Celik", phone: "04 78 45 67 89", email: "antalya.kebab@gmail.com" },
    address: { street: "67 Cours Vitton", city: "Lyon 6ème", postalCode: "69006" },
    depot: "Lyon",
    commercial: "Fatima Z.",
    accountType: "Standard",
    remise: 0,
    encours: 0,
    encoursMax: 800,
    lastOrder: "2024-01-20",
    ordersThisMonth: 0,
    totalSpent: 6700,
    status: "at_risk",
    avatar: "AK",
    color: "from-slate-400 to-gray-500",
  },
  {
    id: "CLI-015",
    name: "Chez Nassim",
    businessType: "restaurant",
    contact: { name: "Nassim Hadj", phone: "04 78 56 78 90", email: "cheznassim@gmail.com" },
    address: { street: "12 Rue Moncey", city: "Lyon 3ème", postalCode: "69003" },
    depot: "Lyon",
    commercial: "Rachid M.",
    accountType: "Gold",
    remise: 12,
    encours: 2500,
    encoursMax: 8000,
    lastOrder: "2024-02-05",
    ordersThisMonth: 14,
    totalSpent: 78900,
    status: "active",
    avatar: "CN",
    color: "from-teal-500 to-emerald-500",
  },

  // === MONTPELLIER (8 clients) ===
  {
    id: "CLI-016",
    name: "Kebab Méditerranée",
    businessType: "kebab",
    contact: { name: "Rachid Bouziane", phone: "04 67 12 34 56", email: "kebab.med@gmail.com" },
    address: { street: "34 Place de la Comédie", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Karim B.",
    accountType: "Gold",
    remise: 10,
    encours: 1200,
    encoursMax: 5000,
    lastOrder: "2024-02-04",
    ordersThisMonth: 10,
    totalSpent: 52300,
    status: "active",
    avatar: "KM",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "CLI-017",
    name: "La Casa del Tacos",
    businessType: "tacos",
    contact: { name: "Carlos Mendez", phone: "04 67 23 45 67", email: "casatacos@hotmail.fr" },
    address: { street: "12 Rue de la Loge", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Karim B.",
    accountType: "Silver",
    remise: 7,
    encours: 340,
    encoursMax: 2500,
    lastOrder: "2024-02-03",
    ordersThisMonth: 5,
    totalSpent: 24500,
    status: "active",
    avatar: "CT",
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: "CLI-018",
    name: "Orient Express Montpellier",
    businessType: "restaurant",
    contact: { name: "Faisal Ahmad", phone: "04 67 34 56 78", email: "orientexpress.mtp@gmail.com" },
    address: { street: "56 Avenue de Toulouse", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Nadia A.",
    accountType: "Silver",
    remise: 8,
    encours: 780,
    encoursMax: 3500,
    lastOrder: "2024-02-02",
    ordersThisMonth: 7,
    totalSpent: 38900,
    status: "active",
    avatar: "OE",
    color: "from-violet-500 to-indigo-500",
  },
  {
    id: "CLI-019",
    name: "Snack Soleil",
    businessType: "snack",
    contact: { name: "Ahmed Toumi", phone: "04 67 45 67 89", email: "snacksoleil@gmail.com" },
    address: { street: "89 Rue du Faubourg Figuerolles", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Karim B.",
    accountType: "Bronze",
    remise: 5,
    encours: 150,
    encoursMax: 1500,
    lastOrder: "2024-01-30",
    ordersThisMonth: 3,
    totalSpent: 12400,
    status: "at_risk",
    avatar: "SS",
    color: "from-amber-400 to-yellow-500",
  },
  {
    id: "CLI-020",
    name: "Grill Master 34",
    businessType: "grill",
    contact: { name: "Yassine Boukhari", phone: "04 67 56 78 90", email: "grillmaster34@gmail.com" },
    address: { street: "23 Rue de Verdun", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Nadia A.",
    accountType: "Gold",
    remise: 10,
    encours: 1650,
    encoursMax: 6000,
    lastOrder: "2024-02-05",
    ordersThisMonth: 12,
    totalSpent: 61200,
    status: "active",
    avatar: "GM",
    color: "from-red-500 to-rose-500",
  },
  {
    id: "CLI-021",
    name: "Pizza & Kebab Palace",
    businessType: "kebab",
    contact: { name: "Hamid Saadi", phone: "04 67 67 89 01", email: "pkpalace@outlook.fr" },
    address: { street: "45 Boulevard de Strasbourg", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Karim B.",
    accountType: "Standard",
    remise: 0,
    encours: 0,
    encoursMax: 1000,
    lastOrder: "2024-01-25",
    ordersThisMonth: 2,
    totalSpent: 9800,
    status: "inactive",
    avatar: "PP",
    color: "from-gray-400 to-slate-500",
  },
  {
    id: "CLI-022",
    name: "Le Bazar Oriental",
    businessType: "restaurant",
    contact: { name: "Omar Bennis", phone: "04 67 78 90 12", email: "bazaroriental@gmail.com" },
    address: { street: "78 Rue de l'Université", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Nadia A.",
    accountType: "Silver",
    remise: 7,
    encours: 420,
    encoursMax: 3000,
    lastOrder: "2024-02-01",
    ordersThisMonth: 6,
    totalSpent: 29700,
    status: "active",
    avatar: "BO",
    color: "from-emerald-500 to-green-500",
  },
  {
    id: "CLI-023",
    name: "Fast Food Galaxy",
    businessType: "fastfood",
    contact: { name: "Sofiane Larbi", phone: "04 67 89 01 23", email: "ffgalaxy.mtp@gmail.com" },
    address: { street: "15 Place de l'Europe", city: "Montpellier", postalCode: "34000" },
    depot: "Montpellier",
    commercial: "Karim B.",
    accountType: "Bronze",
    remise: 5,
    encours: 280,
    encoursMax: 2000,
    lastOrder: "2024-02-04",
    ordersThisMonth: 5,
    totalSpent: 18900,
    status: "active",
    avatar: "FG",
    color: "from-purple-500 to-fuchsia-500",
  },

  // === BORDEAUX (7 clients) ===
  {
    id: "CLI-024",
    name: "Le Grand Kebab Bordelais",
    businessType: "kebab",
    contact: { name: "Amir Zeroual", phone: "05 56 12 34 56", email: "grandkebab.bdx@gmail.com" },
    address: { street: "45 Cours de l'Intendance", city: "Bordeaux", postalCode: "33000" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Gold",
    remise: 10,
    encours: 1400,
    encoursMax: 5500,
    lastOrder: "2024-02-05",
    ordersThisMonth: 11,
    totalSpent: 58700,
    status: "active",
    avatar: "GK",
    color: "from-wine-500 to-red-500",
  },
  {
    id: "CLI-025",
    name: "Tacos Factory Bordeaux",
    businessType: "tacos",
    contact: { name: "Nabil Hammami", phone: "05 56 23 45 67", email: "tacosfactory.bdx@gmail.com" },
    address: { street: "23 Rue Sainte-Catherine", city: "Bordeaux", postalCode: "33000" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Silver",
    remise: 8,
    encours: 560,
    encoursMax: 3000,
    lastOrder: "2024-02-03",
    ordersThisMonth: 7,
    totalSpent: 32400,
    status: "active",
    avatar: "TF",
    color: "from-amber-500 to-yellow-500",
  },
  {
    id: "CLI-026",
    name: "Snack Porte Dijeaux",
    businessType: "snack",
    contact: { name: "Malik Ouahab", phone: "05 56 34 56 78", email: "snack.dijeaux@hotmail.fr" },
    address: { street: "12 Place Gambetta", city: "Bordeaux", postalCode: "33000" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Bronze",
    remise: 5,
    encours: 180,
    encoursMax: 1500,
    lastOrder: "2024-02-02",
    ordersThisMonth: 4,
    totalSpent: 14200,
    status: "active",
    avatar: "SD",
    color: "from-teal-500 to-cyan-500",
  },
  {
    id: "CLI-027",
    name: "Istanbul Döner",
    businessType: "kebab",
    contact: { name: "Selim Aydin", phone: "05 56 45 67 89", email: "istanbul.doner.bdx@gmail.com" },
    address: { street: "67 Quai des Chartrons", city: "Bordeaux", postalCode: "33000" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Standard",
    remise: 0,
    encours: 0,
    encoursMax: 1000,
    lastOrder: "2024-01-18",
    ordersThisMonth: 1,
    totalSpent: 7800,
    status: "at_risk",
    avatar: "ID",
    color: "from-slate-400 to-gray-500",
  },
  {
    id: "CLI-028",
    name: "La Table d'Orient",
    businessType: "restaurant",
    contact: { name: "Jamal Tazi", phone: "05 56 56 78 90", email: "tableorient.bdx@gmail.com" },
    address: { street: "34 Cours du Chapeau Rouge", city: "Bordeaux", postalCode: "33000" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Gold",
    remise: 12,
    encours: 2200,
    encoursMax: 7000,
    lastOrder: "2024-02-05",
    ordersThisMonth: 13,
    totalSpent: 72500,
    status: "active",
    avatar: "TO",
    color: "from-indigo-500 to-blue-500",
  },
  {
    id: "CLI-029",
    name: "Grill Aquitaine",
    businessType: "grill",
    contact: { name: "Redouane Belkadi", phone: "05 56 67 89 01", email: "grillaquitaine@outlook.fr" },
    address: { street: "89 Rue Fondaudège", city: "Bordeaux", postalCode: "33000" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Silver",
    remise: 7,
    encours: 390,
    encoursMax: 2500,
    lastOrder: "2024-02-01",
    ordersThisMonth: 5,
    totalSpent: 26800,
    status: "active",
    avatar: "GA",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "CLI-030",
    name: "Kebab Corner Mérignac",
    businessType: "kebab",
    contact: { name: "Khaled Bensaid", phone: "05 56 78 90 12", email: "kebabcorner.merignac@gmail.com" },
    address: { street: "56 Avenue de la Marne", city: "Mérignac", postalCode: "33700" },
    depot: "Bordeaux",
    commercial: "Youssef E.",
    accountType: "Bronze",
    remise: 5,
    encours: 120,
    encoursMax: 1500,
    lastOrder: "2024-02-04",
    ordersThisMonth: 4,
    totalSpent: 16500,
    status: "active",
    avatar: "KC",
    color: "from-violet-500 to-purple-500",
  },
];

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "inactive" | "at_risk";

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
  tacos: {
    label: "Tacos",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  grill: {
    label: "Grill",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// Account type config
const accountTypeConfig: Record<AccountType, { color: string; icon: string }> = {
  Gold: { color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", icon: "👑" },
  Silver: { color: "text-slate-600 bg-slate-100 dark:bg-slate-800", icon: "🥈" },
  Bronze: { color: "text-orange-700 bg-orange-100 dark:bg-orange-900/30", icon: "🥉" },
  Standard: { color: "text-gray-600 bg-gray-100 dark:bg-gray-800", icon: "📋" },
};

// Status config
const statusConfig: Record<ClientStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: "Actif", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  inactive: { label: "Inactif", color: "text-gray-600 dark:text-gray-400", bgColor: "bg-gray-100 dark:bg-gray-800" },
  at_risk: { label: "À risque", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

export default function ClientsPage() {
  const [clients] = useState(mockClients);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [depotFilter, setDepotFilter] = useState<"all" | Depot>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.commercial.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || client.status === statusFilter;
    const matchesBusinessType =
      businessTypeFilter === "all" || client.businessType === businessTypeFilter;
    const matchesDepot =
      depotFilter === "all" || client.depot === depotFilter;
    return matchesSearch && matchesStatus && matchesBusinessType && matchesDepot;
  });

  // Calculate stats
  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    atRisk: clients.filter((c) => c.status === "at_risk").length,
    totalCA: clients.reduce((sum, c) => sum + c.totalSpent, 0),
    avgOrderValue: Math.round(clients.reduce((sum, c) => sum + c.totalSpent, 0) / clients.reduce((sum, c) => sum + c.ordersThisMonth, 0) || 0),
  };

  // Depot stats
  const depotStats = {
    Lyon: clients.filter((c) => c.depot === "Lyon").length,
    Montpellier: clients.filter((c) => c.depot === "Montpellier").length,
    Bordeaux: clients.filter((c) => c.depot === "Bordeaux").length,
  };

  // Get top spenders
  const topSpenders = [...clients]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 3);

  // Handle actions
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleView = (_clientId: string) => {
    // In production, navigate to client detail
  };

  const handleEdit = (_clientId: string) => {
    // In production, open edit modal
  };

  const handleAddClient = () => {
    // console.log("Add new client");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Clients DISTRAM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Portefeuille de {stats.total} clients actifs sur 3 dépôts
            </p>
          </div>
          <Button
            onClick={handleAddClient}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/30"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    À risque
                  </p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                    {stats.atRisk}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    CA Total
                  </p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-2">
                    {formatCurrency(stats.totalCA)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl">
                  <Crown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Nouveaux
                  </p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                    +5
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Depot Quick Filters */}
        <div className="grid grid-cols-3 gap-4">
          {(["Lyon", "Montpellier", "Bordeaux"] as Depot[]).map((depot) => (
            <Card
              key={depot}
              className={cn(
                "rounded-xl border cursor-pointer transition-all hover:shadow-md",
                depotFilter === depot
                  ? "ring-2 ring-violet-500 border-violet-300"
                  : "border-gray-200 dark:border-gray-700"
              )}
              onClick={() => setDepotFilter(depotFilter === depot ? "all" : depot)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{depot}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {depotStats[depot]} clients
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                    placeholder="Rechercher par nom, contact, ville ou commercial..."
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
                        : statusConfig[statusFilter as ClientStatus]?.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                      Tous les statuts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                      Actifs
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("at_risk")}>
                      À risque
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
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("kebab")}>
                      Kebab
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("restaurant")}>
                      Restaurant
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("tacos")}>
                      Tacos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("snack")}>
                      Snack
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("grill")}>
                      Grill
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBusinessTypeFilter("pizzeria")}>
                      Pizzeria
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
            {(statusFilter !== "all" || businessTypeFilter !== "all" || depotFilter !== "all") && (
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
                    {statusConfig[statusFilter as ClientStatus]?.label} ×
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
                {depotFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer rounded-lg"
                    onClick={() => setDepotFilter("all")}
                  >
                    {depotFilter} ×
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""} trouvé{filteredClients.length > 1 ? "s" : ""}
          </p>
        </div>

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
                          "flex items-center justify-center rounded-xl font-bold text-white bg-gradient-to-br shadow-lg relative",
                          client.color,
                          viewMode === "grid" ? "h-16 w-16 text-xl" : "h-14 w-14 text-lg"
                        )}
                      >
                        {client.avatar}
                        {topSpenders.find((s) => s.id === client.id) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-xs">
                            👑
                          </div>
                        )}
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
                          <Badge className={cn("text-xs font-medium", accountTypeConfig[client.accountType].color)}>
                            {accountTypeConfig[client.accountType].icon} {client.accountType}
                          </Badge>
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
                              statusConfig[client.status].bgColor,
                              statusConfig[client.status].color
                            )}
                          >
                            {client.status === "at_risk" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {statusConfig[client.status].label}
                          </Badge>
                          <Badge variant="outline" className="rounded-lg text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {client.depot}
                          </Badge>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            <span>{client.contact.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{client.address.city}</span>
                          </div>
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
                              Dernière cmd
                            </p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                              {formatDate(client.lastOrder)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              CA Total
                            </p>
                            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                              {formatCurrency(client.totalSpent)}
                            </p>
                          </div>
                          {viewMode === "list" && (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Cmd/mois
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                  {client.ordersThisMonth}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Commercial
                                </p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                                  {client.commercial}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Remise info */}
                        {client.remise > 0 && (
                          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                            Remise fidélité: {client.remise}%
                          </div>
                        )}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmail(client.contact.email)}
                        className={cn(
                          "rounded-lg hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-colors",
                          viewMode === "grid" && "flex-1"
                        )}
                      >
                        <Mail className="h-4 w-4" />
                        {viewMode === "grid" && <span className="ml-2">Email</span>}
                      </Button>
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
