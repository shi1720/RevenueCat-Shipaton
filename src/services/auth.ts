import {
  createClient,
  processLock,
  type AuthChangeEvent,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { nativeStorage } from "./secureAuthStorage";
import * as firebase from "./firebaseAuth";
import * as Crypto from "expo-crypto";

export interface Session {
  user: { id: string; email?: string };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const authConfigured =
  firebase.firebaseConfigured || Boolean(supabaseUrl && supabaseKey);
export const authProvider = firebase.firebaseConfigured
  ? "firebase"
  : supabaseUrl && supabaseKey
    ? "supabase"
    : "local";
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!authConfigured)
    throw new Error(
      "Accounts are not configured in this build. You can use Unpause locally without signing in.",
    );
  if (!client) {
    // Supabase otherwise falls back to Math.random/plain PKCE on Hermes.
    // Supply only the native primitives it needs, preserving existing globals.
    if (Platform.OS !== "web") {
      if (typeof globalThis.crypto === "undefined") {
        Object.defineProperty(globalThis, "crypto", {
          value: {},
          configurable: true,
        });
      }
      if (!globalThis.crypto.getRandomValues) {
        Object.defineProperty(globalThis.crypto, "getRandomValues", {
          value: Crypto.getRandomValues,
        });
      }
      if (!globalThis.crypto.subtle) {
        Object.defineProperty(globalThis.crypto, "subtle", {
          value: {
            digest: (algorithm: string, data: BufferSource) => {
              if (algorithm !== "SHA-256")
                throw new Error("Unsupported native digest algorithm.");
              return Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
            },
          },
        });
      }
    }
    const url = new URL(supabaseUrl!);
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    ) {
      throw new Error("Account service must use HTTPS.");
    }
    client = createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        ...(Platform.OS !== "web"
          ? { storage: nativeStorage, lock: processLock }
          : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
    if (Platform.OS !== "web") {
      if (AppState.currentState === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
      AppState.addEventListener("change", (state) => {
        if (state === "active") client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}

function callbackUrl(recovery = false): string {
  const url =
    Platform.OS === "web" && typeof window !== "undefined"
      ? new URL("/?auth=callback", window.location.origin)
      : new URL("unpause://auth/callback");
  if (recovery) url.searchParams.set("flow", "recovery");
  return url.toString();
}

function validateEmail(email: string): string {
  const normalized = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254)
    throw new Error("Enter a valid email address.");
  return normalized;
}

function validatePassword(password: string) {
  if (password.length < 10)
    throw new Error("Use a password of at least 10 characters.");
  if (password.length > 256)
    throw new Error("Use a password of 256 characters or fewer.");
}

export async function signUp(email: string, password: string) {
  validatePassword(password);
  if (firebase.firebaseConfigured)
    return firebase.signUp(validateEmail(email), password);
  const { data, error } = await getClient().auth.signUp({
    email: validateEmail(email),
    password,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  if (firebase.firebaseConfigured)
    return firebase.signIn(validateEmail(email), password);
  const { data, error } = await getClient().auth.signInWithPassword({
    email: validateEmail(email),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  if (firebase.firebaseConfigured) return firebase.signOut();
  const { error } = await getClient().auth.signOut({ scope: "local" });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  if (firebase.firebaseConfigured) return firebase.getSession();
  if (!authConfigured) return null;
  const { data, error } = await getClient().auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Callback must stay synchronous; schedule async work outside the auth lock. */
export function subscribeAuth(
  callback: (session: Session | null, event: AuthChangeEvent) => void,
): () => void {
  if (firebase.firebaseConfigured) return firebase.subscribeAuth(callback);
  if (!authConfigured) return () => undefined;
  const { data } = getClient().auth.onAuthStateChange((event, session) =>
    callback(session, event),
  );
  return () => data.subscription.unsubscribe();
}

export async function resetPassword(email: string): Promise<void> {
  if (firebase.firebaseConfigured)
    return firebase.resetPassword(validateEmail(email));
  const { error } = await getClient().auth.resetPasswordForEmail(
    validateEmail(email),
    { redirectTo: callbackUrl(true) },
  );
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  validatePassword(password);
  if (firebase.firebaseConfigured) return firebase.updatePassword(password);
  const { error } = await getClient().auth.updateUser({ password });
  if (error) throw error;
}

const handledCodes = new Map<
  string,
  Promise<{ handled: boolean; recovery: boolean }>
>();
/** Handles cold/warm deep links and web callback; PKCE binds the code to this installation/browser. */
export async function handleAuthUrl(
  rawUrl: string,
): Promise<{ handled: boolean; recovery: boolean }> {
  if (firebase.firebaseConfigured || !authConfigured)
    return { handled: false, recovery: false };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { handled: false, recovery: false };
  }
  const expected = new URL(callbackUrl());
  if (
    url.protocol !== expected.protocol ||
    url.host !== expected.host ||
    url.pathname !== expected.pathname
  )
    return { handled: false, recovery: false };
  if (url.searchParams.has("error"))
    throw new Error(
      "This sign-in link is invalid or expired. Request a new email and open it on the device where you started.",
    );
  const code = url.searchParams.get("code");
  if (!code) return { handled: false, recovery: false };
  const existing = handledCodes.get(code);
  if (existing) return existing;
  const operation = (async () => {
    const flowId = url.searchParams.get("sb_flow_id");
    const { error } = await getClient().auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error)
      throw new Error(
        "This sign-in link could not be verified. Open it on the device where you started, or request a new link.",
      );
    const recovery = url.searchParams.get("flow") === "recovery";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    return { handled: true, recovery };
  })();
  if (handledCodes.size >= 20) handledCodes.clear();
  handledCodes.set(code, operation);
  return operation;
}

/** Deletes the authenticated server account. Local project deletion remains an explicit separate action. */
export async function deleteAccount(): Promise<void> {
  if (firebase.firebaseConfigured) return firebase.deleteAccount();
  const service = getClient();
  const { data: sessionData, error: sessionError } =
    await service.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session)
    throw new Error("Sign in before deleting your account.");
  const { data, error } = await service.functions.invoke("delete-account", {
    body: { confirmation: "DELETE_MY_ACCOUNT" },
  });
  if (error || data?.deleted !== true)
    throw new Error(
      "Your account could not be deleted. Please try again while online or contact support.",
    );
  const { error: signOutError } = await service.auth.signOut({
    scope: "local",
  });
  if (signOutError)
    throw new Error(
      "Your server account was deleted, but this device could not clear its session. Sign out again. Local projects remain on this device.",
    );
}
