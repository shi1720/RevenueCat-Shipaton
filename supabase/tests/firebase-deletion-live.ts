/** Destructive checks are restricted to disposable accounts created by this run.
 * Usage: FIREBASE_SERVICE_ACCOUNT_PATH=/private/service-account.json
 * npx deno run --allow-all --config supabase/functions/delete-firebase-account/deno.json supabase/tests/firebase-deletion-live.ts
 * Optional: UNPAUSE_DELETION_ENDPOINT, REVENUECAT_CLI_PROFILE, REVENUECAT_PROJECT_ID,
 * UNPAUSE_LIVE_EVIDENCE_PATH. No secret values or generated identities are printed.
 */
import { cert, deleteApp, initializeApp } from "npm:firebase-admin@14.4.0/app";
import { getAuth } from "npm:firebase-admin@14.4.0/auth";

const privatePath = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_PATH");
if (!privatePath) throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is required");
const envText = await Deno.readTextFile(".env.local");
const apiKey = envText.match(
  /^EXPO_PUBLIC_FIREBASE_API_KEY\s*=\s*["']?([^\s"']+)/m,
)?.[1];
if (!apiKey) throw new Error("Public Firebase client configuration missing");
const credentials = JSON.parse(await Deno.readTextFile(privatePath));
if (credentials.project_id !== "unpause-studio")
  throw new Error("Refusing a different Firebase project");
const app = initializeApp(
  { credential: cert(credentials), projectId: "unpause-studio" },
  "unpause-deletion-live-check",
);
const auth = getAuth(app);
const endpoint =
  Deno.env.get("UNPAUSE_DELETION_ENDPOINT") ||
  "https://ljguedfuxpadvddzfgsj.supabase.co/functions/v1/delete-firebase-account";
const profile = Deno.env.get("REVENUECAT_CLI_PROFILE") || "unpause";
const project = Deno.env.get("REVENUECAT_PROJECT_ID") || "projb008cb09";
const evidencePath =
  Deno.env.get("UNPAUSE_LIVE_EVIDENCE_PATH") ||
  "docs/release/evidence/firebase-deletion-live-result.json";
const origin = "https://unpause-studio.web.app";
const created: string[] = [];
const checks: { name: string; passed: boolean; detail: string }[] = [];
let fatal = false;
function record(name: string, passed: boolean, detail: string) {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}: ${detail}`);
  if (!passed) throw new Error(`Check failed: ${name}`);
}
function code(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "unclassified";
}
async function rc(method: string, uid: string, body?: unknown) {
  if (!created.includes(uid)) throw new Error("Refusing unowned customer");
  const args = [
    "--yes",
    "@revenuecat/cli",
    "--profile",
    profile,
    "--project-id",
    project,
    "--json",
    "api",
    method,
    `/projects/${project}/customers${method === "POST" ? "" : `/${encodeURIComponent(uid)}`}`,
  ];
  if (body) args.push("--body", "@-");
  const process = new Deno.Command("npx", {
    args,
    stdin: body ? "piped" : "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  if (body) {
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify(body)));
    await writer.close();
  }
  const output = await process.output();
  let data: { error?: { type?: string }; data?: unknown };
  try {
    data = JSON.parse(
      new TextDecoder().decode(
        output.stdout.length ? output.stdout : output.stderr,
      ),
    );
  } catch {
    throw new Error("RevenueCat CLI returned an unreadable response");
  }
  return {
    success: output.success,
    missing: data.error?.type === "resource_missing",
  };
}
async function createIdentity(label: string) {
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const uid = `unpause-delete-check-${suffix}`;
  const email = `shivam1720406+unpause-delete-${suffix}@gmail.com`;
  const password = `Unpause!${crypto.randomUUID()}aA9`;
  await auth.createUser({ uid, email, password });
  created.push(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey!)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await response.json();
  if (!response.ok || typeof data.idToken !== "string")
    throw new Error(`Disposable ${label} sign-in failed`);
  return { uid, token: data.idToken as string, signedInAt: Date.now() };
}
async function post(
  token: string,
  body: unknown = { confirmation: "DELETE_MY_ACCOUNT" },
  requestOrigin: string | null = origin,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (requestOrigin !== null) headers.Origin = requestOrigin;
  const result = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  let data: Record<string, unknown> = {};
  try {
    data = await result.json();
  } catch {
    /* Never expose provider HTML/body. */
  }
  return {
    status: result.status,
    data,
    cors: result.headers.get("Access-Control-Allow-Origin"),
  };
}
async function absent(uid: string) {
  try {
    await auth.getUser(uid);
    return false;
  } catch (error) {
    if (code(error) === "auth/user-not-found") return true;
    throw error;
  }
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  // Start this clock first so other checks run during the genuine recent-login window.
  const oldLogin = await createIdentity("old login");
  const subject = await createIdentity("success");
  const customer = await rc("POST", subject.uid, { id: subject.uid });
  record(
    "temporary RevenueCat customer created",
    customer.success,
    "Created only the disposable Firebase UID for this run",
  );
  record(
    "temporary customer exists before deletion",
    (await rc("GET", subject.uid)).success,
    "Verified through RevenueCat v2",
  );
  const wrongBody = await post(subject.token, {
    confirmation: "DELETE_MY_ACCOUNT",
    uid: oldLogin.uid,
  });
  record(
    "foreign UID body rejected",
    wrongBody.status === 400 &&
      !(await absent(subject.uid)) &&
      !(await absent(oldLogin.uid)),
    `HTTP ${wrongBody.status}; both disposable identities retained`,
  );
  const forbidden = await post(
    subject.token,
    undefined,
    "https://attacker.invalid",
  );
  record(
    "foreign origin rejected",
    forbidden.status === 403 && forbidden.cors === null,
    `HTTP ${forbidden.status}; no permissive CORS`,
  );
  const tampered = subject.token.split(".");
  const payload = JSON.parse(
    atob(tampered[1].replaceAll("-", "+").replaceAll("_", "/")),
  );
  payload.aud = "foreign-project";
  tampered[1] = btoa(JSON.stringify(payload))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  const foreign = await post(tampered.join("."));
  record(
    "tampered foreign-audience token rejected",
    foreign.status === 401,
    `HTTP ${foreign.status}; test is tampered, not a genuine token issued by another project`,
  );
  let deletion = await post(subject.token);
  const statuses = [deletion.status];
  for (let retry = 0; deletion.status === 202 && retry < 4; retry++) {
    await sleep(5000);
    deletion = await post(subject.token);
    statuses.push(deletion.status);
  }
  record(
    "live deletion completes",
    deletion.status === 200 && deletion.data.deleted === true,
    `HTTP sequence ${statuses.join(", ")}; no queued response treated as success`,
  );
  record(
    "Firebase identity absent after success",
    await absent(subject.uid),
    "Firebase Admin returned auth/user-not-found",
  );
  record(
    "RevenueCat customer absent after success",
    (await rc("GET", subject.uid)).missing,
    "RevenueCat returned resource_missing",
  );
  // If asynchronous cleanup used all five rate-limit slots, allow the durable receipt replay window to reset.
  if (statuses.length >= 5) await sleep(61000);
  const replay = await post(subject.token);
  record(
    "lost-response replay",
    replay.status === 200 && replay.data.deleted === true,
    `HTTP ${replay.status}; same original ID token after Firebase deletion`,
  );

  const revoked = await createIdentity("revoked token");
  await sleep(1200);
  await auth.revokeRefreshTokens(revoked.uid);
  const revokedStatuses: number[] = [];
  for (let attempt = 0; attempt < 6; attempt++)
    revokedStatuses.push((await post(revoked.token)).status);
  record(
    "revoked token rejected",
    revokedStatuses.slice(0, 5).every((status) => status === 401) &&
      !(await absent(revoked.uid)),
    `First five requests: ${revokedStatuses.slice(0, 5).join(", ")}; identity retained`,
  );
  record(
    "distributed rate limit",
    revokedStatuses[5] === 429,
    `Sixth verified-subject request HTTP ${revokedStatuses[5]}`,
  );

  const native = await createIdentity("native request");
  const nativeDeletion = await post(native.token, undefined, null);
  record(
    "native request without Origin",
    nativeDeletion.status === 200 &&
      nativeDeletion.data.deleted === true &&
      nativeDeletion.cors === null,
    `HTTP ${nativeDeletion.status}; authentication still required`,
  );
  record(
    "already absent RevenueCat customer is idempotent",
    await absent(native.uid),
    "Firebase deleted only after RevenueCat missing-customer verification",
  );

  const waitMs = oldLogin.signedInAt + 302000 - Date.now();
  if (waitMs > 0) {
    console.log(
      `Waiting ${Math.ceil(waitMs / 1000)} seconds for a genuine login to become older than five minutes`,
    );
    const until = Date.now() + waitMs;
    while (Date.now() < until) {
      await sleep(Math.min(30000, until - Date.now()));
      console.log("Recent-login expiry check is still running");
    }
  }
  const stale = await post(oldLogin.token);
  record(
    "real stale login rejected",
    stale.status === 401 &&
      stale.data.code === "recent_login_required" &&
      !(await absent(oldLogin.uid)),
    `HTTP ${stale.status}; actual login older than five minutes retained`,
  );
} catch (error) {
  fatal = true;
  console.log(
    `Live check stopped: ${error instanceof Error && error.message.startsWith("Check failed:") ? error.message : code(error)}`,
  );
} finally {
  let cleanupErrors = 0;
  for (const uid of created) {
    try {
      const result = await rc("DELETE", uid);
      if (!result.success && !result.missing) cleanupErrors++;
    } catch {
      cleanupErrors++;
    }
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (code(error) !== "auth/user-not-found") cleanupErrors++;
    }
  }
  checks.push({
    name: "disposable identity cleanup",
    passed: cleanupErrors === 0,
    detail: `${created.length} disposable identities tracked; ${cleanupErrors} cleanup failures`,
  });
  await deleteApp(app);
  const evidence = {
    checkedAt: new Date().toISOString(),
    endpoint,
    firebaseProject: "unpause-studio",
    revenueCatProject: project,
    passed: !fatal && cleanupErrors === 0,
    checks,
    limitations: [
      "No real customer or purchase was used.",
      "Foreign-project case uses a tampered audience, not another project's genuine ID token.",
      "Provider-outage injection and partial-failure replay remain covered by local dependency tests, not live production configuration changes.",
    ],
  };
  await Deno.writeTextFile(
    evidencePath,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(`Redacted evidence written to ${evidencePath}`);
  if (fatal || cleanupErrors) Deno.exitCode = 1;
}
