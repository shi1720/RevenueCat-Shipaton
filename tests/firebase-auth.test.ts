import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    "REVENUECAT_TEST_STORE",
    "REVENUECAT_TEST_KEY",
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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
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
  it.each(["web", "sandbox"])(
    "blocks incomplete %s purchase-profile deletion and accepts only verified server success",
    async (mode) => {
      configure();
      if (mode === "web")
        vi.stubEnv("EXPO_PUBLIC_REVENUECAT_WEB_KEY", "rcb_public");
      else {
        vi.stubEnv("EXPO_PUBLIC_REVENUECAT_TEST_STORE", "true");
        vi.stubEnv("EXPO_PUBLIC_REVENUECAT_TEST_KEY", "test_public");
      }
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
      const request = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ deleted: true }),
      });
      vi.stubGlobal("fetch", request);
      await expect(auth.deleteAccount()).rejects.toThrow(
        "could not be deleted",
      );
      expect(mocks.signOut).not.toHaveBeenCalled();
      for (const [status, message] of [
        [202, "still processing"],
        [401, "sign out and sign in again"],
        [429, "wait a minute"],
      ] as const) {
        request.mockResolvedValue({
          ok: status === 202,
          status,
          json: async () => ({ deleted: false }),
        });
        await expect(auth.deleteAccount()).rejects.toThrow(message);
        expect(mocks.signOut).not.toHaveBeenCalled();
      }
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
    },
  );
  it("uses the configured backend without local billing keys for purchases made on another platform", async () => {
    configure();
    vi.stubEnv(
      "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
      "https://example.com/delete",
    );
    mocks.user.getIdToken.mockResolvedValue("cross-platform-token");
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", request);
    const auth = await import("../src/services/auth");
    await auth.deleteAccount();
    expect(request).toHaveBeenCalledOnce();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
  it.each(["network", "unreadable success"])(
    "replays the original token after a lost %s response when Firebase can no longer refresh it",
    async (failure) => {
      configure();
      vi.stubEnv(
        "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
        "https://example.com/delete",
      );
      mocks.user.getIdToken
        .mockResolvedValueOnce("original-token")
        .mockRejectedValue({ code: "auth/user-not-found" });
      const request = vi.fn();
      if (failure === "network")
        request.mockRejectedValueOnce(new TypeError("Connection lost"));
      else
        request.mockResolvedValueOnce(
          new Response("incomplete", { status: 200 }),
        );
      request.mockResolvedValueOnce(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
      vi.stubGlobal("fetch", request);
      const auth = await import("../src/services/auth");
      await expect(auth.deleteAccount()).rejects.toThrow();
      expect(mocks.signOut).not.toHaveBeenCalled();
      await auth.deleteAccount();
      expect(mocks.user.getIdToken).toHaveBeenCalledOnce();
      expect(
        request.mock.calls.map((call) => call[1].headers.Authorization),
      ).toEqual(["Bearer original-token", "Bearer original-token"]);
      expect(mocks.signOut).toHaveBeenCalledOnce();
    },
  );
  it("expires an ambiguous deletion retry after five minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T00:00:00Z"));
    configure();
    vi.stubEnv(
      "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
      "https://example.com/delete",
    );
    mocks.user.getIdToken
      .mockResolvedValueOnce("old-token")
      .mockRejectedValue({ code: "auth/user-not-found" });
    const request = vi.fn().mockRejectedValue(new TypeError("Connection lost"));
    vi.stubGlobal("fetch", request);
    const auth = await import("../src/services/auth");
    await expect(auth.deleteAccount()).rejects.toThrow();
    vi.advanceTimersByTime(5 * 60 * 1000);
    await expect(auth.deleteAccount()).rejects.toThrow();
    expect(mocks.user.getIdToken).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledOnce();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it("does not replay another account's token after the active identity changes", async () => {
    configure();
    vi.stubEnv(
      "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
      "https://example.com/delete",
    );
    mocks.user.getIdToken.mockResolvedValue("first-token");
    const request = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Connection lost"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", request);
    const auth = await import("../src/services/auth");
    await expect(auth.deleteAccount()).rejects.toThrow();
    const secondUser = {
      uid: "second-user",
      getIdToken: vi.fn().mockResolvedValue("second-token"),
    };
    mocks.instance.currentUser = secondUser;
    await auth.deleteAccount();
    expect(secondUser.getIdToken).toHaveBeenCalledOnce();
    expect(request.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer second-token",
    );
  });
  it("invalidates a retry after authentication rejection", async () => {
    configure();
    vi.stubEnv(
      "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
      "https://example.com/delete",
    );
    mocks.user.getIdToken
      .mockResolvedValueOnce("rejected-token")
      .mockResolvedValueOnce("new-token");
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deleted: false }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", request);
    const auth = await import("../src/services/auth");
    await expect(auth.deleteAccount()).rejects.toThrow(
      "sign out and sign in again",
    );
    await auth.deleteAccount();
    expect(mocks.user.getIdToken).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer new-token",
    );
  });
});
