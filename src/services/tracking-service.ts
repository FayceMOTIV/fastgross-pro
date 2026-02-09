/**
 * Tracking Service - UTM & Attribution
 * Track marketing events and calculate ROI
 */

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// Types
export interface TrackingEvent {
  id: string;
  type: "page_view" | "form_submit" | "email_open" | "email_click" | "call" | "order" | "signup";
  prospectId?: string;
  clientId?: string;
  source: string; // utm_source
  medium: string; // utm_medium
  campaign: string; // utm_campaign
  content?: string; // utm_content
  term?: string; // utm_term
  landingPage?: string;
  referrer?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  value?: number; // Revenue or conversion value
  sessionId?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  browser?: string;
  country?: string;
  city?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface SourcePerformance {
  source: string;
  medium: string;
  visits: number;
  leads: number;
  conversions: number;
  revenue: number;
  cac: number; // Cost per acquisition
  roas: number; // Return on ad spend
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

// UTM Parameter extraction
export function extractUTMParams(url: string): Partial<TrackingEvent> {
  try {
    const urlObj = new URL(url);
    return {
      source: urlObj.searchParams.get("utm_source") || "direct",
      medium: urlObj.searchParams.get("utm_medium") || "none",
      campaign: urlObj.searchParams.get("utm_campaign") || "none",
      content: urlObj.searchParams.get("utm_content") || undefined,
      term: urlObj.searchParams.get("utm_term") || undefined,
    };
  } catch {
    return {
      source: "direct",
      medium: "none",
      campaign: "none",
    };
  }
}

// Device detection
export function detectDevice(): "mobile" | "desktop" | "tablet" {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

// Browser detection
export function detectBrowser(): string {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Opera")) return "Opera";
  return "Other";
}

// Generate session ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create session ID
export function getSessionId(): string {
  if (typeof window === "undefined") return generateSessionId();

  let sessionId = sessionStorage.getItem("fg_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("fg_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Track an event
 */
export async function trackEvent(
  event: Omit<TrackingEvent, "id" | "timestamp">
): Promise<string> {
  const fullEvent: Omit<TrackingEvent, "id"> = {
    ...event,
    timestamp: new Date(),
    sessionId: event.sessionId || getSessionId(),
    deviceType: event.deviceType || detectDevice(),
    browser: event.browser || detectBrowser(),
  };

  try {
    const docRef = await addDoc(collection(db, "tracking_events"), {
      ...fullEvent,
      timestamp: Timestamp.fromDate(fullEvent.timestamp),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error tracking event:", error);
    // Store locally if Firestore fails
    const localEvents = JSON.parse(localStorage.getItem("fg_pending_events") || "[]");
    localEvents.push(fullEvent);
    localStorage.setItem("fg_pending_events", JSON.stringify(localEvents));
    return `local_${Date.now()}`;
  }
}

/**
 * Track page view
 */
export function trackPageView(landingPage: string, referrer?: string): void {
  const utmParams = extractUTMParams(window.location.href);
  trackEvent({
    type: "page_view",
    source: utmParams.source || "direct",
    medium: utmParams.medium || "none",
    campaign: utmParams.campaign || "none",
    content: utmParams.content,
    term: utmParams.term,
    landingPage,
    referrer: referrer || document.referrer,
  });
}

/**
 * Track form submission
 */
export function trackFormSubmit(
  formName: string,
  prospectId?: string,
  value?: number
): void {
  const utmParams = extractUTMParams(window.location.href);
  trackEvent({
    type: "form_submit",
    prospectId,
    source: utmParams.source || "direct",
    medium: utmParams.medium || "none",
    campaign: utmParams.campaign || "none",
    landingPage: window.location.pathname,
    value,
    metadata: { formName },
  });
}

/**
 * Track email open
 */
export async function trackEmailOpen(
  campaignId: string,
  prospectId: string
): Promise<void> {
  await trackEvent({
    type: "email_open",
    prospectId,
    source: "email",
    medium: "email",
    campaign: campaignId,
    metadata: { campaignId },
  });
}

/**
 * Track email click
 */
export async function trackEmailClick(
  campaignId: string,
  prospectId: string,
  linkUrl: string
): Promise<void> {
  await trackEvent({
    type: "email_click",
    prospectId,
    source: "email",
    medium: "email",
    campaign: campaignId,
    metadata: { campaignId, linkUrl },
  });
}

/**
 * Track order/conversion
 */
export async function trackConversion(
  clientId: string,
  value: number,
  source?: string,
  campaign?: string
): Promise<void> {
  await trackEvent({
    type: "order",
    clientId,
    source: source || "direct",
    medium: "organic",
    campaign: campaign || "none",
    value,
  });
}

/**
 * Get prospect journey
 */
export async function getProspectJourney(prospectId: string): Promise<TrackingEvent[]> {
  const q = query(
    collection(db, "tracking_events"),
    where("prospectId", "==", prospectId),
    orderBy("timestamp", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as TrackingEvent[];
}

/**
 * Get client journey
 */
export async function getClientJourney(clientId: string): Promise<TrackingEvent[]> {
  const q = query(
    collection(db, "tracking_events"),
    where("clientId", "==", clientId),
    orderBy("timestamp", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  })) as TrackingEvent[];
}

/**
 * Calculate Customer Acquisition Cost
 */
export async function calculateCAC(period: DateRange): Promise<number> {
  // Mock data - in production, integrate with ad spend APIs
  const mockAdSpend = {
    google_ads: 1500,
    facebook: 800,
    linkedin: 400,
    email: 200,
  };

  const totalSpend = Object.values(mockAdSpend).reduce((a, b) => a + b, 0);

  // Count conversions in period
  const q = query(
    collection(db, "tracking_events"),
    where("type", "==", "order"),
    where("timestamp", ">=", Timestamp.fromDate(period.start)),
    where("timestamp", "<=", Timestamp.fromDate(period.end))
  );

  const snapshot = await getDocs(q);
  const conversions = snapshot.docs.length || 1; // Prevent division by zero

  return Math.round(totalSpend / conversions);
}

/**
 * Get conversions by source
 */
export async function getConversionsBySource(
  _period?: DateRange
): Promise<SourcePerformance[]> {
  // In production, query from Firestore
  // For demo, return mock data
  const mockData: SourcePerformance[] = [
    {
      source: "google",
      medium: "cpc",
      visits: 2500,
      leads: 180,
      conversions: 24,
      revenue: 28500,
      cac: 62.5,
      roas: 3.2,
    },
    {
      source: "facebook",
      medium: "social",
      visits: 1800,
      leads: 95,
      conversions: 12,
      revenue: 14200,
      cac: 66.67,
      roas: 2.8,
    },
    {
      source: "email",
      medium: "email",
      visits: 1200,
      leads: 280,
      conversions: 45,
      revenue: 52000,
      cac: 4.44,
      roas: 12.5,
    },
    {
      source: "referral",
      medium: "referral",
      visits: 450,
      leads: 120,
      conversions: 32,
      revenue: 38000,
      cac: 0,
      roas: Infinity,
    },
    {
      source: "linkedin",
      medium: "social",
      visits: 380,
      leads: 42,
      conversions: 8,
      revenue: 12500,
      cac: 50,
      roas: 3.1,
    },
    {
      source: "direct",
      medium: "none",
      visits: 3200,
      leads: 85,
      conversions: 18,
      revenue: 21000,
      cac: 0,
      roas: Infinity,
    },
  ];

  return mockData;
}

/**
 * Get best performing campaigns
 */
export async function getBestPerformingCampaigns(): Promise<CampaignPerformance[]> {
  // Mock data
  return [
    {
      campaignId: "camp_1",
      campaignName: "Offre Découverte Kebab",
      sent: 1500,
      delivered: 1485,
      opened: 520,
      clicked: 145,
      converted: 28,
      revenue: 18500,
      openRate: 35.0,
      clickRate: 9.9,
      conversionRate: 1.9,
    },
    {
      campaignId: "camp_2",
      campaignName: "Promo Pizza Été",
      sent: 2200,
      delivered: 2156,
      opened: 680,
      clicked: 195,
      converted: 35,
      revenue: 24200,
      openRate: 31.5,
      clickRate: 9.0,
      conversionRate: 1.6,
    },
    {
      campaignId: "camp_3",
      campaignName: "Relance Clients Inactifs",
      sent: 450,
      delivered: 442,
      opened: 185,
      clicked: 72,
      converted: 18,
      revenue: 12800,
      openRate: 41.9,
      clickRate: 16.3,
      conversionRate: 4.1,
    },
    {
      campaignId: "camp_4",
      campaignName: "Newsletter Mensuelle",
      sent: 3500,
      delivered: 3465,
      opened: 890,
      clicked: 210,
      converted: 22,
      revenue: 15600,
      openRate: 25.7,
      clickRate: 6.1,
      conversionRate: 0.6,
    },
  ];
}

/**
 * Get conversion funnel
 */
export async function getConversionFunnel(): Promise<ConversionFunnel[]> {
  return [
    { stage: "Visiteurs", count: 8530, conversionRate: 100, dropoffRate: 0 },
    { stage: "Prospects identifiés", count: 802, conversionRate: 9.4, dropoffRate: 90.6 },
    { stage: "Contacts qualifiés", count: 385, conversionRate: 48.0, dropoffRate: 52.0 },
    { stage: "Devis envoyés", count: 156, conversionRate: 40.5, dropoffRate: 59.5 },
    { stage: "Premiers achats", count: 89, conversionRate: 57.1, dropoffRate: 42.9 },
    { stage: "Clients récurrents", count: 52, conversionRate: 58.4, dropoffRate: 41.6 },
  ];
}

/**
 * Calculate average time to conversion
 */
export async function getAverageTimeToConversion(): Promise<{
  days: number;
  stages: { stage: string; avgDays: number }[];
}> {
  return {
    days: 18.5,
    stages: [
      { stage: "Visite → Lead", avgDays: 2.3 },
      { stage: "Lead → Qualification", avgDays: 4.8 },
      { stage: "Qualification → Devis", avgDays: 5.2 },
      { stage: "Devis → Conversion", avgDays: 6.2 },
    ],
  };
}

/**
 * Get ROI by channel
 */
export async function getROIByChannel(): Promise<{
  channel: string;
  spend: number;
  revenue: number;
  roi: number;
}[]> {
  return [
    { channel: "Email Marketing", spend: 200, revenue: 52000, roi: 25900 },
    { channel: "Parrainage", spend: 500, revenue: 38000, roi: 7500 },
    { channel: "Google Ads", spend: 1500, revenue: 28500, roi: 1800 },
    { channel: "LinkedIn", spend: 400, revenue: 12500, roi: 3025 },
    { channel: "Facebook", spend: 800, revenue: 14200, roi: 1675 },
  ];
}

/**
 * Generate tracking pixel URL for email
 */
export function generateEmailTrackingPixel(
  campaignId: string,
  prospectId: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://facemediagrossiste.web.app";
  return `${baseUrl}/api/track/open?c=${campaignId}&p=${prospectId}`;
}

/**
 * Generate tracked link for email
 */
export function generateTrackedLink(
  originalUrl: string,
  campaignId: string,
  prospectId: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://facemediagrossiste.web.app";
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/track/click?url=${encodedUrl}&c=${campaignId}&p=${prospectId}`;
}

/**
 * UTM Builder
 */
export function buildUTMUrl(
  baseUrl: string,
  params: {
    source: string;
    medium: string;
    campaign: string;
    content?: string;
    term?: string;
  }
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", params.campaign);
  if (params.content) url.searchParams.set("utm_content", params.content);
  if (params.term) url.searchParams.set("utm_term", params.term);
  return url.toString();
}
