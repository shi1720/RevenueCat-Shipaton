# Firebase accounts

Firebase is the primary provider when all four `EXPO_PUBLIC_FIREBASE_*` fields in `.env.example` are present. These are public client configuration, not administrative credentials. Otherwise a complete Supabase configuration retains the earlier provider. With neither, the free local app still works. Changing providers does not migrate account identities or purchase ownership; no existing app customers were migrated during this setup.

Enable Email/Password under Firebase Authentication, authorize `unpause-studio.web.app` and `unpause-studio.firebaseapp.com`, and configure the password reset email template with the Unpause name. The SDK performs actual account creation, password sign-in, password reset, sign-out, and account deletion. Signup signs the user in immediately; email ownership is not a prerequisite for these local-only features. This app does not claim verified email ownership or use it to authorize shared data. Firebase password policy should require at least ten characters, matching app validation.

The default Firebase-hosted password action page validates the one-use reset code. Its Continue URL is `https://unpause-studio.web.app/`, served by the Firebase SPA rewrite. Resetting a password does not automatically sign the user into Unpause. Return to the app and sign in with the new password. No custom action-code parsing or password tokens appear in application URLs/logs.

After changing environment values, build with `npm run export:web -- --clear` to avoid stale Metro transforms. Run browser checks against a configured build with `E2E_AUTH_CONFIGURED=1 npm run test:e2e`; the default suite expects a credential-free export.

Web persistence uses Firebase's browser persistence. Native uses Firebase's official `getReactNativePersistence` adapter backed by the existing OS-encrypted SecureStore generation/chunk implementation, rather than unencrypted AsyncStorage. Firebase can silently choose memory if its initial storage probe fails, so the app performs an explicit secure-storage preflight and selects encrypted persistence with the public `setPersistence` API before native signup/sign-in. A failed probe blocks account creation/sign-in with a recoverable message; a later retry can succeed. iOS and Android bundles must be checked after changes; bundle success alone does not prove native session restoration on a physical device.

Firebase UID is the stable RevenueCat app-user ID through the existing billing facade. Repeated token refreshes preserve that identity; a real account switch invalidates stale billing work. Signing in does not upload or synchronize projects, notes, or photos. Account deletion leaves local projects intact until the separate explicit erase action.

## Purchase-data deletion gate

Without billing configured, `deleteUser` actually deletes the signed-in Firebase account. Firebase requires recent authentication; the app explains when the user must sign out/in and retry. No success is fabricated on a provider error.

Before configuring any RevenueCat key with Firebase accounts, deploy and verify a secure backend and set `EXPO_PUBLIC_ACCOUNT_DELETION_URL`. The release gate requires this URL. The backend is now deployed, with successful disposable-account live verification recorded in [the deletion evidence](evidence/firebase-deletion-live-result.json). The client refuses direct Firebase-only deletion when billing is configured and this endpoint is missing.

Endpoint contract:

- HTTPS `POST`, JSON body `{"confirmation":"DELETE_MY_ACCOUNT"}`, `Authorization: Bearer <fresh Firebase ID token>`.
- Verify the token with Firebase Admin against the configured project, including revocation and recent `auth_time` (for example five minutes). Derive the Firebase UID exclusively from the verified token. Never accept a target UID, email, or RevenueCat ID from the body.
- Restrict browser CORS to the actual app origin, accept the authorization header, rate-limit repeated attempts, and return non-sensitive errors. Native clients do not rely on CORS for authorization.
- Use a server-only RevenueCat secret to delete the customer matching that UID through the current official customer deletion API. A real not-found response can be idempotent success; authentication/service failures cannot. Removing a customer profile does not refund/cancel a store transaction, and store legally retained records may remain.
- Only after successful/idempotent purchase-profile cleanup, delete the Firebase Auth user with Firebase Admin. Return HTTP 200 JSON `{"deleted":true}` only when both steps are complete. Make retries safe when a first request partially succeeds.
- The client signs out only after this success response. It never sends a server key or treats an error response containing `deleted:true` as success.

A URL presence check is not proof of this behavior. Verify a real recent-login failure, revoked/foreign token rejection, attempted foreign UID, provider failure, retry, and successful deletion before enabling paid release.

Sources: [Firebase user management](https://firebase.google.com/docs/auth/web/manage-users), [Firebase Auth API and native persistence](https://firebase.google.com/docs/reference/js/auth), [Firebase auth dependencies](https://firebase.google.com/docs/auth/web/custom-dependencies).

The implementation is now available as a separate Supabase Edge Function. See [Firebase deletion backend](firebase-deletion-backend.md) for its deployment, required server secrets, asynchronous RevenueCat completion checks, durable retry behavior and local versus live verification boundaries. Test Store billing also requires this deletion endpoint.
