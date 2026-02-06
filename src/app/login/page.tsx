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
  Truck,
  Users,
  BarChart3,
  Shield,
  CheckCircle2,
  Zap,
  Star,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const DEMO_CREDENTIALS = {
  admin: { email: "admin@distram.fr", password: "Demo2024!", role: "Administrateur", redirect: "/" },
  commercial: { email: "commercial@distram.fr", password: "Demo2024!", role: "Commercial", redirect: "/commercial" },
  livreur: { email: "livreur@distram.fr", password: "Demo2024!", role: "Livreur", redirect: "/livreur" },
  client: { email: "kebab.istanbul@test.fr", password: "Demo2024!", role: "Client", redirect: "/portail" },
};

const FEATURES = [
  { icon: Truck, label: "Livraison optimisée", description: "Tournées IA" },
  { icon: Users, label: "Gestion clients", description: "CRM intégré" },
  { icon: BarChart3, label: "Analytics", description: "Temps réel" },
  { icon: Shield, label: "Sécurisé", description: "Chiffré E2E" },
];

const TESTIMONIALS = [
  { quote: "DISTRAM a transformé notre logistique", author: "Mohamed B.", role: "CEO" },
  { quote: "ROI visible dès le premier mois", author: "Sophie M.", role: "Directrice" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error: authError, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath =
        user.role === 'admin' ? '/' :
        user.role === 'commercial' ? '/commercial' :
        user.role === 'livreur' ? '/livreur' :
        user.role === 'client' ? '/portail' : '/';
      router.push(redirectPath);
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      // Redirect is handled by useAuth hook
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Erreur de connexion");
      }
    }
  };

  const handleQuickLogin = (type: keyof typeof DEMO_CREDENTIALS) => {
    const cred = DEMO_CREDENTIALS[type];
    setEmail(cred.email);
    setPassword(cred.password);
  };

  const displayError = error || authError;

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
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBoLTQweiIvPjxwYXRoIGQ9Ik00MCAwdjQwSDBWMGg0MHpNMSAxdjM4aDM4VjFIMXoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L2c+PC9zdmc+')] opacity-50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
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
          <div className="space-y-12">
            <div>
              <h2 className="text-5xl xl:text-6xl font-black text-white leading-tight">
                La distribution
                <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                  réinventée.
                </span>
              </h2>
              <p className="text-xl text-white/60 mt-6 max-w-lg leading-relaxed">
                Gérez vos commandes, optimisez vos livraisons et boostez votre chiffre d&apos;affaires avec une plateforme tout-en-un.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((feature, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl backdrop-blur-sm transition-all duration-300 cursor-default"
                >
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 group-hover:from-violet-500/30 group-hover:to-purple-500/30 transition-colors">
                    <feature.icon className="h-6 w-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{feature.label}</p>
                    <p className="text-sm text-white/50">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full" />
              <div className="pl-6">
                <p className="text-xl text-white/80 italic mb-4">
                  &ldquo;{TESTIMONIALS[activeTestimonial].quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                    {TESTIMONIALS[activeTestimonial].author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{TESTIMONIALS[activeTestimonial].author}</p>
                    <p className="text-sm text-white/50">{TESTIMONIALS[activeTestimonial].role}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
              {/* Dots */}
              <div className="flex gap-2 mt-6 pl-6">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === activeTestimonial ? "w-8 bg-violet-500" : "bg-white/20 hover:bg-white/40"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            {[
              { value: "300+", label: "Clients" },
              { value: "15K", label: "Livraisons/mois" },
              { value: "98%", label: "Satisfaction" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-black text-white">{stat.value}</p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 right-12 animate-[float_6s_ease-in-out_infinite]">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <p className="text-xs text-white/70">Livraison terminée</p>
                <p className="font-bold">Kebab Istanbul</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-1/3 right-24 animate-[float_6s_ease-in-out_infinite]" style={{ animationDelay: "2s" }}>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-4 rounded-2xl shadow-2xl shadow-blue-500/30">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6" />
              <div>
                <p className="text-xs text-white/70">Nouvelle commande</p>
                <p className="font-bold">+€847.50</p>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 relative">
        {/* Background for mobile */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-violet-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] bg-blue-600/20 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center font-black text-xl text-white shadow-lg">
              D
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">DISTRAM</h1>
              <p className="text-violet-400 text-xs">by Face Media</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center lg:text-left mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-violet-300">Bienvenue</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-2">
              Connexion
            </h2>
            <p className="text-white/50">
              Accédez à votre espace DISTRAM
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {displayError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                <div className="p-1 bg-rose-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                </div>
                {displayError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-white/30" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="vous@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/30" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50" />
                <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">Se souvenir de moi</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Demo Access */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#0a0a0f] text-white/40">Accès démo rapide</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleQuickLogin(key as keyof typeof DEMO_CREDENTIALS)}
                  disabled={loading}
                  className="group flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 rounded-xl transition-all disabled:opacity-50"
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm",
                    key === "admin" ? "bg-gradient-to-br from-violet-500 to-purple-600" :
                    key === "commercial" ? "bg-gradient-to-br from-blue-500 to-indigo-600" :
                    key === "livreur" ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                    "bg-gradient-to-br from-amber-500 to-orange-600"
                  )}>
                    {cred.role.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white text-sm group-hover:text-violet-300 transition-colors">
                      {cred.role}
                    </p>
                    <p className="text-xs text-white/40">{cred.email.split("@")[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-sm text-white/40">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Créer un compte
              </Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/30">
            <Link href="/" className="hover:text-white/50 transition-colors">Accueil</Link>
            <span>•</span>
            <a href="/portail" className="hover:text-white/50 transition-colors">Portail B2B</a>
            <span>•</span>
            <a href="mailto:support@facemedia.fr" className="hover:text-white/50 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
