import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
initializeApp()
export const db = getFirestore()

// Import and export all functions
export { scanWebsite } from './scanner/analyzeWebsite.js'
export { generateSequence } from './forgeur/generateSequence.js'
export { sendCampaignEmail, handleEmailWebhook } from './email/sendEmail.js'
export { generateReport } from './proof/generateReport.js'

// AutoPilot functions (Phase 4)
export { sendProspectEmail, testSmtpConnection } from './autopilot/sendProspectEmail.js'
export { dailyAutoPilot, runAutoPilotManual } from './autopilot/scheduler.js'
export { handleUnsubscribe, handleProspectEmailWebhook } from './autopilot/unsubscribe.js'

// Dev functions (only available in development/emulator)
export { seedData } from './dev/seedData.js'
