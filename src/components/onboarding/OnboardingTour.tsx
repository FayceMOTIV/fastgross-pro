'use client';

/**
 * Système d'onboarding interactif avec react-joyride
 */

import { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';

// ============================================
// TYPES
// ============================================

export type TourType =
  | 'commercial'      // Tour pour les commerciaux
  | 'manager'         // Tour pour les managers
  | 'scan-menu'       // Tour spécifique Scan Menu
  | 'devis'           // Tour création devis
  | 'portail-client'; // Tour portail client B2B

interface OnboardingTourProps {
  tourType: TourType;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
}

// ============================================
// STEPS PAR TYPE DE TOUR
// ============================================

const TOUR_STEPS: Record<TourType, Step[]> = {
  commercial: [
    {
      target: '[data-tour="sidebar"]',
      content: 'Bienvenue chez DISTRAM ! Voici votre menu principal pour naviguer.',
      disableBeacon: true,
      placement: 'right',
    },
    {
      target: '[data-tour="scan-menu"]',
      content: 'Notre killer feature ! Photographiez un menu restaurant et obtenez un devis en 30 secondes.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="clients"]',
      content: 'Gérez vos 300+ clients restaurants avec le CRM intégré.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="commandes"]',
      content: 'Suivez toutes vos commandes en temps réel.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="chat-ia"]',
      content: 'Besoin d\'aide ? Notre assistant IA DISTRAM est là pour vous.',
      placement: 'left',
    },
  ],

  manager: [
    {
      target: '[data-tour="dashboard"]',
      content: 'Bienvenue Manager ! Voici votre tableau de bord avec les KPIs multi-dépôts.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="stats-ca"]',
      content: 'Le chiffre d\'affaires en temps réel de vos 3 dépôts.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="equipe"]',
      content: 'Suivez les performances de vos 6 commerciaux.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="validations"]',
      content: 'Les demandes en attente de votre validation (remises, crédits).',
      placement: 'bottom',
    },
  ],

  'scan-menu': [
    {
      target: '[data-tour="upload-zone"]',
      content: 'Cliquez ici pour photographier ou uploader le menu d\'un restaurant.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="analyze-btn"]',
      content: 'Lancez l\'analyse GPT-4o Vision. L\'IA détecte tous les plats en 30 secondes.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="results"]',
      content: 'Résultats de l\'analyse : plats détectés, type de restaurant, produits recommandés.',
      placement: 'left',
    },
    {
      target: '[data-tour="create-devis"]',
      content: 'Générez le devis personnalisé en un clic !',
      placement: 'top',
    },
  ],

  devis: [
    {
      target: '[data-tour="client-info"]',
      content: 'Renseignez les informations du client restaurant.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="produits"]',
      content: 'Ajoutez ou modifiez les produits du devis.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="totaux"]',
      content: 'Les totaux sont calculés automatiquement avec TVA.',
      placement: 'left',
    },
    {
      target: '[data-tour="send-email"]',
      content: 'Envoyez le devis par email au client en un clic !',
      placement: 'top',
    },
  ],

  'portail-client': [
    {
      target: '[data-tour="catalogue"]',
      content: 'Parcourez notre catalogue de 98 produits halal.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="panier"]',
      content: 'Ajoutez les produits à votre panier.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="commandes"]',
      content: 'Suivez l\'historique de vos commandes.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="factures"]',
      content: 'Téléchargez vos factures en PDF.',
      placement: 'bottom',
    },
  ],
};

// ============================================
// STYLES JOYRIDE
// ============================================

const joyrideStyles = {
  options: {
    primaryColor: '#ea580c', // Orange DISTRAM
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    spotlightShadow: '0 0 25px rgba(234, 88, 12, 0.5)',
    beaconSize: 36,
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 12,
    padding: 20,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 10,
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.6,
  },
  buttonNext: {
    backgroundColor: '#ea580c',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
  },
  buttonBack: {
    color: '#6b7280',
    marginRight: 10,
  },
  buttonSkip: {
    color: '#9ca3af',
    fontSize: 13,
  },
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function OnboardingTour({
  tourType,
  onComplete,
  onSkip,
  autoStart = true,
}: OnboardingTourProps) {
  // const _router = useRouter();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = TOUR_STEPS[tourType];
  const storageKey = `onboarding_${tourType}_completed`;

  useEffect(() => {
    // Vérifier si le tour a déjà été complété
    const completed = localStorage.getItem(storageKey);
    if (!completed && autoStart) {
      // Petit délai pour laisser la page se charger
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, storageKey]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    // Mise à jour de l'index
    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + 1);
    }

    // Tour terminé
    if (status === STATUS.FINISHED) {
      localStorage.setItem(storageKey, 'true');
      setRun(false);
      onComplete?.();
    }

    // Tour skippé
    if (status === STATUS.SKIPPED) {
      localStorage.setItem(storageKey, 'skipped');
      setRun(false);
      onSkip?.();
    }
  };

  // Ne pas rendre si pas de steps
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      locale={{
        back: 'Précédent',
        close: 'Fermer',
        last: 'Terminer',
        next: 'Suivant',
        skip: 'Passer',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}

// ============================================
// HOOK POUR CONTRÔLER LE TOUR
// ============================================

export function useOnboarding(tourType: TourType) {
  const storageKey = `onboarding_${tourType}_completed`;

  const isCompleted = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(storageKey) !== null;
  };

  const reset = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
  };

  const markCompleted = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, 'true');
  };

  return {
    isCompleted: isCompleted(),
    reset,
    markCompleted,
  };
}

// ============================================
// COMPOSANT BOUTON "AIDE"
// ============================================

export function StartTourButton({
  tourType,
  className,
}: {
  tourType: TourType;
  className?: string;
}) {
  const { reset } = useOnboarding(tourType);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showTour, setShowTour] = useState(false);

  const handleClick = () => {
    reset();
    setShowTour(true);
    // Forcer le rechargement pour relancer le tour
    window.location.reload();
  };

  return (
    <button
      onClick={handleClick}
      className={`text-sm text-gray-500 hover:text-orange-600 transition-colors ${className}`}
    >
      Relancer le tutoriel
    </button>
  );
}
