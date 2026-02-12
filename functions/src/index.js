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
// Multichannel Infrastructure v5.0
// ============================================

// --- SMS (Twilio) ---
export { sendSMS, sendSMSBatch } from './channels/sms/sender.js'
export { smsStatusWebhook, smsInboundWebhook } from './channels/sms/webhooks.js'
export { createSMSTemplate, getSMSTemplates, validateSMSContent } from './channels/sms/templates.js'

// --- WhatsApp (Meta Cloud API) ---
export { sendWhatsApp, markAsRead } from './channels/whatsapp/sender.js'
export { isInSessionWindow, createSession } from './channels/whatsapp/sessionManager.js'
export { getApprovedTemplate, syncTemplatesFromMeta, submitTemplateForApproval } from './channels/whatsapp/templates.js'
export { checkWhatsAppAvailability, checkBatchAvailability } from './channels/whatsapp/reachability.js'

// --- Instagram (Meta Graph API) ---
export { sendInstagramDM, sendPrivateReply } from './channels/instagram/dmSender.js'
export { instagramWebhookVerify, instagramWebhookHandler } from './channels/instagram/webhookHandler.js'
export { processCommentTrigger, createCommentTrigger } from './channels/instagram/commentTrigger.js'

// --- Voicemail (Drop Cowboy) ---
export { sendVoicemailDrop, getDropStatus, cancelDrop } from './channels/voicemail/dropSender.js'
export { createVoiceClone, listVoices, getVoice, deleteVoice, previewTTS } from './channels/voicemail/voiceClone.js'
export { generateScript, generateScriptWithAI, createScriptTemplate, listScriptTemplates } from './channels/voicemail/scriptGenerator.js'
export { voicemailWebhook, recordInboundCall, getCallbackStats } from './channels/voicemail/callbackTracker.js'

// --- Postal (PostGrid) ---
export { sendLetter, sendPostcard, getMailStatus, cancelMail } from './channels/postal/mailSender.js'
export { validateAddress, validateAddressBatch, validateAndUpdateProspect, autocompleteAddress } from './channels/postal/addressValidator.js'
export { generatePostalHTML, createPostalTemplate, listPostalTemplates, previewTemplate } from './channels/postal/templateGenerator.js'
export { postalTrackingWebhook, postalDeliveryWebhook, createTrackingCode, createPURL, recordConversion, getTrackingStats } from './channels/postal/trackingManager.js'

// --- Unified Compliance Engine ---
export { canContactOnChannel, recordOptIn, recordOptOut, recordGlobalSuppression, recordTouchpoint, resetTouchpoints, getProspectComplianceStatus } from './compliance/unifiedOptManager.js'

// --- Channel Orchestration Engine ---
export { selectOptimalChannel, selectChannelsForSequence, recommendChannelStrategy, getChannelPerformanceStats } from './engine/channelRouter.js'
export { checkFallbackNeeded, executeFallback, scanPendingFallbacks, setFallbackRules, getFallbackStats, previewFallbackChain } from './engine/fallbackManager.js'
export { canAddTouchpoint, recordTouchpoint as recordTouchpointLimit, getTouchpointStatus, resetExpiredTouchpoints, setCustomLimits, getOrgTouchpointStats, simulateSequenceTouchpoints } from './engine/touchpointLimiter.js'

// ============================================
// Admin Functions (Super Admin / Beta Users)
// ============================================
export { checkFirstUser, getAdminStatus } from './admin/autoSuperAdmin.js'
export { addBetaUser, removeBetaUser, listBetaUsers, checkBetaStatus, listSuperAdmins } from './admin/betaUsers.js'
export { sendTestEmail, getTestEmailLogs, verifyResendConfig } from './admin/testEmail.js'

// ============================================
// Dev functions (only available in development/emulator)
// ============================================
export { seedData } from './dev/seedData.js'
