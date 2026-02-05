import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User, UserRole } from "@/types";

const USERS_COLLECTION = "users";

// Convert Firestore user data to User type
function docToUser(uid: string, data: Record<string, unknown>): User {
  return {
    id: uid,
    email: data.email as string,
    displayName: (data.displayName || data.name) as string,
    role: data.role as UserRole,
    avatar: data.avatar as string | undefined,
    telephone: (data.telephone || data.phone) as string | undefined,
    depot: data.depot as string | undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
  };
}

// Get user data from Firestore
export async function getUserData(uid: string): Promise<User | null> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docToUser(uid, docSnap.data());
}

// Sign in with email and password
export async function signIn(
  email: string,
  password: string
): Promise<User | null> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Get user data from Firestore
  const userData = await getUserData(firebaseUser.uid);

  if (userData) {
    // Update last login time
    await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
      updatedAt: Timestamp.now(),
    });
  }

  return userData;
}

// Sign out
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Subscribe to auth state changes
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const userData = await getUserData(firebaseUser.uid);
      callback(userData);
    } else {
      callback(null);
    }
  });
}

// Send password reset email
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Change password (requires reauthentication)
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No user logged in");

  // Reauthenticate
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  // Update password
  await updatePassword(user, newPassword);
}

// Update user profile
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<User, "displayName" | "telephone" | "avatar">>
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Update FCM token for push notifications
export async function updateFCMToken(uid: string, token: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, { fcmToken: token, updatedAt: Timestamp.now() });
}

// Create user document in Firestore (called after Firebase Auth signup)
export async function createUserDocument(
  uid: string,
  data: Omit<User, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

// Check if user has specific role
export function hasRole(user: User | null, roles: UserRole | UserRole[]): boolean {
  if (!user) return false;
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}

// Check if user is admin
export function isAdmin(user: User | null): boolean {
  return hasRole(user, "admin");
}

// Get current Firebase user
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}
