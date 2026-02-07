'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Target,
  Users,
  MessageSquare,
  Settings,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getTeamMemberDetails,
  TeamMemberDetails,
  TEAM_MEMBER_STATUS_LABELS,
} from '@/services/manager-service';

export default function TeamMemberClient() {
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<TeamMemberDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const loadMember = async () => {
    setIsLoading(true);
    try {
      const data = await getTeamMemberDetails(memberId);
      setMember(data);
    } catch (error) {
      console.error('Erreur chargement membre:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0€';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded w-1/3" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Membre non trouvé</p>
          <Link href="/supervision/equipe">
            <Button>Retour à l'équipe</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = TEAM_MEMBER_STATUS_LABELS[member.status];
  const isCommercial = member.role === 'commercial';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/supervision/equipe">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{member.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
                    {isCommercial ? '👔 Commercial' : '🚚 Livreur'}
                  </Badge>
                  <Badge variant="outline" className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Info */}
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rôle</p>
                    <p className="font-medium">{isCommercial ? 'Commercial' : 'Livreur'}</p>
                  </div>
                </div>
                {member.zone && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Zone</p>
                      <p className="font-medium">{member.zone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Depuis</p>
                    <p className="font-medium">{formatDate(member.joinedAt)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <a href={`tel:${member.phone}`} className="font-medium text-primary">
                      {member.phone}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{member.email}</p>
                  </div>
                </div>
                {!isCommercial && member.vehicleType && (
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Véhicule</p>
                      <p className="font-medium">{member.vehicleType} - {member.licensePlate}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objectives */}
        {isCommercial && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5" />
                Objectifs Janvier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">CA</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(member.monthStats.revenue)} / {formatCurrency(member.monthStats.target)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={cn(
                      'h-3 rounded-full',
                      (member.monthStats.percent || 0) >= 100 ? 'bg-green-500' :
                      (member.monthStats.percent || 0) >= 80 ? 'bg-amber-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${Math.min(member.monthStats.percent || 0, 100)}%` }}
                  />
                </div>
                <p className="text-right text-sm mt-1">
                  <span className={cn(
                    'font-medium',
                    (member.monthStats.percent || 0) >= 100 ? 'text-green-600' :
                    (member.monthStats.percent || 0) >= 80 ? 'text-amber-600' :
                    'text-red-600'
                  )}>
                    {member.monthStats.percent || 0}%
                  </span>
                </p>
              </div>

              {/* New Clients */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Nouveaux clients</span>
                  <span className="text-sm font-medium">{member.monthStats.newClients || 0} / 5</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-blue-500"
                    style={{ width: `${Math.min(((member.monthStats.newClients || 0) / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Stats */}
        {!isCommercial && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Statistiques Janvier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{member.monthStats.deliveries || 0}</p>
                  <p className="text-sm text-muted-foreground">Livraisons</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{member.monthStats.successRate || 0}%</p>
                  <p className="text-sm text-muted-foreground">Succès</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">18min</p>
                  <p className="text-sm text-muted-foreground">Temps moyen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clients (for commercials) */}
        {isCommercial && member.clients && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clients assignés ({member.clients.total})
                </CardTitle>
                <Button variant="ghost" size="sm">
                  Voir tous <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{member.clients.active}</p>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-xl font-bold text-amber-600">{member.clients.atRisk}</p>
                  <p className="text-sm text-muted-foreground">À risque</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-xl font-bold text-red-600">{member.clients.inactive}</p>
                  <p className="text-sm text-muted-foreground">Inactifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Activité récente</CardTitle>
              <Button variant="ghost" size="sm">
                Voir tout <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {member.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto py-4">
            <div className="text-center">
              <MapPin className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Modifier zone</span>
            </div>
          </Button>
          <Button variant="outline" className="h-auto py-4">
            <div className="text-center">
              <Target className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Ajuster objectifs</span>
            </div>
          </Button>
          <Button variant="outline" className="h-auto py-4">
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">Réassigner</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
