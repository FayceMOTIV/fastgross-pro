'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Truck,
  Search,
  MapPin,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getTeamMembers,
  TeamMember,
  TEAM_MEMBER_STATUS_LABELS,
} from '@/services/manager-service';

type RoleFilter = 'all' | 'commercial' | 'livreur';

export default function EquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMembers();
  }, [roleFilter]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const data = await getTeamMembers('manager-1', {
        role: roleFilter === 'all' ? undefined : roleFilter,
      });
      setMembers(data);
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.zone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const commercials = filteredMembers.filter(m => m.role === 'commercial');
  const drivers = filteredMembers.filter(m => m.role === 'livreur');

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0€';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Mon Équipe
            </h1>
            <Button>
              + Ajouter
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={roleFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={roleFilter === 'commercial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('commercial')}
              >
                <Users className="h-4 w-4 mr-1" />
                Commerciaux
              </Button>
              <Button
                variant={roleFilter === 'livreur' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('livreur')}
              >
                <Truck className="h-4 w-4 mr-1" />
                Livreurs
              </Button>
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Commercials */}
            {(roleFilter === 'all' || roleFilter === 'commercial') && commercials.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5" />
                  Commerciaux ({commercials.length})
                </h2>
                <div className="grid gap-4">
                  {commercials.map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Drivers */}
            {(roleFilter === 'all' || roleFilter === 'livreur') && drivers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Truck className="h-5 w-5" />
                  Livreurs ({drivers.length})
                </h2>
                <div className="grid gap-4">
                  {drivers.map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredMembers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun membre trouvé</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TeamMemberCard({
  member,
  formatCurrency,
}: {
  member: TeamMember;
  formatCurrency: (amount?: number) => string;
}) {
  const statusInfo = TEAM_MEMBER_STATUS_LABELS[member.status];
  const isCommercial = member.role === 'commercial';
  const isAtRisk = isCommercial && (member.monthStats.percent || 0) < 70;

  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:shadow-md',
      isAtRisk && 'border-amber-200'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* Left: Info */}
          <div className="flex items-start gap-4">
            {/* Status indicator */}
            <div className={cn(
              'w-3 h-3 rounded-full mt-2',
              member.status === 'on_field' || member.status === 'delivering' ? 'bg-green-500' :
              member.status === 'active' ? 'bg-blue-500' :
              member.status === 'pause' ? 'bg-amber-500' :
              member.status === 'absent' || member.status === 'offline' ? 'bg-red-500' :
              'bg-gray-400'
            )} />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{member.name}</h3>
                <Badge variant="outline" className={cn(statusInfo.bgColor, statusInfo.color, 'border-0')}>
                  {isCommercial ? '👔' : '🚚'} {statusInfo.label}
                </Badge>
              </div>

              {member.zone && (
                <p className="text-sm text-muted-foreground">
                  Zone: {member.zone}
                </p>
              )}

              {member.currentTask && member.status !== 'absent' && member.status !== 'offline' && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {member.currentTask}
                </p>
              )}

              {/* Today stats */}
              <div className="flex gap-4 mt-2 text-sm">
                {isCommercial ? (
                  <>
                    <span>{member.todayStats.visits || 0} visites</span>
                    <span>•</span>
                    <span>{member.todayStats.orders || 0} commandes</span>
                    <span>•</span>
                    <span className="font-medium">{formatCurrency(member.todayStats.revenue)}</span>
                  </>
                ) : (
                  <>
                    <span>{member.todayStats.completed || 0}/{member.todayStats.deliveries || 0} livraisons</span>
                    <span>•</span>
                    <span>{Math.round(((member.todayStats.completed || 0) / (member.todayStats.deliveries || 1)) * 100)}%</span>
                  </>
                )}
              </div>

              {/* Month stats */}
              <div className="mt-2">
                {isCommercial ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ce mois:</span>
                    <span className="font-medium">{formatCurrency(member.monthStats.revenue)}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{formatCurrency(member.monthStats.target)}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        (member.monthStats.percent || 0) >= 100 ? 'text-green-600 border-green-300' :
                        (member.monthStats.percent || 0) >= 80 ? 'text-amber-600 border-amber-300' :
                        'text-red-600 border-red-300'
                      )}
                    >
                      {member.monthStats.percent || 0}%
                    </Badge>
                    {(member.monthStats.percent || 0) >= 100 && <span className="text-lg">🏆</span>}
                    {isAtRisk && <span className="text-lg">⚠️</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ce mois:</span>
                    <span className="font-medium">{member.monthStats.deliveries || 0} livraisons</span>
                    <span className="text-muted-foreground">•</span>
                    <span className={cn(
                      (member.monthStats.successRate || 0) >= 98 ? 'text-green-600' : 'text-amber-600'
                    )}>
                      {member.monthStats.successRate || 0}% succès
                    </span>
                    {(member.monthStats.successRate || 0) >= 99 && <span className="text-lg">🏆</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="Localiser">
              <MapPin className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Statistiques">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Message">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Link href={`/supervision/equipe/${member.id}`}>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
