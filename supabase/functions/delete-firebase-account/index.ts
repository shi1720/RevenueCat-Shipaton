import { cert, initializeApp } from "npm:firebase-admin@14.4.0/app";
import { getAuth } from "npm:firebase-admin@14.4.0/auth";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { createDeletionHandler, type Dependencies } from "./handler.ts";
import { createRevenueCatDeletion } from "./revenuecat.ts";

const origins = new Set([
  "https://unpause-studio.web.app",
  "https://unpause-studio.firebaseapp.com",
]);
let dependencies: Dependencies | null = null;
try {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const serviceAccount = JSON.parse(
    Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "null",
  );
  const revenueCatProjectId = Deno.env.get("REVENUECAT_PROJECT_ID");
  const revenueCatSecret = Deno.env.get("REVENUECAT_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (
    projectId &&
    serviceAccount?.project_id === projectId &&
    revenueCatProjectId &&
    revenueCatSecret &&
    url &&
    key
  ) {
    const auth = getAuth(
      initializeApp({ projectId, credential: cert(serviceAccount) }),
    );
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const rpc = async (name: string, args: Record<string, string>) => {
      const { data, error } = await db.rpc(name, args);
      if (error) throw new Error("Deletion coordination unavailable");
      return data;
    };
    dependencies = {
      verify: (token, revoked) => auth.verifyIdToken(token, revoked),
      deleteFirebase: (uid) => auth.deleteUser(uid),
      deleteRevenueCat: createRevenueCatDeletion(
        revenueCatProjectId,
        revenueCatSecret,
      ),
      consumeAttempt: async (subjectHash) =>
        (await rpc("consume_firebase_deletion_attempt", {
          subject_hash: subjectHash,
        })) === true,
      hasReceipt: async (tokenHash) =>
        (await rpc("has_firebase_deletion_receipt", {
          token_hash: tokenHash,
        })) === true,
      prepareReceipt: async (tokenHash) => {
        await rpc("prepare_firebase_deletion_receipt", {
          token_hash: tokenHash,
        });
      },
      now: Date.now,
    };
  }
} catch {
  /* Configuration errors stay generic; never log the service account. */
}
Deno.serve(createDeletionHandler(dependencies, origins));
