"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  User,
  Phone,
  Building2,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { registerUser, UserRole } from "@/services/firebase/auth";

const ROLES: { value: UserRole; label: string; description: string; icon: string }[] = [
  { value: "commercial", label: "Commercial", description: "Gestion clients et commandes", icon: "C" },
  { value: "livreur", label: "Livreur", description: "Livraisons et tournées", icon: "L" },
  { value: "client", label: "Client", description: "Portail de commande", icon: "R" },
];

const DEPOTS = [
  { value: "lyon", label: "Lyon (Siège)" },
  { value: "montpellier", label: "Montpellier" },
  { value: "bordeaux", label: "Bordeaux" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "commercial" as UserRole,
    depot: "lyon",
    company: "DISTRAM",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return "Le prénom est requis";
    if (!formData.lastName.trim()) return "Le nom est requis";
    if (!formData.email.trim()) return "L'email est requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Email invalide";
    if (formData.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
    if (formData.password !== formData.confirmPassword) return "Les mots de passe ne correspondent pas";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await registerUser(formData.email, formData.password, {
        displayName: `${formData.firstName} ${formData.lastName}`,
        role: formData.role,
        depot: formData.depot,
        telephone: formData.phone,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("email-already-in-use")) {
          setError("Cet email est déjà utilisé");
        } else if (err.message.includes("weak-password")) {
          setError("Mot de passe trop faible");
        } else {
          setError(err.message);
        }
      } else {
        setError("Erreur lors de l'inscription");
      }
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Compte créé !</h2>
          <p className="text-white/60 mb-6">Redirection vers la connexion...</p>
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f] overflow-hidden">
      {/* Animated Background */}
      <div
        className="fixed inset-0 opacity-30 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.15), transparent 40%)`,
        }}
      />

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBoLTQweiIvPjxwYXRoIGQ9Ik00MCAwdjQwSDBWMGg0MHpNMSAxdjM4aDM4VjFIMXoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L2c+PC9zdmc+')] opacity-50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-violet-500/30">
              D
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">DISTRAM</h1>
              <p className="text-violet-400 text-sm font-medium">by Face Media</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                Rejoignez
                <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  l&apos;équipe
                </span>
              </h2>
              <p className="text-lg text-white/60 mt-4 max-w-md leading-relaxed">
                Créez votre compte et accédez à tous les outils pour optimiser votre activité.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                { icon: "📦", text: "Gestion des commandes simplifiée" },
                { icon: "🚚", text: "Suivi des livraisons en temps réel" },
                { icon: "📊", text: "Analytics et reporting avancés" },
                { icon: "🤖", text: "IA pour optimiser vos ventes" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white/70">
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/40">
            Déjà client DISTRAM ? Contactez votre commercial pour obtenir vos accès.
          </p>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center p-8 relative">
        {/* Background for mobile */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-violet-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] bg-blue-600/20 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-lg relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center font-black text-xl text-white shadow-lg">
              D
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">DISTRAM</h1>
              <p className="text-violet-400 text-xs">by Face Media</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-violet-300">Nouveau compte</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2">
              Créer un compte
            </h2>
            <p className="text-white/50">
              Remplissez les informations ci-dessous
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Prénom</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/30" />
                  </div>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="Hamza"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Nom</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="Benali"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="vous@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Téléphone (optionnel)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-white/30" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="06 12 34 56 78"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Votre rôle</label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => updateField("role", role.value)}
                    className={cn(
                      "p-3 rounded-xl border transition-all text-left",
                      formData.role === role.value
                        ? "bg-violet-500/20 border-violet-500/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                    disabled={isLoading}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mb-2",
                      formData.role === role.value
                        ? "bg-violet-500 text-white"
                        : "bg-white/10 text-white/60"
                    )}>
                      {role.icon}
                    </div>
                    <p className="font-medium text-white text-sm">{role.label}</p>
                    <p className="text-xs text-white/40">{role.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Depot Selection (for commercial/livreur) */}
            {(formData.role === "commercial" || formData.role === "livreur") && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Dépôt</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-white/30" />
                  </div>
                  <select
                    value={formData.depot}
                    onChange={(e) => updateField("depot", e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all appearance-none"
                    disabled={isLoading}
                  >
                    {DEPOTS.map((depot) => (
                      <option key={depot.value} value={depot.value} className="bg-gray-900">
                        {depot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Password Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/30" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Confirmer</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <p className="text-xs text-white/40 -mt-2">Minimum 8 caractères</p>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-white/40">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Se connecter
              </Link>
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/30">
            <Link href="/" className="hover:text-white/50 transition-colors">Accueil</Link>
            <span>•</span>
            <Link href="/portail" className="hover:text-white/50 transition-colors">Portail B2B</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
