'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Building,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  UserCircle,
  Bell,
  Moon,
  LogOut,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  getClientProfile,
  ClientProfile,
} from '@/services/client-portal-service';
import { useUIStore, useAuthStore } from '@/stores';

export default function PortailProfilePage() {
  const { theme, toggleTheme } = useUIStore();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getClientProfile('client-1');
      setProfile(data);
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background p-6 pt-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
            🏪
          </div>
          <h1 className="text-xl font-bold mt-4">{profile.name}</h1>
          <Badge variant="outline" className="mt-2">
            Grille {profile.priceGrid} • -{profile.discountPercent}%
          </Badge>
          <p className="text-sm text-muted-foreground mt-1">
            Client depuis {formatDate(profile.createdAt)}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Company Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Building className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="font-medium">{profile.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">SIRET</div>
                <div className="font-medium">{profile.siret}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{profile.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Téléphone</div>
                <div className="font-medium">{profile.phone}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Adresse de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{profile.address.street}</p>
              <p className="text-muted-foreground">
                {profile.address.postalCode} {profile.address.city}
              </p>
              {profile.address.notes && (
                <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
                  Notes: {profile.address.notes}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-3">
              Modifier l'adresse
            </Button>
          </CardContent>
        </Card>

        {/* Commercial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Votre commercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">👔</span>
                </div>
                <div>
                  <p className="font-medium">{profile.commercialName}</p>
                  <p className="text-sm text-muted-foreground">{profile.commercialPhone}</p>
                </div>
              </div>
              <a href={`tel:${profile.commercialPhone}`}>
                <Button size="sm">
                  <Phone className="h-4 w-4 mr-1" />
                  Appeler
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Conditions de paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Délai de paiement</p>
                <p className="font-medium">{profile.paymentTerms} jours</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plafond de crédit</p>
                <p className="font-medium">{profile.creditLimit.toLocaleString('fr-FR')}€</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
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
                    Commandes et livraisons
                  </div>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            {/* Theme */}
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

        {/* Security */}
        <Card>
          <CardContent className="p-0">
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Changer le mot de passe</span>
              </div>
              →
            </button>
          </CardContent>
        </Card>

        {/* Logout */}
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
          DISTRAM - Portail Client v1.0.0
        </div>
      </div>
    </div>
  );
}
