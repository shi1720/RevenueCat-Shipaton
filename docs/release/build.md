# Build and release Unpause

Unpause is one Expo React Native codebase for iOS, Android, and web. It runs locally without credentials. This document distinguishes a JavaScript export, an installable native binary, and a published store release: they are separate milestones.

## Identities and distribution profiles

`app.config.ts` is the single Expo config; it replaces the starter `app.json`. The product name is **Unpause**, created by Shivam Gupta. iPhone, iPad, tablets, foldables, landscape, and resizable Android windows are supported by configuration. Layout and native behavior still need device verification.

| EAS profile | Platform / output | Identity and purpose |
| --- | --- | --- |
| `development` | Android APK; iOS simulator app | Google package; developer tools and Metro; requires `expo-dev-client`. |
| `preview` | Android APK; iOS simulator app | Google package; bundled local/demo testing without developer tools. |
| `preview-galaxy` | Android APK | Galaxy package; bundled testing on Samsung devices. |
| `production-google` | Android AAB | `com.shivamgupta.unpause`; Google Play submission artifact. |
| `production-galaxy` | Android APK | `com.shivamgupta.unpause.galaxy`; Galaxy Store submission artifact. |
| `production-ios` | iOS device IPA | `com.shivamgupta.unpause`; App Store/TestFlight submission artifact. |

Set `EXPO_PUBLIC_ANDROID_STORE=galaxy` for Galaxy configuration. EAS profiles set this automatically; manual Expo/prebuild commands must set it explicitly. Galaxy and Google installs have distinct Android application IDs, local storage, signing registrations, store products, and RevenueCat app keys. **The Galaxy APK cannot update the Google package.** Use the matching store registration throughout. iOS always uses `com.shivamgupta.unpause`.

There is no invented Expo owner, EAS project UUID, Apple team, or store credential in the config. Optional `EXPO_OWNER` and `EAS_PROJECT_ID` are read from the owner-controlled build environment. No OTA update service is configured by this release. EAS uses remotely managed build numbers with `autoIncrement` in production profiles; the visible app version starts at `1.0.0`.

## Reproduce local checks

Use Node 22.13+ (CI pins 22.16.0) and npm. The exact dependency tree is committed in `package-lock.json`.

```sh
npm ci
npm run typecheck
npm test
npm run export:web
npm run export:native
EXPO_PUBLIC_ANDROID_STORE=galaxy npx expo export --platform android --output-dir dist-galaxy
npx expo-doctor
```

Exports validate JavaScript and asset bundling. They do not run Gradle/Xcode, sign binaries, exercise device permissions, validate a store receipt, or publish a listing.

Native persistence uses atomic generations of 256 KiB JSON chunks, capped at 20 MB per workspace. The Android plugin sets AsyncStorage capacity to 64 MB so old/new generations can coexist until commit. Photo files stay outside AsyncStorage. Before committing records, native photo references are budgeted against a 28 MB portable archive cap (including repeated cover/history references); compact exported JSON must remain below 30 MB. Each image is capped at 5 MB. Web embeds photos in its record and is subject to both the 20 MB app limit and the browser's often-smaller storage quota. These are explicit technical limits, not a promise of unlimited storage.

Inspect native configuration without generating native projects:

```sh
npx expo config --type introspect
EXPO_PUBLIC_ANDROID_STORE=galaxy npx expo config --type public
```

Google and Galaxy config resolution and native plugin introspection were verified during implementation. The plugin sets MainActivity `singleTop` for purchase flow return and `resizeableActivity=true`. Native module autolinking includes RevenueCat and its supported Galaxy add-on. The app chooses the correct store at runtime from its build-time environment; the presence of the add-on does not select Galaxy automatically. [RevenueCat Android setup](https://www.revenuecat.com/docs/getting-started/installation/android), [Galaxy React Native setup](https://www.revenuecat.com/docs/getting-started/installation/reactnative).

## Installable builds without store submission

### Android local tooling

Install Android Studio, an SDK compatible with Expo 57, and a matching JDK. Let Expo select the SDK build defaults; do not downgrade target SDK to bypass a build failure.

```sh
npx expo run:android
```

For a clean Galaxy native generation, only after confirming there are no manual native edits to preserve:

```sh
EXPO_PUBLIC_ANDROID_STORE=galaxy npx expo prebuild --platform android --clean
EXPO_PUBLIC_ANDROID_STORE=galaxy npx expo run:android
```

Generated `android/` and `ios/` directories are ignored by git. `prebuild --clean` replaces them, so preserve any intentional native edits in config plugins first. A debug build is a development artifact and may require Metro. Use EAS `preview` for an APK with its release JavaScript bundle included. A device can sideload APKs, but that does not constitute Galaxy or Google publication. [Expo APK guide](https://docs.expo.dev/build-reference/apk/).

### EAS preview

1. Create/sign into your own Expo account: `npx eas-cli login`.
2. Run `npx eas-cli init` interactively to create or link the real project. Record its UUID as `EAS_PROJECT_ID` in your environment; the dynamic config reads this value.
3. Configure Android signing interactively in EAS. Keep the keystore backed up securely and out of git. Subsequent updates must retain compatible signing identity.
4. Request a preview build:

```sh
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile preview-galaxy
npx eas-cli build --platform ios --profile preview
```

The iOS preview/development profiles target the simulator and do not produce an IPA for a physical iPhone. For iPhone testing, use an owner-authorized Apple development setup or the production iOS profile/TestFlight after configuring Apple credentials. Apple developer enrollment and Google Play enrollment may require fees; neither is assumed completed. [EAS profile reference](https://docs.expo.dev/build/eas-json/).

## Production release gate

The paid/account-enabled production release requires all of the following environment variables:

| Variable | Required value |
| --- | --- |
| `EXPO_PUBLIC_PRIVACY_URL` | Real, publicly accessible HTTPS privacy page. |
| `EXPO_PUBLIC_TERMS_URL` | Real, publicly accessible HTTPS terms page. |
| `EXPO_PUBLIC_SUPPORT_URL` | Real, publicly accessible HTTPS support/contact page. |
| `EXPO_PUBLIC_SUPABASE_URL` | The owner's HTTPS Supabase project endpoint. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key or legacy `anon` JWT; never `service_role`. |
| Platform RevenueCat public key | `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `...ANDROID_KEY`, `...GALAXY_KEY`, or `...WEB_KEY`, depending on target. |
| `EXPO_PUBLIC_ANDROID_STORE` | `google` or `galaxy` for the Android variant. |
| `EAS_PROJECT_ID` | Actual Expo project UUID when requiring EAS build configuration. |

Set public SDK configuration using the selected EAS environment (development, preview, production), with plaintext or sensitive visibility; these values ultimately become public in the client bundle. Never put private billing keys, signing keys, database credentials, or service-role secrets in `EXPO_PUBLIC_*`. Server deletion secrets belong only in Supabase. [EAS environment behavior](https://docs.expo.dev/eas/environment-variables/usage/).

The gate loads the same Expo `.env` files as development, including ignored `.env.local`, without printing key values:

```sh
node scripts/check-release.mjs --platform ios --require-eas --check-urls
EXPO_PUBLIC_ANDROID_STORE=google node scripts/check-release.mjs --platform android --require-eas --check-urls
EXPO_PUBLIC_ANDROID_STORE=galaxy node scripts/check-release.mjs --platform android --require-eas --check-urls
node scripts/check-release.mjs --platform web --check-urls
```

Missing values, placeholders, insecure URLs, incorrect Supabase JWT roles, public server secrets, simulated RevenueCat `test_` keys, invalid project IDs, or non-1024px PNG icon assets cause a nonzero exit with actionable messages. `--check-urls` also fetches legal/support pages with a 15-second timeout per page. It checks HTTP reachability, not legal completeness or ownership. Local mode and preview builds deliberately do not require these paid-service settings.

For an EAS npm hook, add `"eas-build-post-install": "node scripts/check-release.mjs --if-production"` to package scripts. That form only gates profiles whose names start with `production-`, deriving the platform from EAS. Run `--require-eas --check-urls` manually before dispatching a build. The source's optional account/billing services do not become mandatory for local mode just because the full commercial release is gated.

After configuration checks pass, follow [accounts-and-billing.md](accounts-and-billing.md) to verify real sign-up, email confirmation, recovery, account deletion, entitlement mapping, cancellation, purchase, restore, and account switching. A syntactically valid SDK key is not proof of a functioning integration.

### Request production artifacts

```sh
npx eas-cli build --platform android --profile production-google
npx eas-cli build --platform android --profile production-galaxy
npx eas-cli build --platform ios --profile production-ios
```

These commands request signed build artifacts; they **do not submit** them. No auto-submit flag, fake store identifier, or publishing workflow is included. Verify signing, inspect the actual release binary, test physical devices, then use the appropriate store portal for release. Galaxy mode is explicitly **PRODUCTION** in the billing service: never treat a production checkout as a free test.

## Permissions and device verification

- Camera and chosen photos support project snapshots. iOS prompts explain the concrete use. Microphone permission is disabled; no audio recording feature exists.
- Local reminders use the `project-reminders` Android channel. Runtime permission is requested only when a user creates a reminder. Remote push and background remote notifications are not enabled.
- Exact-alarm permissions are blocked. The installed Expo notification scheduler falls back to inexact alarms when exact alarms are unavailable; device power management can delay delivery. Unpause should never promise an exact alarm.
- Advertising ID permission is blocked. No tracking permission or advertising integration is configured. RevenueCat/account data disclosures still need to match the owner's enabled services.
- Screen orientation is not locked. Verify portrait, landscape, narrow phones, iPad, Android tablets, split-screen, fold/unfold, large text, keyboard avoidance, screen-reader labels, notification taps, camera permission denial, and photo selection.
- Review the assembled native privacy manifests and store data-safety disclosures, including RevenueCat purchase/identifier data and Supabase account data. `NSPrivacyTracking=false` does not mean “no data collected.” The encryption declaration covers standard operating-system/HTTPS use; reassess it if custom cryptography or data handling changes.

## Continuous integration and manual builds

`.github/workflows/quality.yml` runs TypeScript, unit tests, web and native JavaScript exports, and a Galaxy Android export on pushes and pull requests. Uploaded artifacts are named **javascript-exports-not-store-builds**. This workflow requires no signing credentials and cannot establish that a signed mobile binary works.

`.github/workflows/android-release.yml` is manual only. Configure a protected GitHub **production** environment with `EXPO_TOKEN` as a secret, `EAS_PROJECT_ID` and optional `EXPO_OWNER` as variables, and the corresponding production environment in EAS. Complete initial signing configuration interactively first. The workflow pulls production variables, runs the release gate and checks, then requests the selected signed Android build and waits for its real result. It never submits to a store. Secrets and store credentials are not committed.

Build configuration, unit assertions for the release gate, and native manifest introspection have been verified. A final signed artifact and store acceptance must be reported separately with actual build evidence; this document does not claim either has occurred.
