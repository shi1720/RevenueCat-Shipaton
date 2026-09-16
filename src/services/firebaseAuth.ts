import { getApps, initializeApp } from "firebase/app";
import * as sdk from "firebase/auth";
import { Platform } from "react-native";
import { nativeStorage } from "./secureAuthStorage";
import type { Session } from "./auth";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
};
export const firebaseConfigured = Object.values(config).every(Boolean);
let auth: sdk.Auth | undefined;
let nativePersistence: sdk.Persistence | undefined;
let nativeReady: Promise<sdk.Auth> | undefined;

function service(): sdk.Auth {
  if (!firebaseConfigured)
    throw new Error("Accounts are not configured in this build.");
  if (!auth) {
    const app =
      getApps().find((candidate) => candidate.name === "unpause-accounts") ||
      initializeApp(config, "unpause-accounts");
    if (Platform.OS === "web") auth = sdk.getAuth(app);
    else {
      // Metro selects Firebase's official react-native export. Its native-only
      // helper is absent from the browser type declaration selected by tsc.
      const native = sdk as typeof sdk & {
        getReactNativePersistence: (
          storage: typeof nativeStorage,
        ) => sdk.Persistence;
      };
      nativePersistence = native.getReactNativePersistence(nativeStorage);
      auth = sdk.initializeAuth(app, { persistence: nativePersistence });
    }
    auth.languageCode = "en";
  }
  return auth;
}

/** Firebase's native initialization silently falls back to memory if its
 * availability probe fails. Explicitly select encrypted persistence before
 * account operations so a successful login cannot rely on that fallback. */
async function readyService(): Promise<sdk.Auth> {
  const instance = service();
  if (Platform.OS === "web") return instance;
  if (!nativeReady) {
    nativeReady = (async () => {
      await instance.authStateReady();
      const probeKey = "firebase.secure-session-ready";
      try {
        await nativeStorage.setItem(probeKey, "ready");
        await nativeStorage.removeItem(probeKey);
      } catch {
        throw new Error(
          "Secure account storage is unavailable. Unlock your device and try again. Your local projects are safe.",
        );
      }
      await sdk.setPersistence(instance, nativePersistence!);
      return instance;
    })().catch((error) => {
      nativeReady = undefined;
      throw error;
    });
  }
  return nativeReady;
}

function session(user: sdk.User | null): Session | null {
  return user
    ? { user: { id: user.uid, email: user.email || undefined } }
    : null;
}
function readable(error: unknown): Error {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential":
      "That email and password could not be verified. Try again or reset your password.",
    "auth/wrong-password":
      "That email and password could not be verified. Try again or reset your password.",
    "auth/user-not-found":
      "That email and password could not be verified. Try again or reset your password.",
    "auth/email-already-in-use":
      "An account already uses this email. Sign in or reset your password.",
    "auth/weak-password":
      "Choose a stronger password with at least 10 characters.",
    "auth/too-many-requests":
      "Too many attempts. Wait a few minutes, then try again.",
    "auth/network-request-failed":
      "We could not reach the account service. Check your connection and try again.",
    "auth/requires-recent-login":
      "For your security, sign out and sign in again, then retry this action. Your local projects will stay on this device.",
    "auth/user-disabled": "This account is disabled. Contact support for help.",
    "auth/operation-not-allowed":
      "Email accounts are temporarily unavailable. Your local projects are safe.",
  };
  return new Error(
    messages[code] ||
      "The account request could not be completed. Please try again or contact support.",
  );
}
async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw readable(error);
  }
}
function emailActionSettings() {
  // Firebase's hosted action handler verifies one-use codes. The Continue link
  // goes to our SPA root, so this works without custom deep-link routing.
  return {
    url: `https://${config.projectId}.web.app/`,
    handleCodeInApp: false,
  };
}
export async function signUp(email: string, password: string) {
  const instance = await readyService();
  const result = await run(() =>
    sdk.createUserWithEmailAndPassword(instance, email, password),
  );
  return {
    session: session(result.user),
    user: { id: result.user.uid, email: result.user.email },
  };
}
export async function signIn(email: string, password: string) {
  const instance = await readyService();
  const result = await run(() =>
    sdk.signInWithEmailAndPassword(instance, email, password),
  );
  return {
    session: session(result.user),
    user: { id: result.user.uid, email: result.user.email },
  };
}
export async function signOut(): Promise<void> {
  await run(() => sdk.signOut(service()));
}
export async function getSession(): Promise<Session | null> {
  const instance = await readyService();
  await instance.authStateReady();
  return session(instance.currentUser);
}
export function subscribeAuth(
  callback: (
    value: Session | null,
    event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED",
  ) => void,
): () => void {
  let previous: string | undefined;
  return sdk.onIdTokenChanged(service(), (user) => {
    const event = user
      ? previous === user.uid
        ? "TOKEN_REFRESHED"
        : "SIGNED_IN"
      : "SIGNED_OUT";
    previous = user?.uid;
    callback(session(user), event);
  });
}
export async function resetPassword(email: string): Promise<void> {
  await run(() =>
    sdk.sendPasswordResetEmail(service(), email, emailActionSettings()),
  );
}
export async function updatePassword(password: string): Promise<void> {
  const user = service().currentUser;
  if (!user) throw new Error("Sign in before changing your password.");
  await run(() => sdk.updatePassword(user, password));
}
export async function deleteAccount(): Promise<void> {
  const user = service().currentUser;
  if (!user) throw new Error("Sign in before deleting your account.");
  const billingEnabled = Boolean(
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
    process.env.EXPO_PUBLIC_REVENUECAT_GALAXY_KEY ||
    process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
  );
  if (billingEnabled) {
    const endpoint = process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL?.trim();
    if (!endpoint || new URL(endpoint).protocol !== "https:") {
      throw new Error(
        "Account deletion needs the secure purchase-data deletion service. Contact support to delete your account and purchase profile.",
      );
    }
    const token = await run(() => user.getIdToken(true));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmation: "DELETE_MY_ACCOUNT" }),
    });
    const result: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !result ||
      typeof result !== "object" ||
      !("deleted" in result) ||
      result.deleted !== true
    )
      throw new Error(
        "Your account could not be deleted. Please try again while online or contact support.",
      );
    await signOut();
    return;
  }
  await run(() => sdk.deleteUser(user));
}
