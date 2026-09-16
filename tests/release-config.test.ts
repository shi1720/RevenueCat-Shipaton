import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateReleaseEnvironment } from "../scripts/check-release.mjs";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const name of [
    "EAS_BUILD_PROFILE",
    "UNPAUSE_BUILD_DISTRIBUTION",
    "EXPO_PUBLIC_REVENUECAT_TEST_STORE",
    "EXPO_PUBLIC_ANDROID_STORE",
  ])
    vi.stubEnv(name, "");
});

describe("Test Store distribution guard", () => {
  it("leaves the default configuration on real store billing", async () => {
    const { default: config } = await import("../app.config");
    expect(config.extra?.revenueCatTestStore).toBe(false);
  });
  it("requires an explicit internal build context", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_TEST_STORE", "true");
    await expect(import("../app.config")).rejects.toThrow(
      "restricted to internal",
    );
  });
  it.each(["development", "preview", "preview-test-store"])(
    "permits the %s internal profile",
    async (profile) => {
      vi.stubEnv("EXPO_PUBLIC_REVENUECAT_TEST_STORE", "true");
      vi.stubEnv("EAS_BUILD_PROFILE", profile);
      const { default: config } = await import("../app.config");
      expect(config.extra?.revenueCatTestStore).toBe(true);
    },
  );
  it("permits explicitly marked local internal builds", async () => {
    vi.stubEnv("EXPO_PUBLIC_REVENUECAT_TEST_STORE", "true");
    vi.stubEnv("UNPAUSE_BUILD_DISTRIBUTION", "internal");
    const { default: config } = await import("../app.config");
    expect(config.extra?.revenueCatTestStore).toBe(true);
  });
  it.each([
    "production-google",
    "production-galaxy",
    "production-ios",
    "store",
  ])(
    "rejects sandbox mode in %s even with the local override",
    async (profile) => {
      vi.stubEnv("EXPO_PUBLIC_REVENUECAT_TEST_STORE", "true");
      vi.stubEnv("UNPAUSE_BUILD_DISTRIBUTION", "internal");
      vi.stubEnv("EAS_BUILD_PROFILE", profile);
      await expect(import("../app.config")).rejects.toThrow(
        "restricted to internal",
      );
    },
  );
  it("rejects sandbox mode, dedicated test keys, and platform test keys at the release gate", () => {
    const failures = validateReleaseEnvironment({
      EXPO_PUBLIC_REVENUECAT_TEST_STORE: "true",
      EXPO_PUBLIC_REVENUECAT_TEST_KEY: "test_internal_fixture",
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "test_platform_fixture",
    });
    expect(failures).toContain(
      "EXPO_PUBLIC_REVENUECAT_TEST_STORE: internal Test Store mode cannot be released.",
    );
    expect(failures).toContain(
      "EXPO_PUBLIC_REVENUECAT_TEST_KEY: remove the internal Test Store key from production builds.",
    );
    expect(
      failures.some((message: string) =>
        message.includes("Test Store keys cannot be released"),
      ),
    ).toBe(true);
  });
});

it("rejects test keys for a different platform from the release target", () => {
  const failures = validateReleaseEnvironment(
    {
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "goog_real_key_fixture",
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: "test_internal_fixture",
    },
    { platform: "android" },
  );
  expect(failures).toContain(
    "EXPO_PUBLIC_REVENUECAT_IOS_KEY: Test Store keys cannot be released on any platform.",
  );
});
