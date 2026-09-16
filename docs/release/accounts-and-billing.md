# Accounts and Studio billing

Unpause works locally with no credentials. Optional Supabase accounts establish a stable identity for RevenueCat purchases. Signing in does **not** upload or synchronize projects or photos. Studio is a single lifetime purchase; the app never grants a demo entitlement or treats a checkout attempt as success.

Implementation: `src/services/auth.ts`, `src/services/billing.ts`, and `supabase/functions/delete-account/index.ts`. Configuration belongs to Shivam Gupta's own Supabase, RevenueCat, and store accounts. No external account, deployment, payment processor, store listing, or live purchase has been provisioned or verified by these files alone.

## 1. Optional Supabase account setup

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard). Choose an appropriate region and store the database password privately.
2. From Project Settings → API / API Keys, copy the project URL and **publishable key** (or legacy `anon` key). Put them in a local, ignored `.env.local` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The variable retains `ANON` in its name but accepts the new publishable key. Never put a `service_role` or secret key in the app.
3. Enable Email authentication, require email confirmation, and set minimum password length to at least 10. Configure production SMTP and verify deliverability; the shared development mail service is insufficient for a public launch. [Official email/password guide](https://supabase.com/docs/guides/auth/passwords).
4. Set the Site URL to your deployed HTTPS app. Add callback redirect allowlist entries for `unpause://auth/callback**`, `https://YOUR_APP_HOST/**`, and `http://localhost:8081/**` only in development. The wildcard accommodates Supabase's generated `sb_flow_id` and the recovery query parameter. Keep the HTTPS domain exact rather than allowing arbitrary hosts.
5. Keep the Expo URL scheme `unpause`. Native callback: `unpause://auth/callback`; reset callback: `unpause://auth/callback?flow=recovery`. Web callback is `https://YOUR_APP_HOST/?auth=callback`, with `&flow=recovery` for password resets. The app exchanges the code, shows the password form for recovery, and clears callback parameters from browser history. [Deep-linking guide](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
6. Open confirmation/reset email on the same installation or browser where it was requested. PKCE binds its code to the local verifier. A link opened elsewhere displays a recoverable error; request a new email on that device. The SDK's `sb_flow_id` is passed through to the code exchange to support concurrent attempts. [PKCE guide](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
7. Deploy the account deletion function before distributing a build with sign-up enabled:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy delete-account
```

`supabase/config.toml` disables the legacy gateway JWT verifier only for this function. The function independently calls `auth.getUser(access_token)` against Supabase Auth, rejects invalid sessions, and derives the deletion target exclusively from the verified user. It never accepts a user ID from the client. Hosted functions already receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` securely. [Function auth guide](https://supabase.com/docs/guides/functions/auth).

### Database and RLS

No application SQL schema is necessary in v1. `supabase/migrations/202609160001_auth_only.sql` records that decision and creates no table, view, function, or bucket. Supabase manages `auth.users`; do not expose that table through public views. There are no app tables requiring RLS policies because project content stays local.

Do not advertise cloud backup, photo upload, or multi-device project sync. If these are introduced later, use a `user_id` foreign key with cascading deletion, enable RLS, and apply `auth.uid() = user_id` to both read/write policy expressions. Add two-user isolation tests and storage-owner deletion before shipping that separate feature.

### Session handling

Native tokens are stored using Expo SecureStore with device-only accessibility after first unlock. Large sessions are split into Unicode-safe chunks; an atomic manifest is updated only after all new chunks are written. Failed writes preserve the previous session. An incomplete stored session reports an error without erasing local projects. Native token refresh follows foreground app state.

On web, the Supabase SDK uses browser storage; protect the deployment from script injection, keep dependencies reviewed, and serve HTTPS. No tokens are printed by our service. The native crypto adapter supplies secure random values and SHA-256 for PKCE on Hermes. Local projects are device data, shared by local users of that device, and are not partitioned by account.

## 2. RevenueCat product setup

1. Create a [RevenueCat project](https://app.revenuecat.com/) owned by Shivam Gupta.
2. Add separate apps for Apple App Store, Google Play, Galaxy Store, and optionally RevenueCat Billing for web. Each platform requires its own public app SDK key and store configuration.
3. Create entitlement **`studio`**.
4. Create a **non-consumable one-time product** in each target store. Suggested ID: `unpause_studio_lifetime`. Do not create a renewing subscription or consumable for this offering. The store price is your actual checkout price; use the SDK's localized price string in the UI rather than a hardcoded amount.
5. Import the products into RevenueCat, attach all to `studio`, create offering **`default`**, add the built-in **Lifetime** package (`$rc_lifetime`), and make this offering current. The service intentionally ignores monthly, annual, custom, and other packages. It unlocks only an active `studio` entitlement with no expiry.
6. Copy public SDK keys into the appropriate `.env.local` fields from `.env.example`, or into the public build-time environment. Set `EXPO_PUBLIC_ANDROID_STORE=google` for Google builds and `galaxy` for Galaxy builds. Rebuild bundles after environment changes.
7. Configure store receipt validation and server notifications in RevenueCat using each store's instructions. Private store keys stay in RevenueCat's dashboard, never in the repository or app bundle.
8. Before enabling billing, set Edge Function secrets `REVENUECAT_ENABLED=true` and `REVENUECAT_SECRET_KEY` using Supabase Dashboard → Edge Functions → Secrets. Use a **secret API v1 key with customer deletion access**, not a public SDK key. The deletion route uses `DELETE https://api.revenuecat.com/v1/subscribers/{verified_supabase_user_id}` and URL-encodes the ID. [Customer deletion reference](https://www.revenuecat.com/docs/api-v1/customers).

Account deletion first removes the RevenueCat customer identity, then deletes the Supabase user. A provider error leaves the login account available to retry, and the app does not report success. If `REVENUECAT_ENABLED=true` but the server key is missing, deletion fails closed. Deleting an account does not refund an Apple/Google/Galaxy transaction, erase financial records retained by processors, or erase local projects. Account deletion and “erase device data” are separate actions. [Supabase user deletion behavior](https://supabase.com/docs/guides/auth/managing-user-data).

### iOS and Google Play

Use a development or store build with the native SDK included. Expo Go cannot perform native purchases. Configure the platform's sandbox testers/license testers and follow its distribution requirements. A successful Metro export is not proof that a store receipt or signing workflow is configured. Test checkout, cancellation, failed payment, reinstall/restore, refunds/revocation, and account changes on actual installed builds.

### Galaxy Store

The installed RevenueCat SDK includes `react-native-purchases-store-galaxy`. Android Galaxy builds configure `store: 'GALAXY'` with **`galaxyBillingMode: 'PRODUCTION'`** explicitly. The code never silently switches to TEST mode. Galaxy builds require the Galaxy-specific RevenueCat SDK key and actual Seller Portal integration. [SDK installation](https://www.revenuecat.com/docs/getting-started/installation/reactnative).

Follow the [Galaxy connection guide](https://www.revenuecat.com/docs/platform-resources/galaxy-platform-resources/galaxy-setup-guide): register the package in Seller Portal, create a service account with the required API permissions, and privately upload its key to RevenueCat. The Galaxy test purchase environment requires a physical Galaxy device signed in with a Samsung account. A developer may explicitly change `GALAXY_BILLING_MODE.PRODUCTION` to `TEST` in a dedicated local testing build; never submit that change for beta or production. The checked-in mode is real production billing, so do not assume tapping Purchase is free. No automated test here submits a real payment.

### Web

Web checkout uses RevenueCat Billing, not an iOS or Android store key. Connect your own supported payment processor and configure separate web one-time products mapped to the same entitlement. Put the RevenueCat Billing public key in `EXPO_PUBLIC_REVENUECAT_WEB_KEY`. The React Native SDK supports web package checkout. [Official web integration notes](https://www.revenuecat.com/docs/getting-started/installation/reactnative).

Web purchases require signing in so the Supabase user ID identifies the purchase across platforms. Web `restorePurchases` is unsupported: sign into the purchasing account and refresh Studio status instead. Native anonymous purchases can be restored using the store account; sign-in links identity through RevenueCat's documented login/alias behavior. Review the RevenueCat project's restore-transfer behavior for the support policy you intend to offer.

The app rejects RevenueCat `test_` simulated-store keys. Use real provider sandboxes for checkout testing. No local flag, account record, imported backup, or hardcoded “demo” state grants Studio.

## API contract for the app

| API | Result / behavior |
| --- | --- |
| `authConfigured` | Whether URL and public auth key are supplied; service creation is lazy. |
| `signUp(email, password)` | Supabase `{ user, session }`; a null session means email confirmation may still be required. |
| `signIn(email, password)` | Verified password response; errors propagate. |
| `getSession()` | `Session \| null`; local-only builds return null. |
| `subscribeAuth((session, event) => …)` | Returns unsubscribe; keep the callback synchronous to avoid the Supabase auth lock. |
| `handleAuthUrl(url)` | `{ handled, recovery }`; accepts only the app callback origin/path. |
| `resetPassword(email)` / `updatePassword(password)` | Sends a real reset request / updates an authenticated account's password. |
| `signOut()` | Signs this device out without deleting projects. |
| `deleteAccount()` | Requires authenticated server deletion success, then clears the session. |
| `billingConfigured` | Whether the current platform has a public billing key. |
| `initializeBilling(userId?)` | Initializes once; subsequent calls update identity. Omit the ID explicitly on sign-out. |
| `getStudioStatus()` | Boolean from real SDK entitlement data; no identity changes during reads. |
| `getStudioPackages()` | Lifetime packages only; empty if the offering is not configured. |
| `purchaseStudio(pkg)` | True only after checkout returns an active lifetime `studio` entitlement; cancellation and errors propagate. |
| `restoreStudio()` | Native store restoration; returns whether Studio is active; explains the unsupported web operation. |

All billing operations are serialized with identity changes. A response that becomes stale while identity changes is rejected instead of exposing another account's entitlement. Treat any sign-out/account change as an immediate reset of displayed account/Studio state until its new entitlement query resolves. Preserve purchase errors, including a “purchased but entitlement pending” outcome, so the UI never prompts users to pay twice accidentally.

## Verification and release evidence

Automated service tests cover missing credentials, pending email confirmation, real sign-in failure propagation, secure chunk persistence and failed writes, Unicode sessions, incomplete storage, PKCE callback validation/deduplication, failed deletion, store selection, Expo Go/simulated-store rejection, billing identity serialization, entitlement eligibility, checkout cancellation, and web restore limitations.

```sh
npx vitest run tests/accounts-billing.test.ts
npx deno check --config supabase/functions/delete-account/deno.json supabase/functions/delete-account/index.ts
```

The 14 service tests and Deno type check passed during implementation. These are mocked integration tests plus static checking, not live evidence from Supabase or a payment store. Before claiming accounts or purchases are launch-ready, complete a real sign-up → email confirmation → sign-in → reset → sign-out → sign-in → deletion cycle, then platform checkout/restore testing with owner-configured credentials. Verify the deletion endpoint rejects anonymous/expired sessions, ignores forged target IDs, and deletes only the authenticated test account.
