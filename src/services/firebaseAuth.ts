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
// Memory-only retry state. A lost deletion response cannot be recovered by
// refreshing credentials for a Firebase user that the server already deleted.
let pendingDeletion:
  | { user: sdk.User; endpoint: string; token: string; expiresAt: number }
  | undefined;
const deletionRetryWindowMs = 5 * 60 * 1000;

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
  pendingDeletion = undefined;
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
  pendingDeletion = undefined;
  return {
    session: session(result.user),
    user: { id: result.user.uid, email: result.user.email },
  };
}
export async function signOut(): Promise<void> {
  await run(() => sdk.signOut(service()));
  pendingDeletion = undefined;
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
    process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY ||
    (process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE === "true" &&
      process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY),
  );
  const endpoint = process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL?.trim();
  // Accounts are shared across platforms. Even a free web build must clean up
  // a purchase profile that the same account created in a native app.
  if (endpoint || billingEnabled) {
    if (!endpoint || new URL(endpoint).protocol !== "https:") {
      throw new Error(
        "Account deletion needs the secure purchase-data deletion service. Contact support to delete your account and purchase profile.",
      );
    }
    if (
      !pendingDeletion ||
      pendingDeletion.user !== user ||
      pendingDeletion.endpoint !== endpoint ||
      pendingDeletion.expiresAt <= Date.now()
    ) {
      pendingDeletion = undefined;
      const token = await run(() => user.getIdToken(true));
      if (service().currentUser !== user)
        throw new Error(
          "Your account changed. Retry from the current account.",
        );
      pendingDeletion = {
        user,
        endpoint,
        token,
        expiresAt: Date.now() + deletionRetryWindowMs,
      };
    }
    const { token } = pendingDeletion;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmation: "DELETE_MY_ACCOUNT" }),
    });
    const result: unknown = await response.json().catch(() => null);
    // A definite client/authentication rejection needs a fresh operation.
    // Network failures, malformed success responses and provider failures keep
    // the same token available for the server's bounded durable receipt replay.
    if (
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 429
    )
      pendingDeletion = undefined;
    if (response.status === 202) {
      throw new Error(
        "Purchase profile cleanup is still processing. Wait a few seconds and try deleting your account again.",
      );
    }
    if (response.status === 401) {
      throw new Error(
        "Please sign out and sign in again before deleting your account.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Too many deletion attempts. Please wait a minute and try again.",
      );
    }
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
    if (service().currentUser !== user)
      throw new Error("Your account changed. Refresh the current account.");
    await signOut();
    return;
  }
  await run(() => sdk.deleteUser(user));
}
