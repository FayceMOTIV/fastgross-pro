"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2, Star, Phone, Building2,
  ArrowRight, Loader2, ChevronRight, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackPageView, trackFormSubmit } from "@/services/tracking-service";

// Types
interface LandingPage {
  id: string;
  slug: string;
  title: string;
  headline: string;
  subheadline: string;
  heroImage?: string;
  benefits: string[];
  testimonial?: {
    quote: string;
    author: string;
    business: string;
    image?: string;
  };
  offer?: {
    title: string;
    description: string;
    discount?: string;
    code?: string;
  };
  form: {
    fields: ("name" | "email" | "phone" | "business" | "type")[];
    submitText: string;
    successMessage: string;
  };
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  stats: {
    views: number;
    conversions: number;
  };
}

// Landing page templates data
const LANDING_PAGES: Record<string, LandingPage> = {
  "offre-decouverte": {
    id: "lp_1",
    slug: "offre-decouverte",
    title: "Offre Découverte | DISTRAM",
    headline: "Économisez 15% sur vos achats alimentaires",
    subheadline: "Rejoignez +500 restaurateurs qui font confiance à DISTRAM pour leur approvisionnement",
    benefits: [
      "Livraison gratuite dès 200€ de commande",
      "Plus de 2000 références disponibles",
      "Conseiller dédié à votre secteur",
      "Paiement flexible jusqu'à 30 jours",
      "Service client 7j/7",
    ],
    testimonial: {
      quote: "Depuis que je travaille avec DISTRAM, j'ai réduit mes coûts de 12% tout en gagnant du temps sur mes commandes.",
      author: "Mehdi K.",
      business: "Istanbul Kebab, Marseille",
    },
    offer: {
      title: "Offre Découverte",
      description: "10% de réduction sur votre première commande",
      discount: "-10%",
      code: "BIENVENUE10",
    },
    form: {
      fields: ["name", "email", "phone", "business", "type"],
      submitText: "Recevoir mon offre",
      successMessage: "Merci ! Vous allez recevoir votre offre par email.",
    },
    theme: {
      primaryColor: "#16a34a",
      accentColor: "#f59e0b",
    },
    stats: { views: 2450, conversions: 186 },
  },
  "special-kebab": {
    id: "lp_2",
    slug: "special-kebab",
    title: "Offre Spéciale Kebab | DISTRAM",
    headline: "Tout pour votre kebab à prix grossiste",
    subheadline: "Viandes, pains pita, sauces et légumes frais livrés en 24h",
    benefits: [
      "Viande kebab premium certifiée halal",
      "Pain pita frais du jour",
      "Sauces maison en gros conditionnement",
      "Légumes frais livrés chaque matin",
      "Emballages et consommables inclus",
    ],
    testimonial: {
      quote: "La qualité de leur viande kebab est exceptionnelle. Mes clients voient la différence !",
      author: "Ali T.",
      business: "King Kebab, Nice",
    },
    offer: {
      title: "Pack Démarrage Kebab",
      description: "Tout le nécessaire pour 1 semaine d'activité",
      discount: "-15%",
      code: "KEBAB15",
    },
    form: {
      fields: ["name", "phone", "business"],
      submitText: "Demander un devis",
      successMessage: "Un conseiller vous contactera dans l'heure !",
    },
    theme: {
      primaryColor: "#dc2626",
      accentColor: "#fbbf24",
    },
    stats: { views: 1820, conversions: 142 },
  },
  "parrainage": {
    id: "lp_3",
    slug: "parrainage",
    title: "Programme Parrainage | DISTRAM",
    headline: "Parrainez un ami, gagnez 100€",
    subheadline: "Vous et votre filleul recevez chacun 100€ de crédit sur vos commandes",
    benefits: [
      "100€ de crédit pour vous",
      "100€ de crédit pour votre filleul",
      "Pas de limite de parrainages",
      "Crédit valable 6 mois",
      "Cumulable avec d'autres offres",
    ],
    offer: {
      title: "Double Bonus Parrainage",
      description: "Partagez le lien ci-dessous avec vos amis restaurateurs",
      discount: "100€",
    },
    form: {
      fields: ["name", "email", "phone"],
      submitText: "Obtenir mon lien de parrainage",
      successMessage: "Votre lien de parrainage a été envoyé par email !",
    },
    theme: {
      primaryColor: "#7c3aed",
      accentColor: "#06b6d4",
    },
    stats: { views: 980, conversions: 85 },
  },
  "salon-restauration": {
    id: "lp_4",
    slug: "salon-restauration",
    title: "Salon de la Restauration 2025 | DISTRAM",
    headline: "Rencontrez-nous au Salon Sirha !",
    subheadline: "Stand B42 - Offre exclusive salon : -20% sur votre 1ère commande",
    benefits: [
      "Démonstrations produits en direct",
      "Dégustations gratuites",
      "Conseils personnalisés",
      "Offre exclusive salon",
      "Cadeaux pour les visiteurs",
    ],
    offer: {
      title: "Offre Salon Exclusive",
      description: "20% de réduction pour les visiteurs du salon",
      discount: "-20%",
      code: "SIRHA2025",
    },
    form: {
      fields: ["name", "email", "business", "type"],
      submitText: "Prendre rendez-vous",
      successMessage: "Rendez-vous confirmé ! Nous vous attendons au stand B42.",
    },
    theme: {
      primaryColor: "#0891b2",
      accentColor: "#f97316",
    },
    stats: { views: 560, conversions: 48 },
  },
};

// Restaurant types for form
const RESTAURANT_TYPES = [
  { value: "kebab", label: "Kebab" },
  { value: "pizza", label: "Pizzeria" },
  { value: "fast-food", label: "Fast-food" },
  { value: "burger", label: "Burger" },
  { value: "tacos", label: "Tacos" },
  { value: "snack", label: "Snack" },
  { value: "restaurant", label: "Restaurant" },
  { value: "autre", label: "Autre" },
];

// Multi-step form component
function LeadForm({
  config,
  theme,
  onSubmit,
}: {
  config: LandingPage["form"];
  theme: LandingPage["theme"];
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const steps = config.fields.map((field) => {
    switch (field) {
      case "name":
        return { key: "name", label: "Votre nom", placeholder: "Jean Dupont", type: "text" };
      case "email":
        return { key: "email", label: "Votre email", placeholder: "jean@exemple.fr", type: "email" };
      case "phone":
        return { key: "phone", label: "Votre téléphone", placeholder: "06 12 34 56 78", type: "tel" };
      case "business":
        return { key: "business", label: "Nom de votre établissement", placeholder: "Mon Restaurant", type: "text" };
      case "type":
        return { key: "type", label: "Type d'établissement", placeholder: "", type: "select" };
      default:
        return { key: field, label: field, placeholder: "", type: "text" };
    }
  });

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsSubmitting(true);
      await new Promise((r) => setTimeout(r, 1500));
      setIsSubmitting(false);
      setIsSuccess(true);
      onSubmit(formData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && formData[currentStep.key]) {
      handleNext();
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: `${theme.primaryColor}20` }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: theme.primaryColor }} />
        </div>
        <h3 className="text-xl font-bold mb-2">Merci !</h3>
        <p className="text-muted-foreground">{config.successMessage}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Étape {step + 1} sur {steps.length}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: theme.primaryColor }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Current Field */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-3"
      >
        <label className="text-lg font-medium block">{currentStep.label}</label>

        {currentStep.type === "select" ? (
          <select
            value={formData[currentStep.key] || ""}
            onChange={(e) => setFormData({ ...formData, [currentStep.key]: e.target.value })}
            className="w-full px-4 py-3 border-2 rounded-xl text-lg focus:outline-none transition-colors"
            style={{ borderColor: formData[currentStep.key] ? theme.primaryColor : "#e5e7eb" }}
          >
            <option value="">Sélectionnez...</option>
            {RESTAURANT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={currentStep.type}
            value={formData[currentStep.key] || ""}
            onChange={(e) => setFormData({ ...formData, [currentStep.key]: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder={currentStep.placeholder}
            className="w-full px-4 py-3 border-2 rounded-xl text-lg focus:outline-none transition-colors"
            style={{ borderColor: formData[currentStep.key] ? theme.primaryColor : "#e5e7eb" }}
            autoFocus
          />
        )}
      </motion.div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1"
          >
            Retour
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!formData[currentStep.key] || isSubmitting}
          className="flex-1 text-white"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : step === steps.length - 1 ? (
            config.submitText
          ) : (
            <>
              Continuer
              <ChevronRight className="h-5 w-5 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function LandingPageClient({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [page, setPage] = useState<LandingPage | null>(null);

  useEffect(() => {
    // Load page data
    const pageData = LANDING_PAGES[slug];
    if (pageData) {
      setPage(pageData);
      // Track page view
      trackPageView(`/landing/${slug}`, document.referrer);
    }
  }, [slug]);

  const handleFormSubmit = (_data: Record<string, string>) => {
    // Track form submission
    trackFormSubmit(`landing_${slug}`, undefined, 0);
    // In production, send to CRM/email service
  };

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary-600" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="py-4 px-4 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold" style={{ color: page.theme.primaryColor }}>
            DISTRAM
          </div>
          <a
            href="tel:+33491000000"
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: page.theme.primaryColor }}
          >
            <Phone className="h-4 w-4" />
            04 91 00 00 00
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              {page.offer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                  style={{ backgroundColor: `${page.theme.accentColor}20`, color: page.theme.accentColor }}
                >
                  <Gift className="h-4 w-4" />
                  <span className="font-semibold">{page.offer.title}</span>
                  {page.offer.discount && (
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: page.theme.accentColor }}
                    >
                      {page.offer.discount}
                    </Badge>
                  )}
                </motion.div>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-bold mb-4 leading-tight"
              >
                {page.headline}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-muted-foreground mb-8"
              >
                {page.subheadline}
              </motion.p>

              {/* Benefits */}
              <motion.ul
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 mb-8"
              >
                {page.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2
                      className="h-5 w-5 mt-0.5 shrink-0"
                      style={{ color: page.theme.primaryColor }}
                    />
                    <span>{benefit}</span>
                  </li>
                ))}
              </motion.ul>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-4 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>4.8/5 sur 250 avis</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  <span>+500 clients</span>
                </div>
              </motion.div>
            </div>

            {/* Form Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-xl border-2" style={{ borderColor: `${page.theme.primaryColor}30` }}>
                <CardContent className="p-6">
                  {page.offer?.code && (
                    <div
                      className="mb-6 p-4 rounded-lg text-center"
                      style={{ backgroundColor: `${page.theme.primaryColor}10` }}
                    >
                      <p className="text-sm text-muted-foreground mb-1">Votre code promo</p>
                      <p
                        className="text-2xl font-bold tracking-wider"
                        style={{ color: page.theme.primaryColor }}
                      >
                        {page.offer.code}
                      </p>
                    </div>
                  )}

                  <LeadForm
                    config={page.form}
                    theme={page.theme}
                    onSubmit={handleFormSubmit}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      {page.testimonial && (
        <section className="py-12 px-4 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium mb-6 italic">
              &ldquo;{page.testimonial.quote}&rdquo;
            </blockquote>
            <div>
              <p className="font-semibold">{page.testimonial.author}</p>
              <p className="text-muted-foreground">{page.testimonial.business}</p>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section
        className="py-16 px-4 text-white text-center"
        style={{ backgroundColor: page.theme.primaryColor }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à optimiser vos achats ?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Rejoignez les +500 restaurateurs qui font confiance à DISTRAM
          </p>
          <Button
            size="lg"
            className="text-lg px-8"
            style={{ backgroundColor: page.theme.accentColor, color: "#000" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Commencer maintenant
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2025 DISTRAM by Face Media. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground">Accueil</Link>
            <a href="/portail" className="hover:text-foreground">Espace Client</a>
            <a href="mailto:contact@facemedia.fr" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
