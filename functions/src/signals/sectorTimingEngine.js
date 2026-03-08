/**
 * sectorTimingEngine.js
 * Dimension 6 — Fenetres budgetaires par secteur NAF
 *
 * Determine si on est dans la fenetre budgetaire optimale pour ce secteur.
 * 100% statique, pas d'appel API.
 */

const SECTOR_WINDOWS = {
  '56': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre (intersaison)' },
  '55': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre (intersaison)' },
  '41': { months: [8, 9, 10], label: 'Septembre-Novembre (avant hiver, planification chantiers)' },
  '42': { months: [8, 9, 10], label: 'Septembre-Novembre' },
  '43': { months: [1, 2, 8, 9], label: 'Fevrier-Mars et Septembre-Octobre' },
  '49': { months: [0, 1, 9, 10], label: 'Janvier-Fevrier et Octobre-Novembre (budget logistique)' },
  '52': { months: [0, 1, 9, 10], label: 'Janvier-Fevrier et Octobre-Novembre' },
  '47': { months: [0, 1, 8], label: 'Janvier-Fevrier (apres fetes) et Septembre (rentree)' },
  '46': { months: [0, 1, 9, 10], label: 'Janvier-Fevrier et Octobre-Novembre' },
  '10': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre' },
  '11': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre' },
  '25': { months: [0, 1, 9, 10], label: 'Janvier-Fevrier et Octobre-Novembre' },
  '28': { months: [0, 1, 9, 10], label: 'Janvier-Fevrier et Octobre-Novembre' },
  '29': { months: [8, 9, 10], label: 'Septembre-Novembre (Mondial de l\'Auto, planification)' },
  '69': { months: [5, 6, 8, 9], label: 'Juin-Juillet et Septembre (apres clotures)' },
  '70': { months: [8, 9, 0, 1], label: 'Septembre-Octobre et Janvier-Fevrier' },
  '68': { months: [2, 3, 8, 9], label: 'Mars-Avril et Septembre-Octobre (rush immo)' },
  '86': { months: [0, 8, 9], label: 'Janvier et Septembre-Octobre (debut exercice)' },
  '87': { months: [0, 8, 9], label: 'Janvier et Septembre-Octobre' },
  '01': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre' },
  '62': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre (budget IT)' },
  '85': { months: [8, 9, 0, 1], label: 'Septembre-Octobre et Janvier-Fevrier' },
  '79': { months: [0, 1, 8], label: 'Janvier-Fevrier et Septembre (hors saison)' },
  'default': { months: [0, 1, 8, 9], label: 'Janvier-Fevrier et Septembre-Octobre' },
}

const MOIS_FR = ['Janvier','Fevrier','Mars','Avril','Mai','Juin',
                 'Juillet','Aout','Septembre','Octobre','Novembre','Decembre']

export async function getSectorTiming(lead) {
  const naf2 = (lead?.naf || lead?.codeNaf || '').slice(0, 2)
  const config = SECTOR_WINDOWS[naf2] || SECTOR_WINDOWS['default']

  const now = new Date()
  const currentMonth = now.getMonth()

  const isInOptimalWindow = config.months.includes(currentMonth)

  let nextWindowMonth = config.months.find(m => m > currentMonth)
  let nextWindowYear = now.getFullYear()
  if (nextWindowMonth === undefined) {
    nextWindowMonth = config.months[0]
    nextWindowYear++
  }

  const nextWindowDate = new Date(nextWindowYear, nextWindowMonth, 1)
  const daysUntilNext = Math.round((nextWindowDate - now) / (24 * 3600 * 1000))

  let recommendation = ''
  if (isInOptimalWindow) {
    const endOfMonth = new Date(now.getFullYear(), currentMonth + 1, 0)
    const daysLeft = Math.round((endOfMonth - now) / (24 * 3600 * 1000))
    recommendation = `Fenetre optimale active — contacter maintenant (encore ${daysLeft} jours)`
  } else {
    recommendation = `Prochaine fenetre : ${MOIS_FR[nextWindowMonth]} ${nextWindowYear} (dans ${daysUntilNext} jours)`
  }

  return {
    isInOptimalWindow,
    windowLabel: config.label,
    urgencyMultiplier: isInOptimalWindow ? 1.5 : 1.0,
    nextWindowMonth: MOIS_FR[nextWindowMonth],
    nextWindowYear,
    daysUntilNextWindow: daysUntilNext,
    recommendation,
    dScoreBonus: isInOptimalWindow ? 12 : 0,
    source: 'sector_timing',
  }
}
