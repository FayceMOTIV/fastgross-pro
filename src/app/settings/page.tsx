"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Shield,
  Building2,
  Plug,
  Save,
  X,
  Camera,
  Lock,
  Key,
  Smartphone,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Globe,
  Database
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsSection = "profile" | "company" | "notifications" | "security" | "integrations";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <div className="flex-1">
        <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
          checked
            ? "bg-slate-900 dark:bg-slate-100"
            : "bg-slate-300 dark:bg-slate-600"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.displayName || "Jean Dupont",
    email: user?.email || "jean.dupont@fastgross.fr",
    phone: "06 12 34 56 78",
    position: "Directeur Commercial",
  });

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: "FastGross Distribution",
    siret: "123 456 789 00012",
    address: "123 Avenue des Champs-Élysées",
    city: "Paris",
    postalCode: "75008",
    country: "France",
    tva: "FR 12 345678901",
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    orderCreated: true,
    orderUpdated: true,
    orderDelivered: true,
    lowStock: true,
    newMessage: true,
    systemAlerts: true,
    weeklyReport: false,
    monthlyReport: true,
    marketingEmails: false,
  });

  // Security settings
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [security2FA, setSecurity2FA] = useState({
    enabled: false,
    method: "app" as "app" | "sms",
  });

  // Integration settings
  const [integrations, setIntegrations] = useState({
    sage: { connected: false, lastSync: null },
    stripe: { connected: true, lastSync: "2024-01-15" },
    slack: { connected: false, lastSync: null },
    webhook: { enabled: false, url: "" },
  });

  const sections = [
    {
      id: "profile" as const,
      label: "Profil",
      icon: User,
      description: "Informations personnelles"
    },
    {
      id: "company" as const,
      label: "Entreprise",
      icon: Building2,
      description: "Informations de l'entreprise"
    },
    {
      id: "notifications" as const,
      label: "Notifications",
      icon: Bell,
      description: "Préférences de notification"
    },
    {
      id: "security" as const,
      label: "Sécurité",
      icon: Shield,
      description: "Mot de passe et authentification"
    },
    {
      id: "integrations" as const,
      label: "Intégrations",
      icon: Plug,
      description: "Services connectés"
    },
  ];

  const notificationLabels = {
    orderCreated: {
      label: "Nouvelles commandes",
      description: "Être notifié lors de la création d'une nouvelle commande"
    },
    orderUpdated: {
      label: "Mises à jour des commandes",
      description: "Recevoir les notifications de changement de statut"
    },
    orderDelivered: {
      label: "Livraisons",
      description: "Être notifié quand une commande est livrée"
    },
    lowStock: {
      label: "Stock faible",
      description: "Alertes lorsque le stock est en dessous du seuil"
    },
    newMessage: {
      label: "Nouveaux messages",
      description: "Notifications pour les nouveaux messages"
    },
    systemAlerts: {
      label: "Alertes système",
      description: "Notifications importantes du système"
    },
    weeklyReport: {
      label: "Rapport hebdomadaire",
      description: "Recevoir un résumé hebdomadaire par email"
    },
    monthlyReport: {
      label: "Rapport mensuel",
      description: "Recevoir un rapport mensuel détaillé"
    },
    marketingEmails: {
      label: "Emails marketing",
      description: "Recevoir nos actualités et offres promotionnelles"
    },
  };

  const handleUpdateField = (section: string, field: string, value: string) => {
    setHasChanges(true);
    if (section === "profile") {
      setProfileForm({ ...profileForm, [field]: value });
    } else if (section === "company") {
      setCompanyForm({ ...companyForm, [field]: value });
    } else if (section === "security") {
      setSecurityForm({ ...securityForm, [field]: value });
    }
  };

  const handleToggleNotification = (key: keyof typeof notifications) => {
    setHasChanges(true);
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
    toast.success("Paramètres enregistrés avec succès");
  };

  const handleCancelChanges = () => {
    // Reset to original values
    setProfileForm({
      name: user?.displayName || "Jean Dupont",
      email: user?.email || "jean.dupont@fastgross.fr",
      phone: "06 12 34 56 78",
      position: "Directeur Commercial",
    });
    setCompanyForm({
      name: "FastGross Distribution",
      siret: "123 456 789 00012",
      address: "123 Avenue des Champs-Élysées",
      city: "Paris",
      postalCode: "75008",
      country: "France",
      tva: "FR 12 345678901",
    });
    setNotifications({
      orderCreated: true,
      orderUpdated: true,
      orderDelivered: true,
      lowStock: true,
      newMessage: true,
      systemAlerts: true,
      weeklyReport: false,
      monthlyReport: true,
      marketingEmails: false,
    });
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setHasChanges(false);
    toast.info("Modifications annulées");
  };

  const handleChangePassword = async () => {
    if (!securityForm.currentPassword || !securityForm.newPassword || !securityForm.confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (securityForm.newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    toast.success("Mot de passe modifié avec succès");
  };

  const handleToggle2FA = async () => {
    setSecurity2FA({ ...security2FA, enabled: !security2FA.enabled });
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success(security2FA.enabled ? "Authentification à deux facteurs désactivée" : "Authentification à deux facteurs activée");
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Paramètres</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gérez votre compte et vos préférences
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancelChanges}
                disabled={isSaving}
                className="border-slate-300 dark:border-slate-600"
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                onClick={handleSaveChanges}
                loading={isSaving}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all",
                        activeSection === section.id
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <section.icon className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        activeSection === section.id
                          ? "text-white dark:text-slate-900"
                          : "text-slate-500 dark:text-slate-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{section.label}</p>
                        <p className={cn(
                          "text-xs mt-0.5",
                          activeSection === section.id
                            ? "text-slate-200 dark:text-slate-700"
                            : "text-slate-500 dark:text-slate-500"
                        )}>
                          {section.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <User className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-900 dark:text-white">Informations du profil</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        Mettez à jour vos informations personnelles
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <UserAvatar
                        user={{ name: profileForm.name }}
                        size="xl"
                        className="h-20 w-20"
                      />
                      <button className="absolute -bottom-1 -right-1 p-2 bg-slate-900 dark:bg-slate-100 rounded-full hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg">
                        <Camera className="h-3.5 w-3.5 text-white dark:text-slate-900" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{profileForm.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{profileForm.position}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                        JPG, PNG ou GIF. Taille max: 2MB
                      </p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nom complet
                      </Label>
                      <Input
                        id="name"
                        value={profileForm.name}
                        onChange={(e) => handleUpdateField("profile", "name", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Poste
                      </Label>
                      <Input
                        id="position"
                        value={profileForm.position}
                        onChange={(e) => handleUpdateField("profile", "position", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => handleUpdateField("profile", "email", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => handleUpdateField("profile", "phone", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Company Section */}
            {activeSection === "company" && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Building2 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-900 dark:text-white">Informations de l'entreprise</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        Gérez les informations de votre entreprise
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="companyName" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Nom de l'entreprise
                      </Label>
                      <Input
                        id="companyName"
                        value={companyForm.name}
                        onChange={(e) => handleUpdateField("company", "name", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="siret" className="text-slate-700 dark:text-slate-300">
                        SIRET
                      </Label>
                      <Input
                        id="siret"
                        value={companyForm.siret}
                        onChange={(e) => handleUpdateField("company", "siret", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tva" className="text-slate-700 dark:text-slate-300">
                        N° TVA
                      </Label>
                      <Input
                        id="tva"
                        value={companyForm.tva}
                        onChange={(e) => handleUpdateField("company", "tva", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Adresse
                      </Label>
                      <Input
                        id="address"
                        value={companyForm.address}
                        onChange={(e) => handleUpdateField("company", "address", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-slate-700 dark:text-slate-300">
                        Ville
                      </Label>
                      <Input
                        id="city"
                        value={companyForm.city}
                        onChange={(e) => handleUpdateField("company", "city", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-slate-700 dark:text-slate-300">
                        Code postal
                      </Label>
                      <Input
                        id="postalCode"
                        value={companyForm.postalCode}
                        onChange={(e) => handleUpdateField("company", "postalCode", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Pays
                      </Label>
                      <Input
                        id="country"
                        value={companyForm.country}
                        onChange={(e) => handleUpdateField("company", "country", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Bell className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-900 dark:text-white">Préférences de notification</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        Choisissez les notifications que vous souhaitez recevoir
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(Object.keys(notifications) as Array<keyof typeof notifications>).map((key) => (
                    <ToggleSwitch
                      key={key}
                      checked={notifications[key]}
                      onChange={() => handleToggleNotification(key)}
                      label={notificationLabels[key].label}
                      description={notificationLabels[key].description}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <div className="space-y-6">
                {/* Change Password */}
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Lock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <CardTitle className="text-slate-900 dark:text-white">Changer le mot de passe</CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                          Mettez à jour votre mot de passe régulièrement
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Mot de passe actuel
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={securityForm.currentPassword}
                        onChange={(e) => handleUpdateField("security", "currentPassword", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">
                        Nouveau mot de passe
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={securityForm.newPassword}
                        onChange={(e) => handleUpdateField("security", "newPassword", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                        Confirmer le nouveau mot de passe
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={securityForm.confirmPassword}
                        onChange={(e) => handleUpdateField("security", "confirmPassword", e.target.value)}
                        className="border-slate-300 dark:border-slate-600 focus:border-slate-500 dark:focus:border-slate-400"
                      />
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      loading={isSaving}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Changer le mot de passe
                    </Button>
                  </CardContent>
                </Card>

                {/* Two-Factor Authentication */}
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Smartphone className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div>
                        <CardTitle className="text-slate-900 dark:text-white">Authentification à deux facteurs (2FA)</CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                          Ajoutez une couche de sécurité supplémentaire à votre compte
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            Authentification à deux facteurs
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {security2FA.enabled ? "Activée" : "Désactivée"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggle2FA}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900",
                          security2FA.enabled
                            ? "bg-slate-900 dark:bg-slate-100"
                            : "bg-slate-300 dark:bg-slate-600"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            security2FA.enabled ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>

                    {security2FA.enabled && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          Votre compte est protégé par l'authentification à deux facteurs.
                          Vous recevrez un code de vérification à chaque connexion.
                        </p>
                      </div>
                    )}

                    {/* Active Sessions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="font-medium text-slate-900 dark:text-white mb-3">Sessions actives</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                              <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">Chrome sur macOS</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">Paris, France - Actif maintenant</p>
                            </div>
                          </div>
                          <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Actuelle
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Integrations Section */}
            {activeSection === "integrations" && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Plug className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-900 dark:text-white">Intégrations et services</CardTitle>
                      <CardDescription className="text-slate-600 dark:text-slate-400">
                        Connectez FastGross Pro à vos outils préférés
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* SAGE Integration */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">SAGE 100</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Synchronisez vos données comptables avec SAGE
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Non connecté
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 dark:border-slate-600"
                      >
                        Connecter
                      </Button>
                    </div>
                  </div>

                  {/* Stripe Integration */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Stripe</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Gérez vos paiements en ligne
                        </p>
                        {integrations.stripe.lastSync && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            Dernière sync: {integrations.stripe.lastSync}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Connecté
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 dark:border-slate-600"
                      >
                        Configurer
                      </Button>
                    </div>
                  </div>

                  {/* Slack Integration */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                        <Bell className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Slack</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Recevez des notifications dans Slack
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Non connecté
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 dark:border-slate-600"
                      >
                        Connecter
                      </Button>
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Plug className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Webhooks</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Intégration personnalisée via API
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {integrations.webhook.enabled ? "Activé" : "Désactivé"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 dark:border-slate-600"
                      >
                        Configurer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
