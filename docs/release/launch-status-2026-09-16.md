# Launch status: September 16, 2026

## Public deliverables

- App: https://unpause-studio.web.app
- Submitted Devpost entry: https://devpost.com/software/unpause-k9p21y
- Demo: https://www.youtube.com/watch?v=jXpOlvDShRY
- Privacy: https://unpause-studio.web.app/privacy
- Terms: https://unpause-studio.web.app/terms
- Support: https://unpause-studio.web.app/support

The public demo is approximately 78 seconds of actual Android emulator footage with disclosed AI narration, burned captions, a selectable English subtitle track, and an original thumbnail. Signed-out playback was verified. It shows the core project loop and predates Test Store purchase testing.

## Devpost

Final submission succeeded. Devpost displayed **Project submitted**, and the public project page shows **Submitted to RevenueCat Shipaton 2026**. RevenueCat project ID `projb008cb09` is saved. The entry includes the story, app/demo links, artwork, native screenshots, testing instructions, and supported category rationale.

A submitted entry is not proof of eligibility. The store-release declaration remains false. Qualifying public mobile-store release, actual production-store monetization, and verified premium judge access remain unfinished.

## Samsung seller status

Samsung account registration is complete. Seller Portal shows Private Seller / Free Distribution Seller. Android app registration is blocked until Corporate Commercial Distribution Seller approval through the portal's business/D-U-N-S process.

The [Samsung onboarding email](samsung-onboarding-request.md) is prepared and **not sent**. Sending requires the owner's permission. No commercial approval, D-U-N-S exception, listing, or store release is claimed.

Android Developer Verification of the package and production signing certificate is a separate release requirement from Samsung commercial approval. The Galaxy package is `com.shivamgupta.unpause.galaxy`.

## RevenueCat configuration and test boundary

Project `projb008cb09` contains Galaxy, iOS, Google Play, and Test Store apps. The configured mapping uses entitlement `studio`, offering `default`, package `$rc_lifetime`, and product `unpause_studio_lifetime`.

Actual native Test Store cancellation, simulated failure, successful entitlement grant, restore, and cold-restart persistence passed. These are RevenueCat Test Store transactions, not actual Samsung/Apple/Google store purchases and not revenue.

The internal client is `artifacts/builds/unpause-internal-test-store.apk`. It is debug/internal and requires Metro. It must not be described as a standalone offline purchase demo or used for production distribution. Production checks reject Test Store configuration.

The [current standalone Galaxy preview](https://github.com/shi1720/Unpause-Preview/releases/tag/v1.0.0-preview.3) includes the latest client source and configured deletion URL. Its SHA-256 is `2d7db0e824a329bd8893a038b0bc9054cc82663c0488b9c93f436856014a4e2d` and size is 37,325,300 bytes. Signature/alignment, in-place emulator upgrade, cold launch and preservation of the sample studio and exact next step passed. The bounded native account UI attempt was inconclusive because emulator text injection and UIAutomator failed; no current-APK native sign-in/deletion or fully offline startup success is claimed. The temporary account was deleted administratively, its credential file removed, and the emulator left on the local home screen. See [current-build evidence](evidence/galaxy-final-preview-result.json).

## Firebase accounts and coordinated deletion

Firebase project `unpause-studio` supplies the deployed identity service. Real hosted signup, session persistence, sign-in, sign-out, confirmed deletion, and rejection after deletion passed. Historical native emulator checks on the earlier `149e2ca...` APK verified account persistence through offline process restart and deletion; those results do not establish the same coverage for the current `2d7db0e...` APK. Physical Samsung behavior remains a separate acceptance test.

Supabase project `ljguedfuxpadvddzfgsj` now hosts the deployed Firebase/RevenueCat deletion endpoint and temporary hashed retry/rate-limit coordination. Firebase remains the identity provider. Notes and photos are not uploaded or synchronized.

The [deletion backend](firebase-deletion-backend.md) confirms RevenueCat customer removal before deleting the Firebase account. Live checks have exercised asynchronous `202` retry followed by success, both-provider absence, safe post-deletion replay, revoked tokens, rate limiting, native requests, and request isolation. The final run rejected an actual login older than five minutes and completed all 15 checks successfully. Four disposable identities were removed with zero cleanup errors. The [redacted live evidence](evidence/firebase-deletion-live-result.json) records these results and their limits: no real purchase, a tampered rather than genuinely foreign-project token, and provider-outage injection covered locally.

Firebase accepted the reset request, but the authorized mailbox search found no matching message during its test window. Reset email delivery and reset-link completion remain unverified.

## Remaining release work

Complete Samsung corporate commercial approval, actual target-store products and billing connections, physical store-device transaction/restore verification, production signing, Android binary verification, store review, and eligible public listing. Provide tested premium judge access and update the submitted entry with actual store evidence.

iOS source and bundle checks do not constitute a compiled, signed iOS binary. Native notification/photo lifecycle checks and recovery-email delivery remain device/service acceptance work. No production paid transaction, customer traction, revenue, or eligibility result is claimed.

See [owner setup](../OWNER_SETUP.md), [verification](verification.md), [native build evidence](native-build-evidence.md), and [backend evidence](evidence/firebase-deletion-live-result.json) for the current scope. The final aggregate passed 154 unit tests, 30 desktop/mobile browser scenarios, type checking, formatting, iOS/Android bundle exports, and three Firebase Admin Deno tests. These checks remain distinct from production-store acceptance.

Public standalone Android preview: [download and release notes](https://github.com/shi1720/Unpause-Preview/releases/tag/v1.0.0-preview.3). This ARM64 build uses a development test certificate, includes its JavaScript, and has no live checkout. The download returned HTTP 200 without authentication, with the verified APK byte count. Firebase Spark rejects executable uploads, so only the app and support pages use Firebase Hosting.

GitHub quality checks passed for application commit `4d575fafae22401ed43e47482ea97e7ccfab4a1c`: [complete quality run](https://github.com/shi1720/RevenueCat-Shipaton/actions/runs/35117402129). This includes web/iOS/Android/Galaxy exports, browser scenarios, formatting, unit tests, and both account backends with the new Firebase Admin checks.
