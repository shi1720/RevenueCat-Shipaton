# Firebase and RevenueCat account deletion

The `delete-firebase-account` Supabase Edge Function implements the endpoint required by `EXPO_PUBLIC_ACCOUNT_DELETION_URL`. It is separate from the earlier `delete-account` function, which accepts Supabase identities. Do not point Firebase clients at that older route.

The function is deployed at `https://ljguedfuxpadvddzfgsj.supabase.co/functions/v1/delete-firebase-account`. Its SQL migration and server secrets are configured. The migration was applied with a linked database query using its file, not `db push`; deployment does not establish that Supabase migration history is synchronized. The live verification script exercises only disposable owner-controlled identities and writes redacted results to `docs/release/evidence/firebase-deletion-live-result.json`. A deployed endpoint does not establish store purchase or store publication readiness.

## Security and completion behavior

- The only accepted body is `{"confirmation":"DELETE_MY_ACCOUNT"}`. Extra fields, including a UID, email, or customer ID, are rejected. The bounded body reader rejects requests above 1 KiB even without an honest Content-Length.
- Firebase Admin verifies the JWT signature, expiry, issuer and project audience, then checks revocation and disabled/deleted users. Authentication must be within five minutes. Token refresh does not extend that window. Firebase is initialized only when the configured project matches the service account's project.
- Browser origins are limited to `https://unpause-studio.web.app` and `https://unpause-studio.firebaseapp.com`. Native clients can omit Origin but must provide a valid token. Responses cannot be cached.
- An atomic PostgreSQL UPSERT allows five authenticated attempts per UID per minute across workers. Coordination stores SHA-256 hashes, not UIDs, raw tokens, emails, notes or photos. Revoked tokens can consume their own rate limit but cannot mutate any provider account.
- RevenueCat v2 project access is verified before accepting a missing customer. The backend deletes the customer with the verified Firebase UID and checks for a typed RevenueCat `resource_missing` response. A wrong project or generic HTTP 404 cannot count as success.
- RevenueCat v2 deletion is asynchronous. A queued response is followed by a customer read. If the customer still exists, the endpoint returns HTTP 202 with `deleted:false`; Firebase stays intact. The app tells the user to retry shortly.
- After RevenueCat confirms absence, an expiring receipt keyed by the ID token's SHA-256 hash is persisted before Firebase deletion. If that write fails, Firebase stays intact. If Firebase deletion fails, the user can retry with the still-existing identity. If the final successful HTTP response is lost, replaying the same recent ID token succeeds only when the durable receipt exists and Firebase now reports the account absent. A revoked token, a different token or an expired login cannot use that receipt.
- Both steps must complete before HTTP 200 `{"deleted":true}`. Provider bodies, secrets and identity details are never logged or returned. Firebase project records remain on the device. Store transactions are not cancelled or refunded by deleting a RevenueCat profile.

The app routes RevenueCat Test Store identities through this backend too. HTTP 202, 401 and 429 produce specific retry or sign-in instructions and never sign the user out as a successful deletion.

## Deployment

Use the existing Unpause Supabase project. The function does not require enabling Firebase billing and does not store project content in Supabase.

1. Review the linked project schema and migration history before making changes. For this deployment, `supabase/migrations/202609160002_firebase_deletion_coordination.sql` was applied through `supabase db query --linked --file supabase/migrations/202609160002_firebase_deletion_coordination.sql`. Reconcile that applied SQL with migration history before using `db push`; do not blindly apply all local migrations to an existing project. The private schema and all three RPC functions deny `anon` and `authenticated` access. Only the server service role can call the RPCs.
2. Configure these **server secrets** in Supabase, using a protected local environment file with mode 0600 and `supabase secrets set --env-file /absolute/private/path`. Do not paste values in terminal output, commit them or use Expo public variables:
   - `FIREBASE_PROJECT_ID=unpause-studio`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: single-line JSON for a dedicated service account in that same Firebase project. It needs Firebase Auth user lookup/deletion permissions, for example the Firebase Authentication Admin role. Do not use a broad project-owner service account.
   - `REVENUECAT_PROJECT_ID`: the actual RevenueCat project ID.
   - `REVENUECAT_SECRET_KEY`: a v2 secret key restricted to `customer_information:customers:read_write` and `project_configuration:projects:read` for the Unpause project.
3. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically by the Edge runtime. Never expose the service-role key to the app.
4. Deploy with `supabase functions deploy delete-firebase-account --no-verify-jwt`. The checked-in function config disables Supabase gateway JWT validation because Firebase Admin validates the Firebase token inside the endpoint.
5. Test the deployed URL using temporary owner-controlled accounts and record only redacted statuses and results.
6. After live verification succeeds, set `EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://PROJECT_REF.supabase.co/functions/v1/delete-firebase-account` and rebuild web and native apps. This URL is public; all administrative credentials stay server-side.

The receipt window is five minutes. Expired records are removed opportunistically by the next deletion request; rate-limit rows older than ten minutes are removed too. A quiet installation may retain expired opaque hashes until another deletion request arrives. They are unusable after expiry. If a strict wall-clock retention policy is required, schedule the same cleanup SQL through the database scheduler.

## Reproducible local checks

```sh
npm run typecheck
npm test
npm run export:web
npx --yes deno check --config supabase/functions/delete-firebase-account/deno.json supabase/functions/delete-firebase-account/index.ts
npx --yes deno test --allow-env --config supabase/functions/delete-firebase-account/deno.json supabase/functions/delete-firebase-account/auth-adapter.test.ts
```

Run `supabase/tests/firebase-deletion.sql` after the migration on an isolated local PostgreSQL database. It rolls back its test data and verifies the five-attempt limit, window reset, receipt expiry/cleanup, and denied client-role access. Local PostgreSQL verification also ran ten concurrent attempts against one digest: exactly five were allowed.

The Vitest suite exercises HTTP validation, UID isolation, recent authentication, revoked/expired/disabled sessions, provider and receipt failures, asynchronous cleanup, lost-response replay, rate limits and CORS. The Deno suite calls the actual Firebase Admin SDK and verifies foreign audience, foreign issuer and unsigned token rejection without credentials or network access. Stubbed provider tests establish application behavior, not successful live-provider deletion.

## Reproduce live verification

The script needs the dedicated Firebase service-account JSON in an owner-only local file, the public Firebase values in `.env.local`, and the authenticated RevenueCat CLI profile `unpause`. It never prints keys, passwords, tokens, emails or generated UIDs. It creates only disposable owner-controlled identities and cleans them up in `finally`.

```sh
FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/private/service-account.json npx --yes deno run --allow-all --config supabase/functions/delete-firebase-account/deno.json supabase/tests/firebase-deletion-live.ts
```

The actual recent-login test deliberately takes more than five minutes. RevenueCat cleanup can return HTTP 202 on several requests before a subsequent request completes. This is expected asynchronous provider behavior. The signed-in Firebase identity remains available while the app asks the user to retry.

## Live verification coverage

The completed live run on September 16, 2026 passed all 15 recorded checks. A real disposable RevenueCat customer required responses `202, 202, 200` before cleanup completed; separate reads confirmed both the RevenueCat customer and Firebase identity absent. The same original token successfully replayed the completed request. Revoked tokens returned 401, the sixth repeated subject request returned 429, and an actual login older than five minutes returned 401 while preserving its identity. Native requests without Origin worked, and four temporary Firebase identities were cleaned up with no errors. The evidence file contains no passwords, tokens, emails, generated UIDs or service-account credentials.

The foreign-audience live case used a tampered token, not a genuine token issued by another Firebase project. Real customer purchases were not involved. Provider outage injection and partial-failure behavior were verified in local dependency tests, without changing the deployed service's working secrets.

Before enabling billing, verify a successful recent-login deletion on a temporary Firebase and RevenueCat customer, then verify the customer and Firebase user are actually absent. Also test a revoked token, foreign-project token, login older than five minutes, body containing another UID, deliberately unavailable billing credentials, partial-failure retry, replay of the original request after a lost response, and sixth-attempt rate limiting. No test should target a real customer's account.

Sources: [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Firebase revocation checks](https://firebase.google.com/docs/auth/admin/manage-sessions), [RevenueCat customer deletion and asynchronous completion](https://www.revenuecat.com/docs/api-v2/customer), [RevenueCat project access](https://www.revenuecat.com/docs/api-v2/project), [RevenueCat typed errors](https://www.revenuecat.com/docs/api-v2).
