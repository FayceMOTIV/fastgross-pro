"use client";

import { useState } from "react";
import {
  Gift, Users, Share2, Copy, CheckCircle2,
  TrendingUp, Award,
  Mail, MessageSquare, Facebook, Twitter,
  Linkedin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Types
interface ReferralProgram {
  rewards: {
    referrer: { type: "discount" | "credit" | "gift"; value: number };
    referred: { type: "discount" | "credit" | "gift"; value: number };
  };
  rules: {
    minOrderValue?: number;
    maxReferrals?: number;
    expirationDays?: number;
  };
}

interface Referral {
  id: string;
  referrerId: string;
  referredId?: string;
  referredEmail: string;
  referredName: string;
  referredBusiness?: string;
  status: "pending" | "contacted" | "converted" | "expired";
  code: string;
  createdAt: Date;
  convertedAt?: Date;
  rewardAmount?: number;
}

// Program configuration
const PROGRAM: ReferralProgram = {
  rewards: {
    referrer: { type: "credit", value: 100 },
    referred: { type: "credit", value: 100 },
  },
  rules: {
    minOrderValue: 200,
    maxReferrals: 50,
    expirationDays: 90,
  },
};

// Mock referrals data
const mockReferrals: Referral[] = [
  {
    id: "ref_1",
    referrerId: "user_1",
    referredId: "client_5",
    referredEmail: "ali@pizzanice.fr",
    referredName: "Ali Kebab",
    referredBusiness: "Pizza Nice",
    status: "converted",
    code: "PARRAIN-ABC123",
    createdAt: new Date("2025-01-05"),
    convertedAt: new Date("2025-01-12"),
    rewardAmount: 100,
  },
  {
    id: "ref_2",
    referrerId: "user_1",
    referredEmail: "contact@burgerexpress.fr",
    referredName: "Mohamed Burger",
    referredBusiness: "Burger Express",
    status: "contacted",
    code: "PARRAIN-DEF456",
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "ref_3",
    referrerId: "user_1",
    referredEmail: "info@tacosking.fr",
    referredName: "Karim Tacos",
    referredBusiness: "Tacos King",
    status: "pending",
    code: "PARRAIN-GHI789",
    createdAt: new Date("2025-01-20"),
  },
  {
    id: "ref_4",
    referrerId: "user_1",
    referredId: "client_8",
    referredEmail: "snack@gmail.com",
    referredName: "Jean Snack",
    referredBusiness: "Le Petit Snack",
    status: "converted",
    code: "PARRAIN-JKL012",
    createdAt: new Date("2024-12-10"),
    convertedAt: new Date("2024-12-25"),
    rewardAmount: 100,
  },
];

// Status badge component
function StatusBadge({ status }: { status: Referral["status"] }) {
  const config = {
    pending: { color: "bg-gray-100 text-gray-700", label: "En attente" },
    contacted: { color: "bg-blue-100 text-blue-700", label: "Contacté" },
    converted: { color: "bg-green-100 text-green-700", label: "Converti" },
    expired: { color: "bg-red-100 text-red-700", label: "Expiré" },
  };

  const { color, label } = config[status];

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", color)}>
      {label}
    </span>
  );
}

export default function ReferralPage() {
  const [referrals] = useState<Referral[]>(mockReferrals);
  const [newReferralEmail, setNewReferralEmail] = useState("");
  const [newReferralName, setNewReferralName] = useState("");
  const [copied, setCopied] = useState(false);
  const [_showInviteForm, setShowInviteForm] = useState(false);

  // Generate referral link
  const referralCode = "PARRAIN-USER1";
  const referralLink = `https://fastgross.pro/landing/parrainage?ref=${referralCode}`;

  // Stats
  const stats = {
    totalReferrals: referrals.length,
    converted: referrals.filter((r) => r.status === "converted").length,
    pending: referrals.filter((r) => r.status === "pending" || r.status === "contacted").length,
    totalEarned: referrals
      .filter((r) => r.status === "converted")
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    conversionRate: referrals.length > 0
      ? Math.round((referrals.filter((r) => r.status === "converted").length / referrals.length) * 100)
      : 0,
  };

  // Copy link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share functions
  const shareVia = (platform: string) => {
    const text = `Rejoignez FastGross Pro et économisez 100€ sur votre première commande avec mon code ${referralCode} !`;
    const urls: Record<string, string> = {
      email: `mailto:?subject=Invitation FastGross Pro&body=${encodeURIComponent(text + "\n\n" + referralLink)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + referralLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    };
    window.open(urls[platform], "_blank");
  };

  // Handle manual invite
  const handleInvite = () => {
    if (newReferralEmail && newReferralName) {
      // In production, send invitation email
      console.log("Inviting:", { email: newReferralEmail, name: newReferralName });
      setNewReferralEmail("");
      setNewReferralName("");
      setShowInviteForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-white/20">
              <Gift className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Programme Parrainage</h1>
              <p className="text-purple-200">
                Parrainez vos amis et gagnez 100€ de crédit
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/10 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Partagez votre lien</h3>
              <p className="text-sm text-purple-200">
                Envoyez votre lien de parrainage à vos amis restaurateurs
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Ils s&apos;inscrivent</h3>
              <p className="text-sm text-purple-200">
                Votre filleul crée son compte et passe sa première commande
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Vous gagnez tous les deux</h3>
              <p className="text-sm text-purple-200">
                100€ de crédit pour vous et 100€ pour votre filleul
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-3xl font-bold">{stats.totalReferrals}</p>
              <p className="text-sm text-muted-foreground">Filleuls invités</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-3xl font-bold">{stats.converted}</p>
              <p className="text-sm text-muted-foreground">Convertis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-3xl font-bold">{stats.conversionRate}%</p>
              <p className="text-sm text-muted-foreground">Taux conversion</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-amber-600" />
              <p className="text-3xl font-bold">{stats.totalEarned}€</p>
              <p className="text-sm text-muted-foreground">Total gagné</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Share Card */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Votre lien de parrainage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">Votre code</p>
                  <p className="text-2xl font-bold text-purple-600">{referralCode}</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                    className={cn(copied && "bg-green-50 border-green-200")}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => shareVia("email")}
                    className="hover:bg-gray-100"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => shareVia("whatsapp")}
                    className="hover:bg-green-50"
                  >
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => shareVia("facebook")}
                    className="hover:bg-blue-50"
                  >
                    <Facebook className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => shareVia("twitter")}
                    className="hover:bg-sky-50"
                  >
                    <Twitter className="h-4 w-4 text-sky-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => shareVia("linkedin")}
                    className="hover:bg-blue-50"
                  >
                    <Linkedin className="h-4 w-4 text-blue-700" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invite Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Inviter par email
                </CardTitle>
                <CardDescription>
                  Envoyez une invitation directement par email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Nom du contact"
                  value={newReferralName}
                  onChange={(e) => setNewReferralName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="email@exemple.fr"
                  value={newReferralEmail}
                  onChange={(e) => setNewReferralEmail(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={handleInvite}
                  disabled={!newReferralEmail || !newReferralName}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer l&apos;invitation
                </Button>
              </CardContent>
            </Card>

            {/* Rules Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conditions du programme</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <p>• Commande minimum de {PROGRAM.rules.minOrderValue}€</p>
                <p>• Maximum {PROGRAM.rules.maxReferrals} parrainages</p>
                <p>• Crédit valable {PROGRAM.rules.expirationDays} jours</p>
                <p>• Cumulable avec d&apos;autres offres</p>
              </CardContent>
            </Card>
          </div>

          {/* Referrals Table */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mes filleuls</CardTitle>
                  <CardDescription>
                    Suivez le statut de vos parrainages
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {stats.pending} en attente
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filleul</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Récompense</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referredName}</p>
                          <p className="text-sm text-muted-foreground">
                            {referral.referredBusiness || referral.referredEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{referral.createdAt.toLocaleDateString("fr-FR")}</p>
                          {referral.convertedAt && (
                            <p className="text-green-600 text-xs">
                              Converti le {referral.convertedAt.toLocaleDateString("fr-FR")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={referral.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {referral.status === "converted" ? (
                          <span className="text-green-600 font-semibold">
                            +{referral.rewardAmount}€
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {referrals.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">Aucun filleul pour le moment</h3>
                  <p className="text-muted-foreground mb-4">
                    Partagez votre lien pour commencer à gagner
                  </p>
                  <Button onClick={copyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier mon lien
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard (optional bonus) */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Top Parrains du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { rank: 1, name: "Restaurant Le Provençal", referrals: 12, earned: 1200 },
                { rank: 2, name: "Pizza Roma", referrals: 8, earned: 800 },
                { rank: 3, name: "Kebab Istanbul", referrals: 6, earned: 600 },
              ].map((leader) => (
                <div
                  key={leader.rank}
                  className={cn(
                    "p-4 rounded-xl flex items-center gap-4",
                    leader.rank === 1 ? "bg-amber-50 border-2 border-amber-200" :
                    leader.rank === 2 ? "bg-gray-50 border-2 border-gray-200" :
                    "bg-orange-50 border-2 border-orange-200"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                      leader.rank === 1 ? "bg-amber-500" :
                      leader.rank === 2 ? "bg-gray-400" :
                      "bg-orange-400"
                    )}
                  >
                    {leader.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{leader.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {leader.referrals} filleuls • {leader.earned}€ gagnés
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
