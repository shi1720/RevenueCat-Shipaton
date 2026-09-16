#!/usr/bin/env node
/** Deploy only Unpause Hosting. Never changes the user's global GCP project. */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const project = "unpause-studio";
const localEnvironment = resolve(root, ".env.local");
if (existsSync(localEnvironment)) process.loadEnvFile(localEnvironment);
const requiredConfiguration = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];
if (requiredConfiguration.some((key) => !process.env[key]?.trim())) {
  throw new Error(
    "Firebase account configuration is incomplete. Set the four public Firebase fields from .env.example before replacing the live app.",
  );
}
if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== project) {
  throw new Error(
    "Firebase account project does not match the Hosting destination.",
  );
}
const config = JSON.parse(readFileSync(resolve(root, "firebase.json"), "utf8"));
if (config.hosting.site !== project || config.hosting.public !== "dist") {
  throw new Error(
    "Hosting destination changed. Review the dedicated Unpause project before deploying.",
  );
}
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--skip-build")) {
  throw new Error("Usage: node scripts/deploy-firebase.mjs [--skip-build]");
}
const env = {
  ...process.env,
  EXPO_PUBLIC_PRIVACY_URL: "https://unpause-studio.web.app/privacy",
  EXPO_PUBLIC_TERMS_URL: "https://unpause-studio.web.app/terms",
  EXPO_PUBLIC_SUPPORT_URL: "https://unpause-studio.web.app/support",
};
function run(command, parameters) {
  const result = spawnSync(command, parameters, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!args.includes("--skip-build"))
  run("npm", ["run", "export:web", "--", "--clear"]);
for (const file of [
  "index.html",
  "privacy.html",
  "terms.html",
  "support.html",
  "legal.css",
]) {
  if (!existsSync(resolve(root, "dist", file))) {
    throw new Error(
      `Missing dist/${file}. Run the web export before deployment.`,
    );
  }
}
const output = resolve(root, "dist");
const outputFiles = readdirSync(output, { recursive: true });
const fontFiles = outputFiles.filter((file) => file.endsWith(".ttf"));
if (fontFiles.length !== 5)
  throw new Error("Expected five exported brand fonts before deployment.");
const hasConfiguredApp = outputFiles
  .filter((file) => file.endsWith(".js"))
  .some((file) =>
    readFileSync(resolve(output, file), "utf8").includes(
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID.trim(),
    ),
  );
if (!hasConfiguredApp) {
  throw new Error(
    "The exported app does not contain the expected Firebase configuration. Rebuild before deploying.",
  );
}
run("npx", [
  "--yes",
  "firebase-tools@15.30.1",
  "deploy",
  "--only",
  "hosting",
  "--project",
  project,
  "--config",
  resolve(root, "firebase.json"),
  "--non-interactive",
]);
// A SPA fallback can return HTTP 200 for a missing font. Check bytes as well
// as status so a Hosting ignore rule cannot silently break typography again.
for (const file of fontFiles) {
  const response = await fetch(`https://${project}.web.app/${file}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const data = Buffer.from(await response.arrayBuffer());
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  if (
    !response.ok ||
    response.headers.get("content-type")?.includes("text/html") ||
    data.subarray(0, 4).toString("hex") !== "00010000" ||
    hash(data) !== hash(readFileSync(resolve(output, file)))
  ) {
    throw new Error(`Hosted font validation failed: ${file}`);
  }
}
console.log("Verified all five deployed font files against the local export.");
console.log("Unpause: https://unpause-studio.web.app");
