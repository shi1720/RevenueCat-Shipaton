#!/usr/bin/env node
/** Real hosted-account smoke test. Creates and deletes only its own synthetic account. */
import { chromium } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI can provide public configuration directly. */
}
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
if (!apiKey)
  throw new Error(
    "Set EXPO_PUBLIC_FIREBASE_API_KEY for cleanup safety before running this test.",
  );
const base = "https://unpause-studio.web.app";
const email = `unpause-ui-check-${randomBytes(6).toString("hex")}@example.com`;
const password = randomBytes(24).toString("base64url");
const redact = (value) =>
  value
    .replaceAll(password, "[redacted]")
    .replaceAll(email, "[synthetic account]");
const result = {
  at: new Date().toISOString(),
  base,
  checks: [],
  browserErrors: [],
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (error) => result.browserErrors.push(error.message));
let accountMayExist = false;
async function accountApi(method, data) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  return { ok: response.ok, body: await response.json() };
}
try {
  await page.goto(base, { waitUntil: "networkidle" });
  const fontUrls = await page.evaluate(() =>
    Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .filter((rule) => rule instanceof CSSFontFaceRule)
          .map(
            (rule) =>
              rule.style
                .getPropertyValue("src")
                .match(/url\(["']?([^"')]+)/)?.[1],
          )
          .filter(Boolean);
      } catch {
        return [];
      }
    }),
  );
  if (fontUrls.length !== 5)
    throw new Error("Expected five exported brand fonts.");
  for (const url of fontUrls) {
    const response = await page.request.get(new URL(url, base).href);
    const data = await response.body();
    if (
      !response.ok() ||
      response.headers()["content-type"]?.includes("text/html") ||
      data.subarray(0, 4).toString("hex") !== "00010000"
    )
      throw new Error(
        "Hosted font response is missing or is the SPA HTML fallback.",
      );
  }
  const fontStatus = await page.evaluate(async () => {
    const names = [
      "DMSans_400Regular",
      "DMSans_500Medium",
      "DMSans_700Bold",
      "Fraunces_500Medium",
      "Fraunces_500Medium_Italic",
    ];
    await Promise.all(
      names.map((name) => document.fonts.load(`16px "${name}"`)),
    );
    return names.every(
      (name) =>
        document.fonts.check(`16px "${name}"`) &&
        Array.from(document.fonts).find(
          (face) => face.family.replaceAll('"', "") === name,
        )?.status === "loaded",
    );
  });
  if (!fontStatus) throw new Error("Hosted brand fonts did not all load.");
  result.checks.push(
    "Five hosted TTF binaries have valid content, and all five font faces load",
  );
  await page.getByRole("button", { name: "Explore a sample studio" }).click();
  await page.getByRole("tab", { name: "Your corner", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in or create an account" })
    .click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  accountMayExist = true;
  await page
    .getByRole("button", { name: "Create my account", exact: true })
    .click();
  await page.getByText(`Signed in as ${email}`, { exact: true }).waitFor();
  result.checks.push("Live UI account creation and immediate sign-in");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Your corner", exact: true }).click();
  await page.getByText(`Signed in as ${email}`, { exact: true }).waitFor();
  result.checks.push("Signed-in session persists across reload");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in or create an account" })
    .click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password + "-wrong");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await page
    .getByText(
      "That email and password could not be verified. Try again or reset your password.",
      { exact: true },
    )
    .waitFor();
  result.checks.push("Wrong-password error is actionable and does not sign in");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await page.getByText(`Signed in as ${email}`, { exact: true }).waitFor();
  result.checks.push("Sign out and sign back in through live UI");
  await page
    .getByRole("button", { name: "Delete my account", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByText(
      "Your account was deleted. Your local projects are still here.",
      { exact: true },
    )
    .waitFor();
  accountMayExist = false;
  result.checks.push("Live UI account deletion succeeds");
  const denied = await accountApi("signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
  if (denied.ok) throw new Error("Deleted test account can still sign in.");
  result.checks.push("Deleted account sign-in is rejected by Firebase");
  await page.getByRole("tab", { name: "Project shelf", exact: true }).click();
  await page.getByText("The Sunday tote", { exact: true }).waitFor();
  result.checks.push("Account deletion preserves local sample projects");
  for (const route of ["/privacy", "/terms", "/support"]) {
    const response = await page.goto(base + route, {
      waitUntil: "networkidle",
    });
    if (response.status() !== 200) throw new Error(`${route} failed`);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`${route} overflows`);
    if (
      !(await page.locator('a[href^="mailto:shivam1720406@gmail.com"]').count())
    )
      throw new Error(`${route} lacks support contact`);
  }
  result.checks.push(
    "All public policy/contact pages return 200 and fit mobile",
  );
  for (const width of [390, 1280]) {
    const core = await browser.newPage({ viewport: { width, height: 900 } });
    core.on("pageerror", (error) => result.browserErrors.push(error.message));
    await core.goto(base, { waitUntil: "networkidle" });
    await core
      .getByRole("button", { name: "Make room for my projects", exact: true })
      .click();
    await core
      .getByRole("button", { name: "Add your first project", exact: true })
      .click();
    await core
      .getByLabel("Project name", { exact: true })
      .fill("Hosted herb box");
    await core.getByRole("button", { name: "Garden", exact: true }).click();
    await core
      .getByLabel("A little about it", { exact: true })
      .fill("A cedar box for kitchen herbs.");
    await core
      .getByLabel("Your next tiny step", { exact: true })
      .fill("Line the base with mesh.");
    await core
      .getByLabel("Where are the pieces?", { exact: true })
      .fill("On the balcony shelf.");
    await core
      .getByRole("button", { name: "Give it a place", exact: true })
      .click();
    await core
      .getByRole("heading", { name: "Hosted herb box", exact: true })
      .waitFor();
    await core
      .getByRole("button", { name: "Let’s make a little", exact: true })
      .click();
    await core
      .getByRole("button", { name: "Pause & leave a note", exact: true })
      .waitFor();
    await core.reload({ waitUntil: "networkidle" });
    await core
      .getByRole("button", { name: "Return to your session", exact: true })
      .click();
    await core
      .getByRole("button", { name: "Pause & leave a note", exact: true })
      .click();
    await core
      .getByLabel("Where did you stop?", { exact: true })
      .fill("Mesh is in. Drainage holes are clear.");
    await core
      .getByLabel("What’s the next tiny step?", { exact: true })
      .fill("Add the first layer of potting mix.");
    await core
      .getByRole("button", { name: "Save my place", exact: true })
      .click();
    await core
      .getByText("Add the first layer of potting mix.", { exact: true })
      .waitFor();
    await core
      .getByRole("button", { name: "Mark as finished", exact: true })
      .click();
    await core.getByRole("button", { name: "Continue", exact: true }).click();
    await core
      .getByRole("button", { name: "Make a little more", exact: true })
      .waitFor();
    await core.getByRole("button", { name: "Your shelf", exact: true }).click();
    await core.getByRole("button", { name: "Finished", exact: true }).click();
    await core
      .getByRole("button", { name: "Open Hosted herb box", exact: true })
      .waitFor();
    if (
      await core.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw new Error(`Core UI overflows at ${width}px`);
    result.checks.push(
      `Hosted create/session/reload/checkpoint/finish lifecycle at ${width}px`,
    );
    await core.close();
  }
  if (result.browserErrors.length)
    throw new Error("Unexpected browser errors; inspect test evidence.");
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.error = redact(error.message);
  process.exitCode = 1;
} finally {
  if (accountMayExist) {
    try {
      const session = await accountApi("signInWithPassword", {
        email,
        password,
        returnSecureToken: true,
      });
      if (session.ok) {
        const deleted = await accountApi("delete", {
          idToken: session.body.idToken,
        });
        result.cleanupSucceeded = deleted.ok;
      } else {
        result.cleanupSucceeded =
          session.body.error?.message === "USER_NOT_FOUND";
      }
    } catch (error) {
      result.cleanupSucceeded = false;
      result.cleanupError = redact(error.message);
    }
    if (!result.cleanupSucceeded) {
      result.passed = false;
      process.exitCode = 1;
    }
  }
  await browser.close();
  mkdirSync(".codex-finalizer", { recursive: true });
  writeFileSync(
    ".codex-finalizer/firebase-live-account-evidence.json",
    redact(JSON.stringify(result, null, 2)) + "\n",
  );
  console.log(redact(JSON.stringify(result, null, 2)));
}
