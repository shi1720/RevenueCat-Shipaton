import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" },
  constants: { appOwnership: null as string | null },
  store: new Map<string, string>(),
  failWrite: "",
  generation: 0,
  createClient: vi.fn(),
  auth: {
    getSession: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    startAutoRefresh: vi.fn(),
    stopAutoRefresh: vi.fn(),
  },
  invoke: vi.fn(),
  purchases: {
    configure: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    isAnonymous: vi.fn(),
    getCustomerInfo: vi.fn(),
    getOfferings: vi.fn(),
    purchasePackage: vi.fn(),
    restorePurchases: vi.fn(),
  },
}));
vi.mock("react-native", () => ({
  Platform: mocks.platform,
  AppState: { currentState: "active", addEventListener: vi.fn() },
}));
vi.mock("expo-constants", () => ({ default: mocks.constants }));
vi.mock("expo-crypto", () => ({
  randomUUID: () => `generation-${++mocks.generation}`,
  getRandomValues: vi.fn(),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: vi.fn(),
}));
vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => mocks.store.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (mocks.failWrite && key.includes(mocks.failWrite))
      throw new Error("Disk full");
    mocks.store.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mocks.store.delete(key);
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
  processLock: vi.fn(),
}));
vi.mock("react-native-purchases", () => ({ default: mocks.purchases }));

const inactive = { entitlements: { active: {} } };
const active = {
  entitlements: {
    active: { studio: { isActive: true, expirationDate: null } },
  },
};
const lifetime = {
  identifier: "$rc_lifetime",
  packageType: "LIFETIME",
  product: {},
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  for (const name of [
    "FIREBASE_API_KEY",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_APP_ID",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "REVENUECAT_IOS_KEY",
    "REVENUECAT_ANDROID_KEY",
    "REVENUECAT_GALAXY_KEY",
    "REVENUECAT_WEB_KEY",
    "ANDROID_STORE",
  ]) {
    vi.stubEnv(`EXPO_PUBLIC_${name}`, "");
  }
  mocks.platform.OS = "ios";
  mocks.constants.appOwnership = null;
  mocks.store.clear();
  mocks.failWrite = "";
  mocks.generation = 0;
  mocks.createClient.mockReturnValue({
    auth: mocks.auth,
    functions: { invoke: mocks.invoke },
  });
  mocks.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mocks.auth.signOut.mockResolvedValue({ error: null });
  mocks.purchases.getCustomerInfo.mockResolvedValue(inactive);
  mocks.purchases.isAnonymous.mockResolvedValue(false);
  mocks.purchases.logIn.mockResolvedValue({ customerInfo: inactive });
  mocks.purchases.logOut.mockResolvedValue(inactive);
});

function configureAuth() {
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "public-key");
}
async function nativeAdapter() {
  configureAuth();
  const auth = await import("../src/services/auth");
  await auth.getSession();
  return mocks.createClient.mock.calls[0][2].auth.storage as {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
}

describe("optional authentication and secure persistence", () => {
  it("keeps local mode credential-free and never invents a session", async () => {
    const auth = await import("../src/services/auth");
    expect(auth.authConfigured).toBe(false);
    expect(await auth.getSession()).toBeNull();
    await expect(
      auth.signIn("a@example.com", "valid-password"),
    ).rejects.toThrow("not configured");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("returns pending email confirmation honestly and propagates sign-in errors", async () => {
    configureAuth();
    mocks.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: "pending" } },
      error: null,
    });
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: new Error("Invalid credentials"),
    });
    const auth = await import("../src/services/auth");
    expect(
      (await auth.signUp("a@example.com", "valid-password")).session,
    ).toBeNull();
    await expect(auth.signIn("a@example.com", "incorrect")).rejects.toThrow(
      "Invalid credentials",
    );
    expect(mocks.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { emailRedirectTo: "unpause://auth/callback" },
      }),
    );
  });
  it("round-trips long Unicode sessions without splitting surrogate pairs", async () => {
    const storage = await nativeAdapter();
    const value = `${"a".repeat(399)}🎨${"🧵".repeat(1100)}`;
    await storage.setItem("session", value);
    expect(await storage.getItem("session")).toBe(value);
    for (const [key, chunk] of mocks.store) {
      if (key !== "unpause.session")
        expect(new TextEncoder().encode(chunk).byteLength).toBeLessThan(2048);
    }
  });
  it("keeps the previous session on a failed chunk or manifest write", async () => {
    const storage = await nativeAdapter();
    await storage.setItem("session", "original-token");
    mocks.failWrite = "generation-2.1";
    await expect(storage.setItem("session", "x".repeat(900))).rejects.toThrow(
      "Disk full",
    );
    expect(await storage.getItem("session")).toBe("original-token");
    mocks.failWrite = "unpause.session";
    await expect(storage.setItem("session", "replacement")).rejects.toThrow(
      "Disk full",
    );
    expect(await storage.getItem("session")).toBe("original-token");
  });
  it("reports incomplete stored sessions without erasing the stored manifest", async () => {
    const storage = await nativeAdapter();
    await storage.setItem("session", "original-token");
    mocks.store.delete("unpause.session.generation-1.0");
    await expect(storage.getItem("session")).rejects.toThrow("incomplete");
    expect(mocks.store.has("unpause.session")).toBe(true);
  });
  it("validates callback origin, exchanges PKCE flow IDs, and deduplicates links", async () => {
    configureAuth();
    mocks.auth.exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: null,
    });
    const auth = await import("../src/services/auth");
    expect(
      (await auth.handleAuthUrl("https://attacker.invalid/?code=bad")).handled,
    ).toBe(false);
    const url =
      "unpause://auth/callback?flow=recovery&code=single-use&sb_flow_id=abcdefgh";
    expect(await auth.handleAuthUrl(url)).toEqual({
      handled: true,
      recovery: true,
    });
    await auth.handleAuthUrl(url);
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith(
      "single-use",
      { flowId: "abcdefgh" },
    );
  });
  it("never reports account deletion or signs out after a failed server deletion", async () => {
    configureAuth();
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user" } } },
      error: null,
    });
    mocks.invoke.mockResolvedValue({
      data: null,
      error: new Error("Unavailable"),
    });
    const auth = await import("../src/services/auth");
    await expect(auth.deleteAccount()).rejects.toThrow("could not be deleted");
    expect(mocks.auth.signOut).not.toHaveBeenCalled();
    mocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    await auth.deleteAccount();
    expect(mocks.invoke).toHaveBeenCalledWith("delete-account", {
      body: { confirmation: "DELETE_MY_ACCOUNT" },
    });
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("real-store lifetime billing", () => {
  it("fails closed without keys, in Expo Go, and with simulated Test Store keys", async () => {
    let billing = await import("../src/services/billing");
    await expect(billing.getStudioStatus()).rejects.toThrow("not configured");
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "appl_public");
    mocks.constants.appOwnership = "expo";
    billing = await import("../src/services/billing");
    await expect(billing.initializeBilling()).rejects.toThrow("Expo Go");
    vi.resetModules();
    mocks.constants.appOwnership = null;
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "test_simulated");
    billing = await import("../src/services/billing");
    await expect(billing.initializeBilling()).rejects.toThrow("real store");
    expect(mocks.purchases.configure).not.toHaveBeenCalled();
  });
  it("uses the Galaxy app key and production billing mode explicitly", async () => {
    mocks.platform.OS = "android";
    vi.stubEnv("EXPO_PUBLIC_ANDROID_STORE", "galaxy");
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_GALAXY_KEY", "galaxy_public");
    const billing = await import("../src/services/billing");
    await billing.initializeBilling("account-id");
    expect(mocks.purchases.configure).toHaveBeenCalledExactlyOnceWith({
      apiKey: "galaxy_public",
      appUserID: "account-id",
      store: "GALAXY",
      galaxyBillingMode: "PRODUCTION",
    });
  });
  it("serializes account transitions and never implicitly logs out during entitlement reads", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "appl_public");
    const billing = await import("../src/services/billing");
    await billing.initializeBilling("first");
    let release!: () => void;
    mocks.purchases.logIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const login = billing.initializeBilling("second");
    const status = billing.getStudioStatus();
    await vi.waitFor(() =>
      expect(mocks.purchases.logIn).toHaveBeenCalledWith("second"),
    );
    expect(mocks.purchases.getCustomerInfo).not.toHaveBeenCalled();
    release();
    await login;
    expect(await status).toBe(false);
    expect(mocks.purchases.logOut).not.toHaveBeenCalled();
    await billing.initializeBilling();
    expect(mocks.purchases.logOut).toHaveBeenCalledOnce();
  });
  it("accepts only active lifetime entitlement and lifetime offering packages", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "appl_public");
    const billing = await import("../src/services/billing");
    mocks.purchases.getCustomerInfo.mockResolvedValue({
      entitlements: {
        active: { studio: { isActive: true, expirationDate: "2027-01-01" } },
      },
    });
    expect(await billing.getStudioStatus()).toBe(false);
    mocks.purchases.getCustomerInfo.mockResolvedValue(active);
    expect(await billing.getStudioStatus()).toBe(true);
    mocks.purchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [lifetime, { packageType: "MONTHLY" }] },
    });
    expect(await billing.getStudioPackages()).toEqual([lifetime]);
  });
  it("rejects stale entitlement results if identity changes while a request is in flight", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "appl_public");
    const billing = await import("../src/services/billing");
    await billing.initializeBilling("first");
    let release!: (value: typeof active) => void;
    mocks.purchases.getCustomerInfo.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const status = billing.getStudioStatus();
    const rejected = expect(status).rejects.toThrow("account changed");
    await vi.waitFor(() =>
      expect(mocks.purchases.getCustomerInfo).toHaveBeenCalledOnce(),
    );
    const logout = billing.initializeBilling();
    release(active);
    await rejected;
    await logout;
    expect(mocks.purchases.logOut).toHaveBeenCalledOnce();
  });
  it("does not unlock on cancellation or a receipt without the Studio entitlement", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "appl_public");
    const billing = await import("../src/services/billing");
    const pkg =
      lifetime as unknown as import("react-native-purchases").PurchasesPackage;
    mocks.purchases.purchasePackage.mockRejectedValue({ userCancelled: true });
    await expect(billing.purchaseStudio(pkg)).rejects.toMatchObject({
      userCancelled: true,
    });
    mocks.purchases.purchasePackage.mockResolvedValue({
      customerInfo: inactive,
    });
    await expect(billing.purchaseStudio(pkg)).rejects.toThrow("not active yet");
    mocks.purchases.purchasePackage.mockResolvedValue({ customerInfo: active });
    expect(await billing.purchaseStudio(pkg)).toBe(true);
  });
  it("does not invalidate an in-flight entitlement request on a token refresh for the same account", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_IOS_KEY", "appl_public");
    const billing = await import("../src/services/billing");
    await billing.initializeBilling("same-account");
    let release!: (value: typeof active) => void;
    mocks.purchases.getCustomerInfo.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const status = billing.getStudioStatus();
    await vi.waitFor(() =>
      expect(mocks.purchases.getCustomerInfo).toHaveBeenCalledOnce(),
    );
    const refreshIdentity = billing.initializeBilling("same-account");
    release(active);
    expect(await status).toBe(true);
    await refreshIdentity;
    expect(mocks.purchases.logIn).not.toHaveBeenCalled();
    expect(mocks.purchases.logOut).not.toHaveBeenCalled();
  });
  it("explains web restore limitations and requires identity before web checkout", async () => {
    mocks.platform.OS = "web";
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_WEB_KEY", "rcb_public");
    const billing = await import("../src/services/billing");
    await expect(billing.restoreStudio()).rejects.toThrow("purchasing account");
    await expect(
      billing.purchaseStudio(
        lifetime as unknown as import("react-native-purchases").PurchasesPackage,
      ),
    ).rejects.toThrow("Sign in");
    expect(mocks.purchases.purchasePackage).not.toHaveBeenCalled();
  });
});
