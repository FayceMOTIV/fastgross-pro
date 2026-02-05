'use client';

import { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  LogOut,
  ChevronRight,
  Bell,
  Moon,
  Sun,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuthStore, useUIStore } from '@/stores';
import { ROLE_LABELS } from '@/types/roles';

export default function CommercialProfilePage() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    document.cookie = 'user_role=; path=/; max-age=0';
    logout();
    window.location.href = '/login';
  };

  const roleInfo = user?.role
    ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]
    : null;

  // Mock data pour la zone
  const zone = {
    name: 'Marseille Sud',
    clientCount: 23,
    prospectCount: 8,
  };

  return (
    <div className="pb-24">
      {/* Header avec avatar */}
      <div className="bg-gradient-to-b from-primary/10 to-background p-6 pt-8">
        <div className="flex flex-col items-center text-center">
          <UserAvatar
            user={{
              name: user?.displayName || 'Commercial',
              avatar: user?.avatar,
            }}
            size="xl"
          />
          <h1 className="text-xl font-bold mt-4">{user?.displayName || 'Commercial'}</h1>
          {roleInfo && (
            <Badge variant="outline" className={cn('mt-2', roleInfo.color)}>
              {roleInfo.icon} {roleInfo.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Infos de contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{user?.email || 'email@fastgross.pro'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Téléphone</div>
                <div className="font-medium">{user?.telephone || '06 12 34 56 78'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Zone assignée</div>
                <div className="font-medium">{zone.name}</div>
                <div className="text-xs text-muted-foreground">
                  {zone.clientCount} clients • {zone.prospectCount} prospects
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Membre depuis</div>
                <div className="font-medium">Janvier 2024</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paramètres */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Notifications */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">Notifications</div>
                  <div className="text-xs text-muted-foreground">
                    Alertes et rappels
                  </div>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            {/* Thème */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                )}
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

        {/* Autres liens */}
        <Card>
          <CardContent className="p-0">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Sécurité</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="border-t" />
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Aide et support</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Déconnexion */}
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          FastGross Pro v1.0.0
        </div>
      </div>
    </div>
  );
}
