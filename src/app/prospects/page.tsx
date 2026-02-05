"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  Flame,
  Snowflake,
  Thermometer,
  Filter,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Tag,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  PhoneCall,
  Send,
  Video
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Types
type ProspectStatus = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "converted" | "lost";
type ProspectScore = "hot" | "warm" | "cold";
type ProspectSource = "website" | "referral" | "cold-call" | "linkedin" | "event" | "partnership";

interface Prospect {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  position: string;
  company: string;
  location: string;
  status: ProspectStatus;
  score: ProspectScore;
  source: ProspectSource;
  value: number;
  lastContact: Date;
  nextAction?: string;
  notes?: string;
  tags: string[];
}

// Mock data - 10 prospects
const mockProspects: Prospect[] = [
  {
    id: "1",
    businessName: "Restaurant Le Gourmet",
    contactName: "Pierre Dubois",
    email: "pierre@legourmet.fr",
    phone: "+33 1 42 86 82 40",
    position: "Propriétaire",
    company: "Le Gourmet SARL",
    location: "Paris, 75008",
    status: "new",
    score: "hot",
    source: "website",
    value: 45000,
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    nextAction: "Premier appel de découverte",
    tags: ["Restaurant gastronomique", "VIP"],
  },
  {
    id: "2",
    businessName: "Boulangerie Martin",
    contactName: "Sophie Martin",
    email: "sophie@boulangeriemartin.fr",
    phone: "+33 4 91 54 32 10",
    position: "Gérante",
    company: "Boulangerie Martin",
    location: "Marseille, 13001",
    status: "contacted",
    score: "hot",
    source: "referral",
    value: 28000,
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    nextAction: "Envoi du devis personnalisé",
    tags: ["Boulangerie", "Bio"],
  },
  {
    id: "3",
    businessName: "Pizzeria Bella Napoli",
    contactName: "Marco Rossi",
    email: "marco@bellanapoli.fr",
    phone: "+33 4 78 28 12 34",
    position: "Chef propriétaire",
    company: "Bella Napoli SAS",
    location: "Lyon, 69002",
    status: "qualified",
    score: "warm",
    source: "linkedin",
    value: 35000,
    lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    nextAction: "Rendez-vous mardi 14h",
    tags: ["Pizzeria", "Italien"],
  },
  {
    id: "4",
    businessName: "Café des Arts",
    contactName: "Isabelle Leclerc",
    email: "isabelle@cafedesarts.fr",
    phone: "+33 5 56 44 28 91",
    position: "Directrice",
    company: "Arts & Café",
    location: "Bordeaux, 33000",
    status: "proposal",
    score: "hot",
    source: "cold-call",
    value: 22000,
    lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    nextAction: "Relance sur proposition commerciale",
    tags: ["Café", "Culture"],
  },
  {
    id: "5",
    businessName: "Traiteur Excellence",
    contactName: "Jean-François Petit",
    email: "jf@traiteurexcellence.fr",
    phone: "+33 3 88 32 45 67",
    position: "Directeur commercial",
    company: "Excellence Traiteur SA",
    location: "Strasbourg, 67000",
    status: "negotiation",
    score: "warm",
    source: "event",
    value: 65000,
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    nextAction: "Négociation finale - remise volume",
    tags: ["Traiteur", "Événementiel", "B2B"],
  },
  {
    id: "6",
    businessName: "Snack Le Rapide",
    contactName: "Ahmed Khalil",
    email: "ahmed@lerapide.fr",
    phone: "+33 4 93 87 65 43",
    position: "Gérant",
    company: "Le Rapide EURL",
    location: "Nice, 06000",
    status: "contacted",
    score: "cold",
    source: "partnership",
    value: 15000,
    lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    nextAction: "Suivi dans 2 semaines",
    tags: ["Snack", "Fast-food"],
  },
  {
    id: "7",
    businessName: "Brasserie du Port",
    contactName: "Thomas Bernard",
    email: "thomas@brasserieduport.fr",
    phone: "+33 2 51 86 43 21",
    position: "Co-gérant",
    company: "Port Brasserie SARL",
    location: "Nantes, 44000",
    status: "qualified",
    score: "hot",
    source: "website",
    value: 52000,
    lastContact: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    nextAction: "Démonstration produits mercredi",
    tags: ["Brasserie", "Fruits de mer"],
  },
  {
    id: "8",
    businessName: "Pâtisserie Délice",
    contactName: "Caroline Rousseau",
    email: "caroline@patisseriedelice.fr",
    phone: "+33 4 67 29 38 47",
    position: "Propriétaire",
    company: "Délice Pâtisserie",
    location: "Montpellier, 34000",
    status: "new",
    score: "warm",
    source: "referral",
    value: 31000,
    lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    nextAction: "Planifier appel de qualification",
    tags: ["Pâtisserie", "Artisanal"],
  },
  {
    id: "9",
    businessName: "Bistrot Moderne",
    contactName: "Laurent Mercier",
    email: "laurent@bistrotmoderne.fr",
    phone: "+33 2 40 47 89 12",
    position: "Chef",
    company: "Bistrot Moderne SAS",
    location: "Rennes, 35000",
    status: "lost",
    score: "cold",
    source: "cold-call",
    value: 0,
    lastContact: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    notes: "A choisi un concurrent - recontacter dans 6 mois",
    tags: ["Bistrot"],
  },
  {
    id: "10",
    businessName: "Food Truck Saveurs",
    contactName: "Marie Lefebvre",
    email: "marie@foodtrucksaveurs.fr",
    phone: "+33 6 12 34 56 78",
    position: "Fondatrice",
    company: "Saveurs Mobiles",
    location: "Toulouse, 31000",
    status: "converted",
    score: "hot",
    source: "linkedin",
    value: 18000,
    lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    notes: "Client depuis 2 semaines - très satisfait",
    tags: ["Food truck", "Mobile"],
  },
];

// Status configuration
const statusConfig: Record<ProspectStatus, { label: string; color: string; icon: any }> = {
  new: { label: "Nouveau", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400", icon: Target },
  contacted: { label: "Contacté", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400", icon: Phone },
  qualified: { label: "Qualifié", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400", icon: CheckCircle2 },
  proposal: { label: "Proposition", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400", icon: TrendingUp },
  negotiation: { label: "Négociation", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", icon: Users },
  converted: { label: "Converti", color: "bg-green-500/10 text-green-700 dark:text-green-400", icon: CheckCircle2 },
  lost: { label: "Perdu", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400", icon: Clock },
};

// Score configuration
const scoreConfig: Record<ProspectScore, { label: string; icon: any; color: string; bg: string }> = {
  hot: {
    label: "Chaud",
    icon: Flame,
    color: "text-red-600 dark:text-red-500",
    bg: "bg-red-500/10"
  },
  warm: {
    label: "Tiède",
    icon: Thermometer,
    color: "text-orange-600 dark:text-orange-500",
    bg: "bg-orange-500/10"
  },
  cold: {
    label: "Froid",
    icon: Snowflake,
    color: "text-blue-600 dark:text-blue-500",
    bg: "bg-blue-500/10"
  },
};

// Source configuration
const sourceConfig: Record<ProspectSource, { label: string; color: string }> = {
  website: { label: "Site Web", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  referral: { label: "Recommandation", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  "cold-call": { label: "Appel à froid", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  linkedin: { label: "LinkedIn", color: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  event: { label: "Événement", color: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  partnership: { label: "Partenariat", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
};

export default function ProspectsPage() {
  const [prospects] = useState<Prospect[]>(mockProspects);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "all">("all");
  const [scoreFilter, setScoreFilter] = useState<ProspectScore | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ProspectSource | "all">("all");

  // Calculate stats
  const stats = {
    total: prospects.length,
    hot: prospects.filter(p => p.score === "hot" && p.status !== "lost" && p.status !== "converted").length,
    qualified: prospects.filter(p => p.status === "qualified" || p.status === "proposal" || p.status === "negotiation").length,
    converted: prospects.filter(p => p.status === "converted").length,
  };

  // Calculate pipeline value
  const pipelineValue = prospects
    .filter(p => p.status !== "lost" && p.status !== "converted")
    .reduce((sum, p) => sum + p.value, 0);

  // Filter prospects
  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch =
      prospect.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter;
    const matchesScore = scoreFilter === "all" || prospect.score === scoreFilter;
    const matchesSource = sourceFilter === "all" || prospect.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesScore && matchesSource;
  });

  // Group prospects by status for kanban view
  const prospectsByStatus = {
    new: filteredProspects.filter(p => p.status === "new"),
    contacted: filteredProspects.filter(p => p.status === "contacted"),
    qualified: filteredProspects.filter(p => p.status === "qualified"),
    proposal: filteredProspects.filter(p => p.status === "proposal"),
    negotiation: filteredProspects.filter(p => p.status === "negotiation"),
    converted: filteredProspects.filter(p => p.status === "converted"),
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return date.toLocaleDateString("fr-FR");
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Handlers
  const handleCall = (prospect: Prospect) => {
    toast.success(`Appel vers ${prospect.contactName} initié`);
  };

  const handleEmail = (prospect: Prospect) => {
    toast.success(`Email à ${prospect.contactName} ouvert`);
  };

  const handleSchedule = (prospect: Prospect) => {
    toast.success(`Planification de réunion avec ${prospect.contactName}`);
  };

  const handleView = (prospect: Prospect) => {
    toast.info(`Affichage des détails de ${prospect.businessName}`);
  };

  const handleEdit = (prospect: Prospect) => {
    toast.info(`Édition de ${prospect.businessName}`);
  };

  const handleDelete = (prospect: Prospect) => {
    toast.success(`${prospect.businessName} supprimé`);
  };

  const handleConvert = (prospect: Prospect) => {
    toast.success(`${prospect.businessName} converti en client!`);
  };

  // Render prospect card
  const renderProspectCard = (prospect: Prospect, compact = false) => {
    const StatusIcon = statusConfig[prospect.status].icon;
    const ScoreIcon = scoreConfig[prospect.score].icon;

    return (
      <Card
        key={prospect.id}
        className={cn(
          "group hover:shadow-lg transition-all duration-200 border-l-4",
          prospect.score === "hot" ? "border-l-red-500" :
          prospect.score === "warm" ? "border-l-orange-500" : "border-l-blue-500"
        )}
      >
        <CardContent className={cn("p-4", compact && "p-3")}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
                  {prospect.businessName}
                </h3>
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full",
                  scoreConfig[prospect.score].bg
                )}>
                  <ScoreIcon className={cn("h-3 w-3", scoreConfig[prospect.score].color)} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{prospect.contactName}</p>
              <p className="text-xs text-muted-foreground">{prospect.position}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(prospect)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                {prospect.status !== "converted" && prospect.status !== "lost" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleConvert(prospect)} className="text-green-600">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convertir en client
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(prospect)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-3">
            <Badge className={cn("text-xs", statusConfig[prospect.status].color)}>
              {statusConfig[prospect.status].label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sourceConfig[prospect.source].label}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{prospect.company}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{prospect.location}</span>
            </div>
          </div>

          {/* Value & Last Contact */}
          <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b">
            <div>
              <p className="text-muted-foreground">Valeur potentielle</p>
              <p className="font-semibold text-orange-600">{formatCurrency(prospect.value)}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Dernier contact</p>
              <p className="font-medium">{formatDate(prospect.lastContact)}</p>
            </div>
          </div>

          {/* Next Action */}
          {prospect.nextAction && (
            <div className="mb-3 p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {prospect.nextAction}
              </p>
            </div>
          )}

          {/* Tags */}
          {prospect.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {prospect.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {prospect.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{prospect.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => handleCall(prospect)}
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1" />
              Appeler
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => handleEmail(prospect)}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => handleSchedule(prospect)}
            >
              <Video className="h-3.5 w-3.5 mr-1" />
              RDV
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Gestion des Prospects
            </h1>
            <p className="text-muted-foreground mt-1">
              Pipeline de vente et qualification des leads
            </p>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un prospect
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Prospects</p>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pipeline: {formatCurrency(pipelineValue)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Leads Chauds</p>
                  <p className="text-3xl font-bold mt-2 text-red-600">{stats.hot}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Haute priorité
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Qualifiés</p>
                  <p className="text-3xl font-bold mt-2 text-amber-600">{stats.qualified}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    En négociation active
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Convertis</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">{stats.converted}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Taux: {((stats.converted / stats.total) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Entonnoir de Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { status: "new" as const, count: prospectsByStatus.new.length },
                { status: "contacted" as const, count: prospectsByStatus.contacted.length },
                { status: "qualified" as const, count: prospectsByStatus.qualified.length },
                { status: "proposal" as const, count: prospectsByStatus.proposal.length },
                { status: "negotiation" as const, count: prospectsByStatus.negotiation.length },
                { status: "converted" as const, count: prospectsByStatus.converted.length },
              ].map(({ status, count }) => {
                const percentage = (count / stats.total) * 100;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{statusConfig[status].label}</span>
                      <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          status === "new" && "bg-blue-500",
                          status === "contacted" && "bg-purple-500",
                          status === "qualified" && "bg-orange-500",
                          status === "proposal" && "bg-amber-500",
                          status === "negotiation" && "bg-yellow-500",
                          status === "converted" && "bg-green-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters & View Toggle */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher par nom, entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Statut
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="ml-2">1</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Tous les statuts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([status, config]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => setStatusFilter(status as ProspectStatus)}
                  >
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Thermometer className="h-4 w-4 mr-2" />
                  Score
                  {scoreFilter !== "all" && (
                    <Badge variant="secondary" className="ml-2">1</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setScoreFilter("all")}>
                  Tous les scores
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setScoreFilter("hot")}>
                  <Flame className="h-4 w-4 mr-2 text-red-600" />
                  Chaud
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScoreFilter("warm")}>
                  <Thermometer className="h-4 w-4 mr-2 text-orange-600" />
                  Tiède
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScoreFilter("cold")}>
                  <Snowflake className="h-4 w-4 mr-2 text-blue-600" />
                  Froid
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Source
                  {sourceFilter !== "all" && (
                    <Badge variant="secondary" className="ml-2">1</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSourceFilter("all")}>
                  Toutes les sources
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(sourceConfig).map(([source, config]) => (
                  <DropdownMenuItem
                    key={source}
                    onClick={() => setSourceFilter(source as ProspectSource)}
                  >
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Prospects View */}
        {filteredProspects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-1">Aucun prospect trouvé</p>
              <p className="text-muted-foreground text-sm">
                Modifiez vos filtres ou ajoutez un nouveau prospect
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProspects.map((prospect) => renderProspectCard(prospect))}
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4" style={{ minWidth: "max-content" }}>
              {Object.entries(prospectsByStatus)
                .filter(([status]) => status !== "converted")
                .map(([status, prospects]) => (
                  <div key={status} className="w-80 shrink-0">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            status === "new" && "bg-blue-500",
                            status === "contacted" && "bg-purple-500",
                            status === "qualified" && "bg-orange-500",
                            status === "proposal" && "bg-amber-500",
                            status === "negotiation" && "bg-yellow-500"
                          )} />
                          {statusConfig[status as ProspectStatus].label}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {prospects.length}
                        </Badge>
                      </div>
                      <div className="h-1 bg-muted rounded-full">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            status === "new" && "bg-blue-500",
                            status === "contacted" && "bg-purple-500",
                            status === "qualified" && "bg-orange-500",
                            status === "proposal" && "bg-amber-500",
                            status === "negotiation" && "bg-yellow-500"
                          )}
                          style={{
                            width: `${(prospects.length / filteredProspects.filter(p => p.status !== "converted").length) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {prospects.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">
                              Aucun prospect
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        prospects.map((prospect) => renderProspectCard(prospect, true))
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}
