import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
initializeApp()
export const db = getFirestore()

// ============================================
// Scanner Functions
// ============================================
export { scanWebsite } from './scanner/analyzeWebsite.js'

// Scanner — Prospect digital audit + scalability
export { runProspectScan, monitorCTLogs, monitorFranceTravail, monitorSubventions, runSeasonalityCheck, pixelTracker, enqueueScan, processScanTask, resetMonthlyQuotas, resetDailyQuotas, dailyScanReport } from './scanner/index.js'

// Niche Config — Universal sector targeting
export { updateNicheConfig, getNicheConfig } from './alex/engine/nicheConfig.js'

// Reacteur Nucleaire — Intelligent prospect search engine
export { learnFromProspectOutcome } from './alex/engine/learningTrigger.js'

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

// --- Daily Digest Engine ---
export { dailyDigestCron, generateDailyDigest, getDigestHistory } from './campaigns/dailyDigestEngine.js'

// --- Dry Run Engine ---
export { runDryRun, getDryRunHistory } from './campaigns/dryRunEngine.js'
export { analyzeProspectProfile } from './campaigns/profileAnalyzer.js'

// --- ICP Engine (Campaign Wizard) ---
export { clarifyICP, generateCampaignStrategy, estimateProspects } from './campaigns/icpEngine.js'

// --- Conversation Engine (Reply Classification) ---
export { classifyReply as classifyCampaignReply, handleIncomingReply as handleCampaignReply } from './campaigns/conversationEngine.js'

// ============================================
// CRM Manager (Pipeline CRUD)
// ============================================
export { getProspectsPage, moveProspect, addInternalNote, sendManualMessage as sendCrmManualMessage, exportProspectsCSV, deleteProspectGDPR } from './crm/crmManager.js'

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
export { sendWhatsAppToProspect } from './autopilot/sendWhatsAppToProspect.js'

// ============================================
// Revolutionary AutoPilot Engine
// ============================================
export {
  generateAutoPilotPreview,
  launchAutoPilot,
  sendAutoPilotMessage,
  scheduleMeetingWithProspect,
  getAutoPilotDashboardStats,
  toggleAutoPilot
} from './autopilot/autoPilotEngine.js'

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

// --- SMS (BudgetSMS + OVH Telecom) ---
export { sendSMS, sendSMSBatch, sendSMSOvh, sendSMSBatchOvh, checkSMSCredits, createSMSTemplate, getSMSTemplates, validateSMSContent } from './channels/sms/smsCallable.js'
export { smsStatusWebhook, smsInboundWebhook } from './channels/sms/webhooks.js'

// --- WhatsApp (Evolution API Multi-Tenant + Meta Cloud API) ---
export { sendWhatsApp, markAsRead, isInSessionWindow, createSession, getApprovedTemplate, syncTemplatesFromMeta, submitTemplateForApproval, checkWhatsAppAvailability, checkBatchAvailability, createWhatsAppInstance, getWhatsAppQRCode, getWhatsAppConnectionStatus, disconnectWhatsApp } from './channels/whatsapp/whatsappCallable.js'
export { evolutionWebhookHandler as evolutionWebhook } from './channels/whatsapp/evolutionWebhook.js'
export { retryFailedWhatsApp } from './channels/whatsapp/retryFailedWhatsApp.js'

// --- Instagram (Meta Graph API) ---
export { sendInstagramDM, sendPrivateReply, processCommentTrigger, createCommentTrigger } from './channels/instagram/instagramCallable.js'
export { instagramWebhookVerify, instagramWebhookHandler } from './channels/instagram/webhookHandler.js'

// --- Voicemail (Drop Cowboy) ---
export { sendVoicemailDrop, getDropStatus, cancelDrop, createVoiceClone, listVoices, getVoice, deleteVoice, previewTTS, generateScript, generateScriptWithAI, createScriptTemplate, listScriptTemplates } from './channels/voicemail/voicemailCallable.js'
export { voicemailWebhook } from './channels/voicemail/callbackTracker.js'

// --- Postal (PostGrid + Merci Facteur) ---
export { sendLetter, sendPostcard, getMailStatus, cancelMail, validateAddress, validateAddressBatch, validateAndUpdateProspect, autocompleteAddress, generatePostalHTML, createPostalTemplate, listPostalTemplates, previewTemplate, createTrackingCode, createPURL, recordConversion, getTrackingStats, sendLetterMF, sendRegisteredLetterMF, getMailStatusMF, cancelMailMF, estimateCostMF, handleMFWebhook } from './channels/postal/postalCallable.js'
export { postalTrackingWebhook, postalDeliveryWebhook } from './channels/postal/trackingManager.js'

// --- Unified Compliance Engine ---
export { canContactOnChannel, recordOptIn, recordOptOut, recordGlobalSuppression, recordTouchpoint, resetTouchpoints, getProspectComplianceStatus } from './compliance/unifiedOptManager.js'

// --- Channel Orchestration Engine ---
export { selectOptimalChannel, selectChannelsForSequence, recommendChannelStrategy, getChannelPerformanceStats } from './engine/channelRouter.js'
export { checkFallbackNeeded, executeFallback, scanPendingFallbacks, setFallbackRules, getFallbackStats, previewFallbackChain } from './engine/fallbackManager.js'
export { canAddTouchpoint, recordTouchpoint as recordTouchpointLimit, getTouchpointStatus, resetExpiredTouchpoints, setCustomLimits, getOrgTouchpointStats, simulateSequenceTouchpoints } from './engine/touchpointLimiter.js'

// --- Unified Channel Dispatcher ---
export { dispatchMessage, dispatchBatch, getDispatchStats, getSupportedChannels } from './engine/channelDispatcher.js'

// --- Channel Monitoring Dashboard ---
export { getChannelDashboard, checkAndCreateAlerts, getChannelHistory, resolveAlert } from './engine/channelMonitoring.js'

// ============================================
// Admin Functions (Super Admin / Beta Users)
// ============================================
export { checkFirstUser, getAdminStatus } from './admin/autoSuperAdmin.js'
export { addBetaUser, removeBetaUser, listBetaUsers, checkBetaStatus, listSuperAdmins } from './admin/betaUsers.js'
export { sendTestEmail, getTestEmailLogs, verifyEmailConfig } from './admin/testEmail.js'

// ============================================
// Hunter Agent V2 (Instagram + TikTok + Email)
// ============================================

// --- Instagram Hunter ---
export { instagramHunter, runInstagramHunterManual, getHunterStats } from './hunters/instagram/instagramHunter.js'
export { instagramDmSender, sendManualDM, getDMStats } from './hunters/instagram/instagramDmSender.js'

// --- Instagram Multi-Account DM Sender ---
export {
  multiAccountDmSender,
  resetHourlyCounts,
  resetDailyCounts,
  addInstagramAccount,
  removeInstagramAccount,
  listInstagramAccounts,
  updateAccountStatus
} from './hunters/instagram/multiAccountDmSender.js'

// --- TikTok Hunter ---
export { tiktokHunter, runTikTokHunterManual, getTikTokHunterStats } from './hunters/tiktok/tiktokHunter.js'

// --- Email Sequence Sender ---
export {
  emailSequenceSender,
  createEmailSequence,
  startEmailCampaign,
  listEmailSequences,
  getEmailCampaignStats,
  trackEmailOpen
} from './hunters/email/emailSequenceSender.js'

// --- Facebook Hunter ---
export { facebookHunter, runFacebookHunterManual, getFacebookHunterStats } from './hunters/facebook/facebookHunter.js'

// --- Google Maps Hunter ---
export { googleMapsHunter, runGoogleMapsHunterManual, getGoogleMapsHunterStats, runGoogleMapsSourcingManual } from './hunters/googlemaps/googleMapsHunter.js'

// --- LinkedIn Hunter (HeyReach + Apify) ---
export { linkedinHunter, runLinkedInHunterManual, getLinkedInHunterStats, syncLinkedInInbox, addLinkedInAccount, removeLinkedInAccount } from './hunters/linkedin/linkedinHunter.js'

// --- PhantomBuster Hunter ---
export { runPhantomScrape, listPhantoms } from './hunters/phantom/phantomHunter.js'

// --- WhatsApp Hunter (Evolution API - Free) ---
export { whatsappChecker, checkWhatsAppManual } from './hunters/whatsapp/whatsappChecker.js'
export { whatsappSender, sendWhatsAppManual, getWhatsAppStats } from './hunters/whatsapp/whatsappSender.js'

// --- New Domain Hunter (Alex V4 Module 1) ---
export { newDomainHunter, runNewDomainHunterManual, getNewDomainHunterStats } from './hunters/domains/newDomainHunter.js'

// --- Reddit Intent Hunter (Alex V4 Module 3) ---
export { redditIntentHunter, runRedditIntentHunterManual, getRedditIntentHunterStats } from './hunters/reddit/redditIntentHunter.js'

// --- Tech Stack Hunter (Alex V4 Module 4) ---
export { techStackHunter, runTechStackHunterManual, getTechStackHunterStats } from './hunters/techstack/techStackHunter.js'

// --- Google Maps Review Miner (Alex V4 Module 5) ---
export { googleMapsReviewMiner, runGoogleMapsReviewMinerManual, getGoogleMapsReviewMinerStats } from './hunters/googlemaps/googleMapsReviewMiner.js'

// --- Signal-Based Email (Alex V4 Super Pouvoir 1) ---
export { generateSignalEmail } from './outreach/signalEmail.js'

// --- Prospect Scorer (Alex V4 Scoring Engine) ---
export { scoreProspects } from './outreach/prospectScorer.js'

// --- Sniper Follow-Up Sequence (Alex V4 Super Pouvoir 9) ---
export { createSniperSequence, sniperSequenceWorker, pauseSniperSequence, getSniperSequenceStatus } from './outreach/sniperSequence.js'

// --- Qualification Bot IA (Alex V4 Systeme 1) ---
export { classifyAndRespond } from './outreach/qualificationBot.js'

// --- Job Postings Hunter (Alex V4 Module 2) ---
export { jobPostingsHunter, runJobPostingsHunterManual, getJobPostingsHunterStats } from './hunters/jobs/jobPostingsHunter.js'

// --- AI Crawler Audit (Alex V4 Module 9 SHIELD) ---
export { runAiCrawlerAudit } from './shield/aiCrawlerAudit.js'

// --- llms.txt Generator (Alex V4 Module 7 SHIELD) ---
export { generateLlmsTxt } from './shield/llmsTxtGenerator.js'

// --- Citability Score (Alex V4 Module 10 SHIELD) ---
export { calculateCitability } from './shield/citabilityScore.js'

// --- EAV-E Content Rewriter (Alex V4 Module 8 SHIELD) ---
export { rewriteContent } from './shield/eaveRewriter.js'

// --- Nurturing Perpetuel (Alex V4 Systeme 2) ---
export { enrollInNurturing, getNurturingStatus, toggleNurturing, nurturingWorker } from './outreach/nurturingEngine.js'

// --- Social Proof Engine (Alex V4 Systeme 3) ---
export { matchSocialProof, addCaseStudy, getSocialProofStats } from './outreach/socialProofEngine.js'

// --- Booking Automatise (Alex V4 Systeme 4) ---
export { createBooking, generatePreCallBrief, updateBookingOutcome, bookingReminderWorker } from './outreach/bookingEngine.js'

// --- Agent Fantome Reddit (Alex V4 Super Pouvoir 4) ---
export { findRedditOpportunities, generateRedditDraft, reviewRedditDraft, listRedditDrafts, redditDraftCleanup } from './outreach/redditGhostAgent.js'

// --- Micro-Gift Digital (Alex V4 Super Pouvoir 7) ---
export { generateMicroGift, listMicroGifts, getMicroGiftTypes } from './outreach/microGiftGenerator.js'

// --- Social Warming (Alex V4 Super Pouvoir 8) ---
export { enrollInSocialWarming, getSocialWarmingStatus, cancelSocialWarming, socialWarmingWorker } from './outreach/socialWarming.js'

// --- Timing Predictif (Alex V4 Super Pouvoir 10) ---
export { predictOptimalTiming, recordTimingFeedback, getTimingAnalytics } from './outreach/timingPredictor.js'

// --- Video Personnalisee IA (Alex V4 Super Pouvoir 2) ---
export { generatePersonalizedVideoFn, getVideoStatusFn } from './superPowers/personalizedVideoFunction.js'

// --- Wikidata Entity Creator (Alex V4 Module 6 SHIELD) ---
export { checkWikidataEntity, generateWikidataEntity, getWikidataStats } from './shield/wikidataEntityCreator.js'

// --- Social Hunter Orchestrator (Cross-Platform) ---
export { runSocialHuntingCampaign, getOrchestrationStatus, deduplicateProspects } from './hunters/socialHunterOrchestrator.js'

// ============================================
// AI Personalization (Multi-Provider System)
// ============================================
export { personalizeMessage, getAIStatus } from './ai/personalizeMessage.js'

// ============================================
// Email Enrichment (Derrick > Apollo > Hunter > Dropcontact > BetterContact Waterfall)
// ============================================
export { enrichEmail, enrichEmailsBatch, getEnrichmentStatus } from './enrichment/enrichEmail.js'

// ============================================
// Company Enrichment (Pappers.fr — 10k fiches/mois free)
// ============================================
export { enrichCompanyPappers, getPappersQuota } from './enrichment/pappersEnricher.js'

// ============================================
// Email Verification (NeverBounce SMTP-level)
// ============================================
export { verifyEmailNB, getNeverBounceCredits } from './enrichment/neverBounceVerifier.js'

// ============================================
// Multi-Platform Posting (Postiz > Late API)
// ============================================
export { createMultiPlatformPost, getPostStatus, cancelPost, getPostingStatus } from './posting/createPost.js'

// ============================================
// Orchestrator (Master Scheduler + War Room)
// ============================================
export { masterScheduler, runMasterSchedulerManual, dailyBudgetManager, replyAggregator } from './orchestrator/masterScheduler.js'
export { getWarRoomStats, getWarRoomOrgList, toggleOrgProspection, emergencyPauseAll } from './orchestrator/warRoomStats.js'

// ============================================
// Pipeline Watcher & Lead Factory
// ============================================
export { pipelineWatcher, runPipelineRefill, getPipelineStats, updatePipelineSettings } from './triggers/pipelineWatcher.js'

// ============================================
// Reply Handler (Structured Reply Processing)
// ============================================
export { handleIncomingReply, markReplyHandled, getReplyHandlerStats } from './services/replyHandler.js'

// ============================================
// Onboarding / Client Setup Wizard
// ============================================
export { validateSetupStep, completeClientSetup, getSetupProgress } from './services/onboardingService.js'

// ============================================
// Agent Alex (Autonomous AI Prospecting Agent)
// ============================================
export { webhookIncoming } from './alex/webhookIncoming.js'
export { rescueScheduler } from './alex/rescueScheduler.js'
export { transferLeadToClient } from './alex/transferLeadToClient.js'
export { dailyReset } from './alex/dailyReset.js'
export { sendManualMessage } from './alex/sendMessage.js'

// Alex Associe Commercial — Chat IA + Actions + Rapports + Alertes
export { chatWithAlex, resetAlexConversation } from './alex/alexBrain.js'
export { createAlexThread, listAlexThreads, deleteAlexThread, renameAlexThread, migrateAlexConversations } from './alex/alexThreads.js'
export { alexDailyReporter } from './alex/alexDailyReport.js'
export { alertHotLead } from './alex/alexHotLeadAlert.js'
export { alexAutonomousWorker } from './alex/alexAutonomousWorker.js'

// Alex WhatsApp Interface
export { alexWhatsAppIncoming } from './alex/alexWhatsAppHandler.js'
export { sendWhatsAppVerification, verifyWhatsAppCode, unlinkWhatsApp } from './alex/alexWhatsAppLink.js'

// Alex Autopilot Engine — Cerveau autonome
export { alexDailyPipeline, alexSmartEscalation } from './alex/alexAutopilotEngine.js'
export { alexResponseWatcher } from './alex/alexResponseWatcher.js'
export { alexWeeklyShield } from './alex/alexShieldWorker.js'
export { alexEveningReport } from './alex/alexEveningReport.js'

// Alex Learning Engine — Auto-apprentissage depuis outcomes
export { onProspectOutcome, weeklyLearningRecalc, getLearningInsights, forceRecalculateWeights } from './alex/engine/learningEngine.js'

// Alex Onboarding Sniper — 8 questions intelligentes
export { startOnboardingSniper, answerOnboardingQuestion, getOnboardingStatus, getBusinessProfile } from './alex/onboardingSniper.js'

// Alex WhatsApp Intelligence Reports — Rapport 20h + alertes temps reel
export { alexEveningIntelReport, onProspectReplyAlert, sendAlexConfirmation, getIntelReports } from './alex/whatsappIntelReports.js'

// ============================================
// Notification System (v6.0)
// ============================================
export { sendNotification } from './notifications/notificationSender.js'

// ============================================
// KB Wizard (v6.0 - Module 4)
// ============================================
export { processKBWizard } from './knowledge/kbWizardProcessor.js'

// ============================================
// Signal Monitor (v6.0 - Module 1)
// ============================================
export { signalMonitorCron } from './engine/signalMonitor.js'

// ============================================
// Auto-Optimizer (v6.0 - Module 8)
// ============================================
export { autoOptimizerCron } from './alex/autoOptimizer.js'
export { getAlexAnalytics } from './analytics/alexAnalytics.js'

// ============================================
// Deliverability Monitor (v6.0 - Module 10)
// ============================================
export { deliverabilityMonitorCron, getDeliverabilityScore } from './email/deliverabilityMonitor.js'

// ============================================
// Adaptive Warmup (v6.0 - Module 10)
// ============================================
export { getAdaptiveWarmupLimit } from './email/warmup.js'

// ============================================
// Enhanced Deliverability (v6.0 - Module 10)
// ============================================
export { checkReverseDNS, checkBlacklists } from './email/deliverability.js'

// ============================================
// Cloud Tasks Agents (serverless BullMQ replacement)
// ============================================
export { emailAgentHandler as emailAgent } from './agents/emailAgent.js'
export { whatsappAgentHandler as whatsappAgent } from './agents/whatsappAgent.js'
export { instagramAgentHandler as instagramAgent } from './agents/instagramAgent.js'
export { linkedinAgentHandler as linkedinAgent } from './agents/linkedinAgent.js'
export { orchestratorAgentHandler as orchestratorAgent } from './agents/orchestratorAgent.js'
export { orchestratorCron, runOrchestratorCronManual } from './agents/orchestratorCron.js'

// ============================================
// Cloud Tasks Queue Management
// ============================================
export { enqueueTask, enqueueBatch, deleteTask, purgeQueue, pauseQueue, resumeQueue } from './queues/taskQueue.js'

// ============================================
// Lead Aggregation System (Multi-Source Pipeline)
// ============================================
export { sourceOrchestrator, runSourceManual, getSourceStats } from './prospecting/scheduler/sourceOrchestrator.js'
export { prospectingAgentHandler as prospectingAgent } from './prospecting/agents/prospectingAgent.js'
export { runPipelineManual, getPipelineFunnelStats } from './prospecting/pipeline/pipelineProcessor.js'
export { getProspectingDashboard, getSourceHealthStatus } from './prospecting/monitoring/sourceMonitor.js'
export { updateSourceConfig, getSourceConfig } from './prospecting/scheduler/sourceConfig.js'

// ============================================
// Knowledge Base (Vector Search + RAG)
// ============================================
export { indexKBDocument, deleteKBDocument } from './knowledge/kbIndexer.js'
export { searchKB } from './knowledge/kbSearch.js'

// ============================================
// Agent IA (Core + Learning + HITL)
// ============================================
export { agentRespond, getAgentStatus } from './agent/agentCore.js'
export { agentLearning } from './agent/agentLearning.js'
export { getEscalations, handleEscalation, generateEscalationSummary } from './agent/hitlEscalation.js'

// ============================================
// Daily Analytics
// ============================================
export { updateDailyAnalytics, dailyAnalyticsSnapshot } from './analytics/dailyAnalytics.js'

// ============================================
// Warmup Sync
// ============================================
export { warmupSync } from './email/warmupSync.js'

// ============================================
// Booking (Calendly Webhook)
// ============================================
export { calendlyWebhook } from './booking/calendlyWebhook.js'

// ============================================
// Alerts Engine
// ============================================
export { alertsEngine } from './notifications/alertsEngine.js'

// ============================================
// Voice Agent (Vapi + Retell)
// ============================================
export { vapiOutbound } from './voice/vapiOutbound.js'
export { vapiWebhook } from './voice/vapiWebhook.js'
export { initiateVoiceCall, vapiCallbackWebhook, autoVoiceCallTrigger } from './voice/voiceFunction.js'
export { initiateAlexCallFn, alexVoiceWebhook, scheduleVoiceCampaignFn } from './voice/alexVoiceFunctions.js'

// ============================================
// CA Estimation Engine — 10 sources croisees (v5.0)
// ============================================
export { estimateLeadCA } from './ca/caFunction.js'

// ============================================
// DScore Intelligence Engine (v4.0)
// ============================================
export { calculateLeadDScore, onLeadCreatedCalculateDScore, onLeadParticuliersCalculateDScore } from './intelligence/dScoreFunction.js'

// ============================================
// ROI Analytics Engine (v4.0)
// ============================================
export { getROIMetrics, computeNightlyROI } from './analytics/roiFunction.js'

// ============================================
// ABM Multi-Decideurs (v4.0)
// ============================================
export { identifyAndContactDecisionMakers, launchABMCampaign } from './abm/abmFunction.js'

// ============================================
// White-label Reseller (v4.0)
// ============================================
export { createReseller, inviteResellerClient, activateViaInvite, getResellerDashboard, monthlyResellerCommissions } from './reseller/resellerFunction.js'

// ============================================
// Signals Intelligence Layer (v4.0)
// ============================================
export { enrichLeadSignals, scrapeCompetitorReviewsCallable, dailyCompetitorReviewsScan, fetchGithubSignalsCallable, fetchConferenceSpeakersCron } from './signals/signalsFunction.js'

// ============================================
// A/B Testing Engine — Thompson Sampling (v4.0)
// ============================================
export { runABTest, recordABTestResultCallable, getWinningVariant, getABTestDashboard, rotateAbVariants } from './signals/abTestingFunction.js'

// ============================================
// Migrations
// ============================================
export { migrateCrmColumns } from './migrations/addCrmColumn.js'

// ============================================
// Pipeline Prospection France (Sources officielles)
// ============================================
export { runProspectionFrance, getSecteursFrance } from './sourcing/sourcingCallable.js'

// ============================================
// Intent Hunter — RGPD Engine
// ============================================
export { unsubscribeHandler } from './compliance/rgpdEngine.js'

// ============================================
// Intent Hunter — Scheduled Jobs
// ============================================
export { detectCompetitorMentionsCron } from './intentHunter/shared/detectCompetitorMentions.js'
export { recycleColdLeadsCron } from './intentHunter/shared/recycleColdLeads.js'

// ============================================
// Intent Hunter — CRM Sync (Webhook HTTP)
// ============================================
export { crmWebhookIngest } from './integrations/crmSync.js'

// ============================================
// Intent Hunter — Callable Functions (UI)
// ============================================
export { launchIntentHunterPro, launchIntentHunterParticuliers, getIntentHunterStats } from './intentHunter/intentHunterCallable.js'

// ============================================
// GeoZone Intelligent (v5.0)
// ============================================
export { updateClientGeoSettings, getGeoSettings, detectGeoFromMessage, resolveZone } from './geo/geoFunction.js'

// ============================================
// Alex Memory System — 3-layer collective memory (v5.0)
// ============================================
export { consolidateAlexMemory, forceConsolidateNiche, onInteractionCreated, getAlexMemoryContext, getAlexMemoryStats } from './memory/memoryFunction.js'

// ============================================
// Product Profile — Alex Universel (multi-tenant product config)
// ============================================
export { updateProductProfile, getProductProfileCallable } from './agent/productProfileEngine.js'

// ============================================
// Social Omniscient v2 — Veille multi-sources (50 sources)
// ============================================
export {
  scheduleSocialScans,
  scanSingleOrg,
} from './social/socialOrchestratorV2.js'

export {
  metaOAuthStart,
  metaOAuthCallback,
  linkedinOAuthStart,
  linkedinOAuthCallback,
} from './social/oauthHandlers.js'

export {
  processSocialLead,
  socialManualAction,
  configureSocialSources,
  getSocialStats,
} from './social/socialSignalProcessor.js'

export {
  listConnectedPlatforms,
  disconnectSocialPlatform,
} from './social/sessionManager.js'

// Social Scanner — VPS trigger + lead receiver
export { triggerSocialScan } from './social/triggerSocialScan.js'
export { receiveSocialLeads } from './social/receiveSocialLeads.js'

// ============================================
// Safety — Pre-Send Gateway + Anti-Spam + Sunset + Inactivity + Domain + Kill Switch + Dedup
// ============================================

// --- Pre-Send Safety Gateway (Module A) ---
export { preSendSafetyCheck } from './safety/preSendSafetyGateway.js'

// --- Anti-Spam Content Guard (Module B) ---
export { scanEmailContentFn } from './safety/antiSpamContentGuard.js'

// --- Sunset Policy Engine (Module C) ---
export { weeklySunsetCleanup, manualSunsetProspect, getSunsetStats } from './safety/sunsetPolicyEngine.js'

// --- User Inactivity Handler (Module D) ---
export { userInactivityCheck, getUserActivityStatus } from './safety/userInactivityHandler.js'

// --- Product Intelligence (Module E) ---
export { monthlyProductRefresh, refreshProductIntelligence, getProductIntelligence } from './alex/productIntelligence.js'

// --- Secondary Domain Guard (Module F) ---
export { checkOutreachDomainSetup, validateSecondaryDomain } from './safety/secondaryDomainGuard.js'

// --- Kill Switch Manager (Module H) ---
export { pauseAlexModule, resumeAlexModule, getAlexModuleStatus } from './safety/killSwitchManager.js'

// --- Enhanced Dedup (Module I) ---
export { deduplicateOrg } from './safety/enhancedDedup.js'

// ============================================
// Dev functions (only available in development/emulator)
// ============================================
export { seedData, seedSubscriptionPlans } from './dev/seedData.js'
