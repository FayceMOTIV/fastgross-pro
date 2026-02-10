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
// Prospect Engine (v4.0 - Core automation)
// ============================================
export { prospectEngine, refreshProspects } from './engine/prospectEngine.js'

// ============================================
// Email Infrastructure (Apollo/Instantly level)
// ============================================
export { verifyEmailBeforeSend, verifyEmailsBatch } from './email/verifier.js'
export { getNextSendingInbox, incrementInboxSentCount, getInboxesStats } from './email/inboxRotation.js'
export { getWarmupStatus, getWarmupOverview, enableWarmup, disableWarmup } from './email/warmup.js'
export { verifyDNSConfiguration, generateDNSRecords, getDomainReputationScore } from './email/deliverability.js'

// ============================================
// Advanced Engine Modules (Apollo/Instantly level)
// ============================================
// Note: These are internal modules, called by prospectEngine
// Exports for potential direct use or testing
export { enrichProspect, enrichProspectsBatch } from './engine/enrichment.js'
export { detectBuyingSignals, sortProspectsByIntent } from './engine/intentSignals.js'
export { advancedScoring, scoreAndSortProspects, getScoringStats } from './engine/advancedScoring.js'
export { generateExpertSequence, generateABVariants } from './engine/sequenceGenerator.js'
export { getOptimalSendTime, calculateNextSendDate, getSendTimeStats } from './engine/sendTimeOptimizer.js'
export { classifyReply, executeReplyActions, getReplyClassificationStats, REPLY_CATEGORIES } from './engine/replyClassifier.js'
export { canSendTo, addToSuppressionList, processUnsubscribe, getComplianceStats, generateRGPDFooter } from './engine/compliance.js'
export { createABTest, selectVariant, recordEvent, getActiveTests, getTestHistory } from './engine/abTesting.js'

// ============================================
// Dev functions (only available in development/emulator)
// ============================================
export { seedData } from './dev/seedData.js'
