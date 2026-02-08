import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
initializeApp()
export const db = getFirestore()

// ============================================
// Scanner Functions
// ============================================
export { scanWebsite } from './scanner/analyzeWebsite.js'

// ============================================
// Forgeur Functions
// ============================================
export { generateSequence } from './forgeur/generateSequence.js'

// ============================================
// Radar Functions (v4.0)
// ============================================
export { scoreLeads, getLeadInsights } from './radar/scoreLeads.js'

// ============================================
// Campaign Functions (v4.0)
// ============================================
export { processSequence, scheduledCampaignProcessor } from './campaigns/processSequence.js'

// ============================================
// Email Functions
// ============================================
export { sendCampaignEmail, handleEmailWebhook } from './email/sendEmail.js'

// ============================================
// Proof Functions
// ============================================
export { generateReport } from './proof/generateReport.js'

// ============================================
// AutoPilot functions (Phase 4)
// ============================================
export { sendProspectEmail, testSmtpConnection } from './autopilot/sendProspectEmail.js'
export { dailyAutoPilot, runAutoPilotManual } from './autopilot/scheduler.js'
export { handleUnsubscribe, handleProspectEmailWebhook } from './autopilot/unsubscribe.js'

// ============================================
// Usage & Quota Functions (v4.0)
// ============================================
export { resetMonthlyUsage, manualResetUsage } from './utils/resetUsage.js'

// ============================================
// Dev functions (only available in development/emulator)
// ============================================
export { seedData } from './dev/seedData.js'
