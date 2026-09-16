# Firebase Hosting

Unpause uses a dedicated Firebase project and site named `unpause-studio`. This is separate from every other Google Cloud/Firebase project in the account. No global `gcloud` project selection is needed or changed.

- App: https://unpause-studio.web.app
- Privacy: https://unpause-studio.web.app/privacy
- Terms: https://unpause-studio.web.app/terms
- Support: https://unpause-studio.web.app/support
- Owner/support: Shivam Gupta, shivam1720406@gmail.com
- Firebase project number: `186400719051`

## Deployment

The Expo web export copies the checked-in `public/` policy pages into `dist/`. Firebase serves actual static files before the app fallback. Clean URLs make the policies directly accessible without JavaScript. Authentication callback query parameters still reach the app entry point.

```sh
npm ci
# Authenticate if this machine does not already have a Firebase CLI session:
npx --yes firebase-tools@15.30.1 login
node scripts/deploy-firebase.mjs
```

The script loads ignored `.env.local`, requires all four public Firebase account fields, checks that their project matches the Hosting destination, and rejects an export without the expected Firebase app ID. This prevents a missing environment or stale `--skip-build` export from disabling live accounts. For a fresh build it clears Metro’s transform cache and exports the app with the public policy URLs, checks the required files, then deploys only Hosting to the explicit Unpause project and verifies the five hosted font binaries against their local SHA-256 hashes. It does not deploy functions, databases, storage rules, or other projects. Use `--skip-build` only after a verified current `npm run export:web` has produced `dist/`, including all public policy files.

Public configuration belongs in the build environment or ignored `.env.local`. Never place secret RevenueCat, service-role, OAuth, or deployment credentials in `EXPO_PUBLIC_*`. Firebase Hosting serves the static output, not the repository, `.env` files, source maps, or APKs. Firebase CLI credentials stay in the local CLI credential store. Avoid `firebase login:list --json` in logs: it can include tokens. Use normal status output or explicitly allowlist only account identifiers when inspecting programmatic results.

Security headers set no-sniff, frame denial, strict referrer handling, and disable unused microphone/geolocation permissions. HTML and policies revalidate; content-hashed Expo assets can cache immutably. API requests are made directly by the configured app providers over HTTPS.

## Cost and scope

The project was created without linking a billing account. `gcloud billing projects describe unpause-studio` reported `billingEnabled: false` on September 16, 2026. Firebase Hosting has a free allowance; its quotas still apply. No billing upgrade or paid service was enabled for this deployment. Review actual usage in the dedicated project's console before changing plans. [Official Hosting usage and quota documentation](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

Hosting publishes the browser app and legal pages. It does not publish the Android/iOS app to a store, configure real store products, or prove hackathon store eligibility. Account and payment readiness are verified separately from static hosting.

## Official references

- [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart)
- [Firebase CLI reference](https://firebase.google.com/docs/cli)
- [Hosting rewrites, clean URLs, and headers](https://firebase.google.com/docs/hosting/full-config)

## Deployment evidence

The initial local-mode app was published successfully on September 16, 2026. The initial publication was followed by the final configured release, containing 17 public files. A real Chromium session at 390 px loaded the app, entered Sample studio, and verified `/privacy`, `/terms`, and `/support`: all returned HTTP 200, had no horizontal overflow, and sent the configured no-sniff/frame-denial headers. No JavaScript errors occurred. The authentication callback URL also returned the app entry point.

A subsequent configured deployment enabled Firebase Authentication. Real hosted UI tests passed account creation, immediate sign-in, session persistence after reload, sign-out/sign-in, account deletion, and rejection of a deleted account’s login. Local sample projects survived account deletion. The live policies returned HTTP 200 with no mobile overflow or browser JavaScript errors. Full create, start session, reload, checkpoint, and finish workflows passed at 390 px and 1280 px. Wrong-password errors were actionable. All five hosted TTF files had valid binary signatures and all five browser font faces loaded. The final URLs use dedicated bundled font assets to bypass an earlier cached HTML fallback; fallback system fonts are also tested.

## Firebase Authentication setup

A Firebase web app was registered in the same dedicated project. Public client configuration is kept in ignored `.env.local` as `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, and `EXPO_PUBLIC_FIREBASE_APP_ID`. These identify the public Firebase app; they are not administrative credentials.

Email/password sign-in is enabled. Authorized domains are `unpause-studio.web.app`, `unpause-studio.firebaseapp.com`, and `localhost`. The configuration subtype is `FIREBASE_AUTH`; no upgrade to paid Identity Platform was made. Firebase's own hosted email action page handles password resets, returning to the public app.

The owner initialized Authentication through Firebase Console. Remaining configuration used the scoped [project config update API](https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig), explicitly targeting `unpause-studio` and updating only email sign-in, authorized domains, and the password policy. The server enforces a minimum password length of ten characters, matching the app. Existing fields were preserved. Never log the entire authentication config: it may contain sensitive password-hash configuration.

Provider verification on September 16, 2026: a synthetic account on reserved `example.com` successfully signed up, signed in, and returned its profile through the real Firebase REST API. Deletion succeeded, and a later sign-in was rejected. The temporary account was removed; no email was sent. The real hosted UI checks above independently verify app integration. A password-reset request made through the actual hosted UI to an owner-authorized Gmail alias returned HTTP 200 and the expected confirmation. Mailbox delivery and link completion are separate checks; provider acceptance alone does not establish either.

Free-plan operating limits still apply: Firebase currently documents 150 password-reset emails per day and 100 new accounts per hour per IP address, with abuse protections and possible quota changes. This app uses password sign-in, not the separately limited email-link sign-in product. [Official Firebase Authentication limits](https://firebase.google.com/docs/auth/limits).

Reproduce the real hosted smoke test with `node scripts/verify-firebase-live.mjs`. It creates a random synthetic account on reserved `example.com`, exercises only that account, and cleans it up. Random credentials remain in memory and are not written to the evidence report. The report is written to ignored `.codex-finalizer/firebase-live-account-evidence.json`.

The final hosted smoke run on September 16, 2026 at 13:43 UTC passed all eleven checks with no browser JavaScript errors. Its synthetic account was deleted. Native account verification is recorded in [native build evidence](native-build-evidence.md).

Password-reset delivery limitation: an authorized Gmail search, including spam/trash, found no matching message during the test window. The test account existed and matched the requested email exactly; Firebase used its default email delivery method. The temporary account was deleted after verification. Delivery and completing a reset link remain unverified.
