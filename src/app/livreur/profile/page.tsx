'use client';

import { useState, useEffect } from 'react';
import {
  Truck,
  Calendar,
  MapPin,
  Bell,
  Moon,
  LogOut,
  Package,
  CheckCircle2,
  XCircle,
  Star,
  Navigation,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getDriverProfile,
  getDriverStatus,
  updateDriverStatus,
  DriverProfile,
  DriverStatus,
} from '@/services/livreur-service';
import { DriverStatusToggle } from '@/components/livreur/driver-status-toggle';
import { useUIStore, useAuthStore } from '@/stores';

export default function LivreurProfilePage() {
  const { theme, toggleTheme } = useUIStore();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [driverStatus, setDriverStatus] = useState<DriverStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [gpsHighPrecision, setGpsHighPrecision] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileData, statusData] = await Promise.all([
        getDriverProfile('driver-1'),
        getDriverStatus('driver-1'),
      ]);
      setProfile(profileData);
      setDriverStatus(statusData);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    logout();
    window.location.href = '/login';
  };

  const handleStatusChange = async (status: 'online' | 'pause' | 'offline') => {
    try {
      await updateDriverStatus('driver-1', status);
      setDriverStatus(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.joinedAt).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header avec avatar */}
      <div className="bg-gradient-to-b from-primary/10 to-background p-6 pt-8">
        <div className="flex flex-col items-center text-center">
          <UserAvatar
            user={{
              name: profile.name,
            }}
            size="xl"
          />
          <h1 className="text-xl font-bold mt-4">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">
            Livreur depuis {memberSince}
          </p>

          {/* Véhicule */}
          <div className="flex items-center gap-2 mt-2 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>{profile.vehicleType}</span>
            <Badge variant="outline">{profile.licensePlate}</Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Statut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Statut</CardTitle>
          </CardHeader>
          <CardContent>
            {driverStatus && (
              <DriverStatusToggle
                currentStatus={driverStatus.status}
                onStatusChange={handleStatusChange}
              />
            )}
          </CardContent>
        </Card>

        {/* Stats aujourd'hui */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatItem
                icon={Package}
                value={`${profile.stats.today.completed}/${profile.stats.today.deliveries}`}
                label="Livraisons"
                color="text-blue-600"
                bgColor="bg-blue-100"
              />
              <StatItem
                icon={CheckCircle2}
                value={profile.stats.today.completed}
                label="Réussies"
                color="text-green-600"
                bgColor="bg-green-100"
              />
              <StatItem
                icon={XCircle}
                value={profile.stats.today.failed}
                label="Échecs"
                color="text-red-600"
                bgColor="bg-red-100"
              />
              <StatItem
                icon={Navigation}
                value={`${profile.stats.today.distance}km`}
                label="Parcourus"
                color="text-purple-600"
                bgColor="bg-purple-100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats ce mois */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ce mois
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-xl">{profile.stats.month.deliveries}</div>
                  <div className="text-xs text-muted-foreground">livraisons</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-green-600">
                  {profile.stats.month.successRate}%
                </div>
                <div className="text-xs text-muted-foreground">de succès</div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-sm">Note moyenne</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-lg">{profile.stats.month.avgRating}</span>
                <span className="text-muted-foreground">/5</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= Math.round(profile.stats.month.avgRating)
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Distance totale</span>
              </div>
              <span className="font-bold">{profile.stats.month.distance} km</span>
            </div>
          </CardContent>
        </Card>

        {/* Paramètres */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* GPS haute précision */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">GPS haute précision</div>
                  <div className="text-xs text-muted-foreground">
                    Meilleure localisation
                  </div>
                </div>
              </div>
              <Switch
                checked={gpsHighPrecision}
                onCheckedChange={setGpsHighPrecision}
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">Notifications</div>
                  <div className="text-xs text-muted-foreground">
                    Alertes et messages
                  </div>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            {/* Mode sombre */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">Mode sombre</div>
                  <div className="text-xs text-muted-foreground">
                    Apparence de l'application
                  </div>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Déconnexion */}
        <Button
          variant="outline"
          className="w-full h-14 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Se déconnecter
        </Button>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          FastGross Pro - Livreur v1.0.0
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: any;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', bgColor)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div>
        <div className="font-bold text-lg">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
