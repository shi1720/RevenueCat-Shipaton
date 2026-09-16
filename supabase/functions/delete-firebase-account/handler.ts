/** Dependency-injected HTTP boundary. No credentials or account identifiers are logged. */
export interface Claims {
  uid: string;
  auth_time: number;
}
export interface Dependencies {
  verify(token: string, checkRevoked: boolean): Promise<Claims>;
  deleteFirebase(uid: string): Promise<void>;
  deleteRevenueCat(uid: string): Promise<"deleted" | "pending">;
  consumeAttempt(subjectHash: string): Promise<boolean>;
  hasReceipt(tokenHash: string): Promise<boolean>;
  prepareReceipt(tokenHash: string): Promise<void>;
  now(): number;
}
export function errorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "";
}
const invalidAuth = new Set([
  "auth/argument-error",
  "auth/invalid-id-token",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/tenant-id-mismatch",
]);
async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function createDeletionHandler(
  deps: Dependencies | null,
  allowedOrigins: ReadonlySet<string>,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type",
    };
    if (origin && allowedOrigins.has(origin))
      headers["Access-Control-Allow-Origin"] = origin;
    const respond = (status: number, body: Record<string, unknown>) =>
      new Response(JSON.stringify(body), { status, headers });
    if (origin && !allowedOrigins.has(origin))
      return respond(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return respond(405, { error: "Method not allowed" });
    if (
      !request.headers
        .get("Content-Type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return respond(415, { error: "JSON required" });
    const authorization = request.headers.get("Authorization");
    if (!authorization || !/^Bearer [^\s]{1,8192}$/.test(authorization))
      return respond(401, { error: "Sign in required" });
    // Read incrementally so an omitted/false Content-Length cannot allocate an unbounded body.
    let body: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader)
        return respond(400, { error: "Deletion confirmation required" });
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 1024) {
          await reader.cancel();
          return respond(413, { error: "Request too large" });
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let position = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, position);
        position += chunk.length;
      }
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return respond(400, { error: "Invalid request" });
    }
    // Reject extra fields, including attempted foreign UID/email/customer ID selectors.
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !("confirmation" in body) ||
      body.confirmation !== "DELETE_MY_ACCOUNT"
    ) {
      return respond(400, { error: "Deletion confirmation required" });
    }
    if (!deps)
      return respond(503, { error: "Account deletion is not configured" });
    const token = authorization.slice(7);
    try {
      // First verifies signature, expiry, audience and issuer even for lost-response retries.
      const claims = await deps.verify(token, false);
      const age = deps.now() / 1000 - claims.auth_time;
      if (!claims.uid || !Number.isFinite(age) || age < 0 || age > 300) {
        return respond(401, {
          error: "Sign out and sign in again before deleting your account",
          code: "recent_login_required",
        });
      }
      const tokenHash = await hash(token);
      if (!(await deps.consumeAttempt(await hash(claims.uid)))) {
        headers["Retry-After"] = "60";
        return respond(429, {
          error: "Too many attempts. Please wait a minute.",
        });
      }
      try {
        const checked = await deps.verify(token, true);
        if (checked.uid !== claims.uid)
          return respond(401, { error: "Sign in required" });
      } catch (error) {
        // A receipt is written only after confirmed RevenueCat cleanup. An absent
        // Firebase user then proves both steps completed, even if the response was lost.
        if (
          errorCode(error) === "auth/user-not-found" &&
          (await deps.hasReceipt(tokenHash))
        )
          return respond(200, { deleted: true });
        throw error;
      }
      if ((await deps.deleteRevenueCat(claims.uid)) === "pending") {
        headers["Retry-After"] = "5";
        return respond(202, {
          deleted: false,
          error:
            "Purchase profile cleanup is still processing. Please retry shortly.",
        });
      }
      // Fail closed before deleting Firebase if the durable retry receipt cannot be saved.
      await deps.prepareReceipt(tokenHash);
      try {
        await deps.deleteFirebase(claims.uid);
      } catch (error) {
        if (errorCode(error) !== "auth/user-not-found") throw error;
      }
      return respond(200, { deleted: true });
    } catch (error) {
      if (invalidAuth.has(errorCode(error)))
        return respond(401, { error: "Session expired. Sign in again." });
      return respond(503, {
        error: "Account deletion is temporarily unavailable. Please retry.",
      });
    }
  };
}
