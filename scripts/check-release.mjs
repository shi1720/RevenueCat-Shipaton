#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const placeholder =
  /(?:your[_ -]|replace[_ -]|placeholder|example\.(?:com|org|net)|changeme|<|>)/i;

export function validateReleaseEnvironment(
  env,
  { platform = "android", requireEas = false } = {},
) {
  const failures = [];
  const value = (name) => (env[name] || "").trim();
  const requireValue = (name) => {
    if (!value(name) || placeholder.test(value(name)))
      failures.push(
        `${name}: set a real owner-controlled value before release.`,
      );
    return value(name);
  };
  const https = (name) => {
    const raw = requireValue(name);
    if (!raw) return;
    try {
      const url = new URL(raw);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.hostname.endsWith(".local")
      ) {
        failures.push(
          `${name}: use a public HTTPS URL without embedded credentials.`,
        );
      }
    } catch {
      failures.push(`${name}: use a valid public HTTPS URL.`);
    }
  };

  if (!["ios", "android", "web"].includes(platform))
    failures.push("--platform: choose ios, android, or web.");
  const store = value("EXPO_PUBLIC_ANDROID_STORE") || "google";
  if (!["google", "galaxy"].includes(store))
    failures.push("EXPO_PUBLIC_ANDROID_STORE: choose google or galaxy.");
  for (const name of [
    "EXPO_PUBLIC_PRIVACY_URL",
    "EXPO_PUBLIC_TERMS_URL",
    "EXPO_PUBLIC_SUPPORT_URL",
  ])
    https(name);
  const firebaseFields = [
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_APP_ID",
  ];
  if (firebaseFields.some((name) => value(name))) {
    for (const name of firebaseFields) requireValue(name);
    https("EXPO_PUBLIC_ACCOUNT_DELETION_URL");
  } else {
    https("EXPO_PUBLIC_SUPABASE_URL");
    const authKey = requireValue("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    if (authKey.startsWith("sb_secret_"))
      failures.push(
        "EXPO_PUBLIC_SUPABASE_ANON_KEY: use the publishable/anon key, never a server secret.",
      );
    if (authKey.split(".").length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(authKey.split(".")[1], "base64url").toString("utf8"),
        );
        if (payload.role !== "anon")
          failures.push(
            "EXPO_PUBLIC_SUPABASE_ANON_KEY: legacy JWT must have the anon role.",
          );
      } catch {
        failures.push("EXPO_PUBLIC_SUPABASE_ANON_KEY: invalid legacy JWT key.");
      }
    } else if (authKey && !authKey.startsWith("sb_publishable_")) {
      failures.push(
        "EXPO_PUBLIC_SUPABASE_ANON_KEY: expected a Supabase publishable key or legacy anon JWT.",
      );
    }
  }
  const keyName =
    platform === "ios"
      ? "EXPO_PUBLIC_REVENUECAT_IOS_KEY"
      : platform === "web"
        ? "EXPO_PUBLIC_REVENUECAT_WEB_KEY"
        : store === "galaxy"
          ? "EXPO_PUBLIC_REVENUECAT_GALAXY_KEY"
          : "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY";
  if (value("EXPO_PUBLIC_REVENUECAT_TEST_STORE") === "true")
    failures.push(
      "EXPO_PUBLIC_REVENUECAT_TEST_STORE: internal Test Store mode cannot be released.",
    );
  if (value("EXPO_PUBLIC_REVENUECAT_TEST_KEY"))
    failures.push(
      "EXPO_PUBLIC_REVENUECAT_TEST_KEY: remove the internal Test Store key from production builds.",
    );
  const billingKey = requireValue(keyName);
  if (billingKey.startsWith("test_"))
    failures.push(
      `${keyName}: simulated Test Store keys cannot be released; use this platform's real SDK key.`,
    );
  if (billingKey.startsWith("sk_"))
    failures.push(
      `${keyName}: secret keys must never appear in EXPO_PUBLIC variables.`,
    );
  if (billingKey && billingKey.length < 16)
    failures.push(`${keyName}: this value is too short to be a real SDK key.`);
  if (requireEas) {
    const projectId = requireValue("EAS_PROJECT_ID");
    if (
      projectId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        projectId,
      )
    )
      failures.push(
        "EAS_PROJECT_ID: use the UUID of your actual linked Expo project.",
      );
  }
  // Detect accidental server-secret exposure without printing any secret values.
  for (const [name, raw] of Object.entries(env)) {
    if (!name.startsWith("EXPO_PUBLIC_") || typeof raw !== "string" || !raw)
      continue;
    if (/^EXPO_PUBLIC_REVENUECAT_.*_KEY$/.test(name)) {
      if (raw.trim().startsWith("test_"))
        failures.push(
          `${name}: Test Store keys cannot be released on any platform.`,
        );
      if (raw.trim().startsWith("sk_"))
        failures.push(
          `${name}: secret keys must never appear in EXPO_PUBLIC variables.`,
        );
    }
    if (
      /(SERVICE_ROLE|SECRET_KEY|PRIVATE_KEY)/i.test(name) ||
      raw.startsWith("sb_secret_") ||
      raw.includes("-----BEGIN PRIVATE KEY-----")
    ) {
      failures.push(
        `${name}: remove this server secret from public build variables and rotate it if distributed.`,
      );
    }
  }
  return [...new Set(failures)];
}

async function main() {
  const { values } = parseArgs({
    options: {
      platform: { type: "string" },
      "require-eas": { type: "boolean" },
      "check-urls": { type: "boolean" },
      "if-production": { type: "boolean" },
    },
  });
  if (
    values["if-production"] &&
    !process.env.EAS_BUILD_PROFILE?.startsWith("production-")
  ) {
    console.log(
      "Production release gate skipped for this local/development/preview build.",
    );
    return;
  }
  require("@expo/env").load(process.cwd(), { silent: true });
  const platform =
    values.platform || process.env.EAS_BUILD_PLATFORM || "android";
  const failures = validateReleaseEnvironment(process.env, {
    platform,
    requireEas: Boolean(values["require-eas"]),
  });
  for (const name of ["assets/icon.png", "assets/adaptive-icon.png"]) {
    const path = resolve(name);
    if (!existsSync(path)) {
      failures.push(`${name}: generate the final app icon before release.`);
      continue;
    }
    const buffer = readFileSync(path);
    const valid =
      buffer.length > 24 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (
      !valid ||
      buffer.readUInt32BE(16) !== 1024 ||
      buffer.readUInt32BE(20) !== 1024
    )
      failures.push(`${name}: use a 1024 × 1024 PNG.`);
  }
  if (values["check-urls"] && failures.length === 0) {
    for (const name of [
      "EXPO_PUBLIC_PRIVACY_URL",
      "EXPO_PUBLIC_TERMS_URL",
      "EXPO_PUBLIC_SUPPORT_URL",
    ]) {
      try {
        const response = await fetch(process.env[name], {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        await response.body?.cancel();
        if (!response.ok || !response.url.startsWith("https:"))
          failures.push(
            `${name}: public HTTPS page did not return a successful response.`,
          );
      } catch {
        failures.push(
          `${name}: public page could not be reached within 15 seconds.`,
        );
      }
    }
  }
  if (failures.length) {
    console.error("Release configuration is incomplete:");
    for (const failure of failures) console.error(`- ${failure}`);
    console.error(
      "See docs/release/build.md. Local and preview builds still work without paid services.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `Production configuration checks passed for ${platform}${platform === "android" ? `/${process.env.EXPO_PUBLIC_ANDROID_STORE || "google"}` : ""}.`,
  );
  console.log(
    "This verifies configuration only; it does not prove authentication, billing, signing, or store acceptance.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch(() => {
    console.error(
      "Release check could not complete. Verify the command options and installed dependencies.",
    );
    process.exitCode = 1;
  });
}
