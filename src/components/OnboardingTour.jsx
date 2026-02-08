import { TourProvider, useTour } from '@reactour/tour'

const tourSteps = [
  {
    selector: '[data-tour="scanner"]',
    content:
      '🔍 Scanner — Analysez le site web de vos clients pour générer leur profil de prospection en 30 secondes.',
  },
  {
    selector: '[data-tour="forgeur"]',
    content:
      "✉️ Forgeur — Générez des séquences email personnalisées par l'IA. 4 tons disponibles : Expert, Amical, Challenger, Storyteller.",
  },
  {
    selector: '[data-tour="radar"]',
    content:
      '📡 Radar — Suivez vos leads en temps réel. Chaque interaction est scorée pour identifier les prospects les plus chauds.',
  },
  {
    selector: '[data-tour="proof"]',
    content:
      '📊 Proof — Générez des rapports de ROI automatiques pour prouver votre valeur à vos clients.',
  },
  {
    selector: '[data-tour="new-scan"]',
    content:
      "🚀 Commencez par scanner le site d'un de vos clients pour générer votre première séquence !",
  },
]

const tourStyles = {
  popover: (base) => ({
    ...base,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: '12px',
    border: '1px solid #3d3d4f',
    padding: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  }),
  maskArea: (base) => ({
    ...base,
    rx: 12,
  }),
  badge: (base) => ({
    ...base,
    backgroundColor: '#00d49a',
    color: '#0d0d1a',
    fontWeight: 'bold',
  }),
  controls: (base) => ({
    ...base,
    marginTop: '15px',
  }),
  close: (base) => ({
    ...base,
    color: '#6d6d8a',
    top: '12px',
    right: '12px',
  }),
  dot: (base, { current }) => ({
    ...base,
    backgroundColor: current ? '#00d49a' : '#3d3d4f',
  }),
  navigation: (base) => ({
    ...base,
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
  }),
}

export function OnboardingProvider({ children }) {
  return (
    <TourProvider
      steps={tourSteps}
      styles={tourStyles}
      showBadge={true}
      showCloseButton={true}
      showNavigation={true}
      showDots={true}
      scrollSmooth={true}
      onClickMask={({ setCurrentStep, currentStep, steps, setIsOpen }) => {
        if (currentStep === steps.length - 1) {
          setIsOpen(false)
        } else {
          setCurrentStep((s) => s + 1)
        }
      }}
    >
      {children}
    </TourProvider>
  )
}

export { useTour }
