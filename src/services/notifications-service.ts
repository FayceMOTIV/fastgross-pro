import { getMessagingInstance } from "@/lib/firebase";
import { getToken, onMessage, MessagePayload } from "firebase/messaging";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification } from "@/types";

const COLLECTION_NAME = "notifications";
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

// Subscribe to foreground messages
export async function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  return onMessage(messaging, callback);
}

// Create notification in Firestore
export async function createNotification(
  data: Omit<Notification, "id" | "read" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    read: false,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

// Get notifications for user
export async function getUserNotifications(
  userId: string,
  limitCount = 50
): Promise<Notification[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("targetUsers", "array-contains", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data,
      targetUsers: data.targetUsers,
      targetTeams: data.targetTeams,
      read: data.read,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as Notification;
  });
}

// Mark notification as read
export async function markNotificationAsRead(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, { read: true });
}

// Mark all notifications as read for user
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("targetUsers", "array-contains", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);
  const updatePromises = snapshot.docs.map((doc) =>
    updateDoc(doc.ref, { read: true })
  );

  await Promise.all(updatePromises);
}

// Send notification to users (creates Firestore entry + could trigger FCM via Cloud Function)
export async function sendNotification(options: {
  type: Notification["type"];
  title: string;
  body: string;
  data?: Record<string, string>;
  targetUsers?: string[];
  targetTeams?: string[];
}): Promise<string> {
  return createNotification({
    type: options.type,
    title: options.title,
    body: options.body,
    data: options.data,
    targetUsers: options.targetUsers,
    targetTeams: options.targetTeams,
  });
}

// Show browser notification
export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, options);
  }
}

// Notification templates
export const notificationTemplates = {
  newOrder: (clientName: string, total: number) => ({
    type: "order" as const,
    title: "Nouvelle commande",
    body: `${clientName} a passé une commande de ${total.toFixed(2)}€`,
  }),

  orderValidated: (orderId: string) => ({
    type: "order" as const,
    title: "Commande validée",
    body: `La commande #${orderId.slice(0, 8)} a été validée`,
  }),

  deliveryAssigned: (driverName: string) => ({
    type: "delivery" as const,
    title: "Livraison assignée",
    body: `${driverName} a été assigné à votre livraison`,
  }),

  deliveryCompleted: (clientName: string) => ({
    type: "delivery" as const,
    title: "Livraison terminée",
    body: `La livraison chez ${clientName} est terminée`,
  }),

  newMessage: (senderName: string) => ({
    type: "message" as const,
    title: "Nouveau message",
    body: `${senderName} vous a envoyé un message`,
  }),

  lowStock: (productName: string) => ({
    type: "alert" as const,
    title: "Stock bas",
    body: `Le stock de "${productName}" est bas`,
  }),
};
