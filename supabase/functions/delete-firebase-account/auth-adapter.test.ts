import { initializeApp, deleteApp } from "npm:firebase-admin@14.4.0/app";
import { getAuth } from "npm:firebase-admin@14.4.0/auth";

// Exercises the actual Admin SDK token boundary, with no account or service key.
// Credentials throw if called: these invalid tokens must fail before admin access.
for (const [name, payload, header] of [
  [
    "foreign audience",
    {
      aud: "foreign-project",
      iss: "https://securetoken.google.com/unpause-test",
    },
    { alg: "RS256", kid: "invalid-test-key" },
  ],
  [
    "foreign issuer",
    {
      aud: "unpause-test",
      iss: "https://securetoken.google.com/foreign-project",
    },
    { alg: "RS256", kid: "invalid-test-key" },
  ],
  [
    "unsigned token",
    { aud: "unpause-test", iss: "https://securetoken.google.com/unpause-test" },
    { alg: "none" },
  ],
] as const) {
  Deno.test(
    `Firebase Admin rejects ${name} before credentials/network`,
    async () => {
      const app = initializeApp(
        {
          projectId: "unpause-test",
          credential: {
            getAccessToken: () => {
              throw new Error("Credentials must not be consulted");
            },
          },
        },
        name,
      );
      try {
        const encode = (object: unknown) =>
          btoa(JSON.stringify(object))
            .replaceAll("=", "")
            .replaceAll("+", "-")
            .replaceAll("/", "_");
        const now = Math.floor(Date.now() / 1000);
        const token = `${encode(header)}.${encode({ ...payload, sub: "test-uid", iat: now, exp: now + 3600, auth_time: now })}.invalid`;
        let rejected = false;
        try {
          await getAuth(app).verifyIdToken(token, true);
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !("code" in error) ||
            error.code !== "auth/argument-error"
          )
            throw error;
          rejected = true;
        }
        if (!rejected) throw new Error("Invalid token accepted");
      } finally {
        await deleteApp(app);
      }
    },
  );
}
