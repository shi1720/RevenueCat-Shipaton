import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  platform: { OS: "web" },
  user: {
    uid: "firebase-user",
    email: "maker@example.com",
    getIdToken: vi.fn(),
  },
  instance: { currentUser: null as unknown, authStateReady: vi.fn() },
  initializeApp: vi.fn(),
  getAuth: vi.fn(),
  initializeAuth: vi.fn(),
  persistence: vi.fn(),
  setPersistence: vi.fn(),
  create: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
  deleteUser: vi.fn(),
  onToken: vi.fn(),
  storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("react-native", () => ({
  Platform: mocks.platform,
  AppState: { addEventListener: vi.fn() },
}));
vi.mock("expo-crypto", () => ({}));
vi.mock("../src/services/secureAuthStorage", () => ({
  nativeStorage: mocks.storage,
}));
vi.mock("firebase/app", () => ({
  getApps: () => [],
  initializeApp: mocks.initializeApp,
}));
vi.mock("firebase/auth", () => ({
  getAuth: mocks.getAuth,
  initializeAuth: mocks.initializeAuth,
  getReactNativePersistence: mocks.persistence,
  setPersistence: mocks.setPersistence,
  createUserWithEmailAndPassword: mocks.create,
  signInWithEmailAndPassword: mocks.signIn,
  signOut: mocks.signOut,
  sendPasswordResetEmail: mocks.reset,
  updatePassword: mocks.update,
  deleteUser: mocks.deleteUser,
  onIdTokenChanged: mocks.onToken,
}));
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  for (const key of [
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
    "ACCOUNT_DELETION_URL",
  ])
    vi.stubEnv(`EXPO_PUBLIC_${key}`, "");
  mocks.platform.OS = "web";
  mocks.instance.currentUser = mocks.user;
  mocks.getAuth.mockReturnValue(mocks.instance);
  mocks.initializeAuth.mockReturnValue(mocks.instance);
  mocks.create.mockResolvedValue({ user: mocks.user });
  mocks.signIn.mockResolvedValue({ user: mocks.user });
});
function configure() {
  vi.stubEnv("EXPO_PUBLIC_FIREBASE_API_KEY", "public-api-key");
  vi.stubEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID", "unpause-studio");
  vi.stubEnv(
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "unpause-studio.firebaseapp.com",
  );
  vi.stubEnv("EXPO_PUBLIC_FIREBASE_APP_ID", "public-app-id");
}
describe("Firebase account facade", () => {
  it("does not configure partial credentials or invent a local account", async () => {
    vi.stubEnv("EXPO_PUBLIC_FIREBASE_API_KEY", "partial");
    const auth = await import("../src/services/auth");
    expect(auth.authConfigured).toBe(false);
    expect(await auth.getSession()).toBeNull();
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });
  it("prefers configured Firebase and maps real signup and session identity", async () => {
    configure();
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_URL", "https://unused.supabase.co");
    vi.stubEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", "unused");
    const auth = await import("../src/services/auth");
    expect(auth.authProvider).toBe("firebase");
    expect(
      (await auth.signUp(" maker@example.com ", "strong-password")).session,
    ).toEqual({ user: { id: "firebase-user", email: "maker@example.com" } });
    expect(mocks.create).toHaveBeenCalledWith(
      mocks.instance,
      "maker@example.com",
      "strong-password",
    );
    expect(await auth.getSession()).toEqual({
      user: { id: "firebase-user", email: "maker@example.com" },
    });
    expect(mocks.instance.authStateReady).toHaveBeenCalledOnce();
  });
  it("uses the encrypted native adapter and reports token refresh separately", async () => {
    configure();
    mocks.platform.OS = "ios";
    mocks.persistence.mockReturnValue("secure");
    const auth = await import("../src/services/auth");
    await auth.getSession();
    expect(mocks.persistence).toHaveBeenCalledWith(mocks.storage);
    expect(mocks.setPersistence).toHaveBeenCalledWith(mocks.instance, "secure");
    expect(mocks.storage.setItem).toHaveBeenCalledWith(
      "firebase.secure-session-ready",
      "ready",
    );
    expect(mocks.initializeAuth).toHaveBeenCalledWith(undefined, {
      persistence: "secure",
    });
    const listener = vi.fn();
    auth.subscribeAuth(listener);
    const callback = mocks.onToken.mock.calls[0][1];
    callback(mocks.user);
    callback(mocks.user);
    callback(null);
    expect(listener.mock.calls.map((call) => call[1])).toEqual([
      "SIGNED_IN",
      "TOKEN_REFRESHED",
      "SIGNED_OUT",
    ]);
  });
  it("refuses native signup before a failed secure-storage probe and safely retries", async () => {
    configure();
    mocks.platform.OS = "android";
    mocks.persistence.mockReturnValue("secure");
    mocks.storage.setItem.mockRejectedValueOnce(new Error("Device locked"));
    const auth = await import("../src/services/auth");
    await expect(
      auth.signUp("maker@example.com", "strong-password"),
    ).rejects.toThrow("Secure account storage is unavailable");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.setPersistence).not.toHaveBeenCalled();
    await auth.signUp("maker@example.com", "strong-password");
    expect(mocks.setPersistence).toHaveBeenCalledWith(mocks.instance, "secure");
    expect(mocks.create).toHaveBeenCalledOnce();
  });
  it("sends real password recovery through the hosted handler and leaves Supabase links alone", async () => {
    configure();
    const auth = await import("../src/services/auth");
    await auth.resetPassword("maker@example.com");
    expect(mocks.reset).toHaveBeenCalledWith(
      mocks.instance,
      "maker@example.com",
      { url: "https://unpause-studio.web.app/", handleCodeInApp: false },
    );
    expect(
      await auth.handleAuthUrl("unpause://auth/callback?code=unused"),
    ).toEqual({ handled: false, recovery: false });
  });
  it("reports real failures and never fabricates successful login or deletion", async () => {
    configure();
    const auth = await import("../src/services/auth");
    mocks.signIn.mockRejectedValue({ code: "auth/invalid-credential" });
    await expect(
      auth.signIn("maker@example.com", "wrong-password"),
    ).rejects.toThrow("could not be verified");
    mocks.deleteUser.mockRejectedValue({ code: "auth/requires-recent-login" });
    await expect(auth.deleteAccount()).rejects.toThrow(
      "sign out and sign in again",
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
    mocks.deleteUser.mockResolvedValue(undefined);
    await auth.deleteAccount();
    expect(mocks.deleteUser).toHaveBeenCalledWith(mocks.user);
  });
  it("blocks incomplete purchase-profile deletion and accepts only verified server success", async () => {
    configure();
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_WEB_KEY", "rcb_public");
    const auth = await import("../src/services/auth");
    await expect(auth.deleteAccount()).rejects.toThrow(
      "secure purchase-data deletion service",
    );
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    vi.stubEnv(
      "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
      "https://example.com/delete-account",
    );
    mocks.user.getIdToken.mockResolvedValue("test-id-token");
    const request = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ deleted: true }) });
    vi.stubGlobal("fetch", request);
    await expect(auth.deleteAccount()).rejects.toThrow("could not be deleted");
    expect(mocks.signOut).not.toHaveBeenCalled();
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: true }),
    });
    await auth.deleteAccount();
    expect(request).toHaveBeenLastCalledWith(
      "https://example.com/delete-account",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-id-token",
        },
        body: '{"confirmation":"DELETE_MY_ACCOUNT"}',
      }),
    );
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.instance);
    vi.unstubAllGlobals();
  });
});
