# Shivam's launch handoff

Unpause is live on the web, its Devpost entry is submitted, and the native RevenueCat Test Store workflow is verified. Production mobile-store release remains unfinished. The remaining work is concentrated in seller approval, actual store products and transactions, production signing, and device acceptance checks.

## 1. Resolve Samsung commercial seller approval

Samsung account registration is complete. The Seller Portal currently identifies the account as a Private Seller / Free Distribution Seller and blocks Android app registration until Corporate Commercial Distribution Seller approval. The portal's corporate process requires D-U-N-S/business verification. Use genuine identity, company, and payout information.

The Galaxy package is **`com.shivamgupta.unpause.galaxy`**. The [prepared Samsung onboarding request](release/samsung-onboarding-request.md) asks the published RevenueCat onboarding contact about the correct approval path and possible alternatives. **It has not been sent. Sending it requires Shivam's permission.** No exception or expedited approval is assumed.

Samsung commercial approval and Android Developer Verification are separate. Verify the package and production signing certificate through the required Android developer process before submitting the Galaxy binary. See the [Samsung notice](https://seller.samsungapps.com/notice/getNoticeDetail.as?csNoticeID=0000011990) and [launch status](release/launch-status-2026-09-16.md).

## 2. Keep the configured accounts and deletion service

The [hosted app](https://unpause-studio.web.app) uses Firebase Authentication. Actual hosted signup, session persistence, sign-in, sign-out, and account deletion passed. Native account persistence and deletion were also exercised on an Android emulator. Notes and photos remain on the device, including after account deletion.

Supabase now hosts the live Firebase/RevenueCat deletion endpoint. It verifies the Firebase identity, removes the matching RevenueCat customer, and deletes the Firebase account only after purchase-profile cleanup completes. Temporary hashed coordination records support retry and rate limiting. Supabase does not store project notes or photos. The older Supabase identity adapter remains an optional code fallback, not the deployed account provider.

The endpoint is configured at `https://ljguedfuxpadvddzfgsj.supabase.co/functions/v1/delete-firebase-account`. See [the backend guide](release/firebase-deletion-backend.md) and [redacted live results](release/evidence/firebase-deletion-live-result.json). Live runs have exercised provider deletion, safe asynchronous retry, lost-response replay, revoked-token rejection, and rate limiting. The final live run also rejected an actual login older than five minutes. All 15 live checks passed, with four disposable identities removed and no cleanup errors.

Existing public client configuration is in ignored `.env.local`. Do not overwrite it with the empty template. Administrative credentials belong only in provider secret stores and private local files. A fresh checkout should receive public configuration through the owner-controlled provider dashboards.

Firebase accepted password-reset requests, but mailbox delivery and reset-link completion remain unverified. Finish that recovery check before release.

## 3. Finish production store products and purchases

RevenueCat project **`projb008cb09`** is configured with Galaxy, iOS, Google Play, and Test Store apps:

- Entitlement: **`studio`**.
- Product identifier: **`unpause_studio_lifetime`**.
- Offering: **`default`**.
- Lifetime package: **`$rc_lifetime`**.
- Proposed customer launch price: **US $19.99 once**, subject to actual store configuration and localized pricing.

Actual native Test Store cancellation, simulated failure, successful entitlement grant, restoration, and persistence after a cold restart were verified. **Test Store transactions are simulated and do not establish production billing, revenue, or eligibility.**

The separate `artifacts/builds/unpause-internal-test-store.apk` is a debug/internal test client that needs Metro. It is not the standalone offline preview or a production binary. Keep its Test Store settings out of production profiles. The release checker rejects Test Store flags and keys.

Next, create and approve the actual product in each target store and finish the store-specific RevenueCat connections. On a physical Samsung Galaxy device, verify Samsung IAP purchase, cancellation, failure, restore, restart, account transitions, and coordinated deletion. Repeat appropriate store tests for Google Play and iOS. A RevenueCat dashboard product mapping alone does not complete the store product or transaction.

## 4. Build and validate production binaries

The [current standalone Galaxy preview](https://github.com/shi1720/Unpause-Preview/releases/tag/v1.0.0-preview.3) is 37,325,300 bytes, SHA-256 `2d7db0e824a329bd8893a038b0bc9054cc82663c0488b9c93f436856014a4e2d`. It bundles JavaScript, includes the latest deletion client and uses a test signing certificate. Signature/alignment, in-place emulator upgrade, cold launch and local project preservation passed. Native account sign-in/deletion and fully offline startup were not verified on this exact APK because the bounded emulator automation attempt was inconclusive. Earlier APK account successes remain historical. The separate Test Store client expects Metro. Neither is a production-signed store release. See [exact current-build evidence](release/evidence/galaxy-final-preview-result.json).

Follow [build.md](release/build.md), configure the correct store profile and owner-controlled production signing, and run the release gate. Preserve the production signing key for updates. Keep keystores, passwords, and server credentials private.

Test the exact signed binary on target hardware, including large backups, photos, permissions, notification delivery, rotation/resizing, accounts, purchases, and deletion. iOS source and bundle configuration are prepared. A compiled, signed iOS binary still requires the appropriate Apple account and toolchain.

## 5. Complete release evidence and update the submitted entry

The [Devpost entry](https://devpost.com/software/unpause-k9p21y) is submitted. Its project ID is saved. Submission does not establish compliance with the public-store, monetization, or judge-access requirements; the store-release declaration remains false.

The [public narrated demo](https://www.youtube.com/watch?v=jXpOlvDShRY), captions, native screenshots, icon, deck, and PDF brief are prepared. The current video labels AI narration and Android emulator footage. It predates Test Store verification and does not demonstrate a purchase. No new voiceover is required to use that honest preview.

Before the competition deadline, complete the eligible store release, verify US access and premium judge access, and update the entry with the approved store URL and accurate testing instructions. Revise purchase claims only after the corresponding real store behavior is verified. The [official rules](https://revenuecat-shipaton-2026.devpost.com/rules) control eligibility.

Public [privacy](https://unpause-studio.web.app/privacy), [terms](https://unpause-studio.web.app/terms), and [support](https://unpause-studio.web.app/support) pages are deployed. Keep store data disclosures aligned with Firebase, RevenueCat, and the deletion endpoint. Local project storage does not mean those account services process no data.
