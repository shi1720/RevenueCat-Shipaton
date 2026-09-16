# Shivam’s launch handoff

Unpause’s local studio is implemented and independently tested. You can use the app without API keys. These are the owner-only steps needed to turn it into a published, monetized Shipaton entry.

## 1. Start Samsung verification first

Visit [Samsung Seller Portal](https://seller.samsungapps.com/) using your own Samsung account. Check your commercial seller status and complete the identity/business/payout information Samsung requires for your region. Free publishing still requires commercial approval; use genuine documents. D-U-N-S is one route, and Samsung documents alternatives through support.

The app’s Galaxy package is **`com.shivamgupta.unpause.galaxy`**. Do not register the Google package for the Galaxy binary. If verification is delayed, RevenueCat lists **rc.onboard@samsung.com** as an onboarding contact. An optional draft is below; it has not been sent.

> Subject: Shipaton 2026: Galaxy Store onboarding for Unpause
>
> Hello Samsung onboarding team,
>
> I’m Shivam Gupta, building Unpause for RevenueCat Shipaton 2026. Unpause helps people resume unfinished creative projects, with a one-time Studio upgrade through RevenueCat and Samsung IAP.
>
> I’m preparing the Galaxy Store release for package com.shivamgupta.unpause.galaxy. Could you please advise on the required commercial verification steps and whether Shipaton onboarding assistance is available for my application?
>
> I can provide my Seller Portal account details and required documentation through the appropriate secure channel.
>
> Thank you,
> Shivam Gupta

Verification is not guaranteed. The entry needs a published US-accessible app by **September 30, 2026, 11:45 p.m. PDT / October 1, 12:15 p.m. IST**. See [official-rules research](research/hackathon.md).

## 2. Use the configured Firebase accounts

The deployed app at [unpause-studio.web.app](https://unpause-studio.web.app) already uses Firebase Authentication. Real hosted signup, session persistence, login, logout, and account deletion passed. Native sign-in and encrypted offline session persistence also passed on the final Android emulator build. Account deletion preserves local projects.

The four public Firebase configuration fields are already in ignored `.env.local` on this machine. Do not overwrite this file with the empty template. A fresh checkout should populate those fields from the dedicated Firebase project's web app settings. See [Firebase account setup](release/firebase-accounts.md).

Password-reset requests are accepted by Firebase, but mailbox delivery and reset-link completion were not verified during the test window. Resolve that delivery check before treating recovery as release-certified. Accounts do not synchronize notes or photos.

Supabase remains an optional alternative provider. Its setup guide only applies if you deliberately choose that fallback instead of Firebase. Switching providers does not migrate account or purchase identities.

## 3. Connect the real paid upgrade

In [RevenueCat](https://app.revenuecat.com/), create your project and a Galaxy app matching the package above. Connect Samsung IAP through RevenueCat’s current onboarding steps.

- Entitlement: **`studio`**.
- Product: **non-consumable**, suggested ID `unpause_studio_lifetime`.
- Current offering: `default`, containing the built-in **Lifetime** package (`$rc_lifetime`).
- Proposed launch price: **$19.99 once**, subject to your decision and each store’s localized pricing.
- Set `EXPO_PUBLIC_REVENUECAT_GALAXY_KEY` and `EXPO_PUBLIC_ANDROID_STORE=galaxy`.
- Before enabling billing with Firebase accounts, deploy and verify the secure account/purchase-data deletion backend described in [Firebase accounts](release/firebase-accounts.md), then set `EXPO_PUBLIC_ACCOUNT_DELETION_URL`. The app refuses incomplete deletion. Keep RevenueCat administrative credentials on that backend only. The older Supabase function is for the Supabase identity fallback, not Firebase tokens.

For iOS and Google Play, repeat with those stores’ own products, app identifiers, and public SDK keys. Never substitute a private API key or simulated `test_` key.

A physical Samsung Galaxy device signed into a Samsung account is required for Galaxy purchase testing. Test with the appropriate store sandbox/explicit test-mode build. The checked-in production billing configuration can charge real money; no automated test in this repository makes a real purchase.

## 4. Publish support and policy pages

Public [privacy](https://unpause-studio.web.app/privacy), [terms](https://unpause-studio.web.app/terms), and [support](https://unpause-studio.web.app/support) pages are deployed and linked in the app. The guarded [deployment script](../scripts/deploy-firebase.mjs) keeps these URLs configured. Verify the store data-disclosure forms against every enabled SDK. Local project storage does not mean account/purchase services collect no data.

## 5. Make the production binary

The local preview APK is for sideloaded testing. It uses a debug/test signing certificate and is **not the final store binary**.

Follow [build.md](release/build.md). Set up your own Expo project and signing credentials, then run the release configuration gate and the correct EAS profile. Keep production keystores, passwords, Apple credentials, and Samsung service keys private. An Apple developer account and suitable build/signing setup are needed for iOS store distribution.

Test the exact signed binary before uploading. Confirm purchase, cancellation, restore, app restart, large backup import, photos, permissions, rotation/resizing, and account deletion on actual target hardware. Preserve the signing key for future updates.

## 6. Complete the store evidence and submit

The [public narrated demo](https://www.youtube.com/watch?v=jXpOlvDShRY), captions, native screenshots, icon, [editable deck](../artifacts/submission/Unpause-pitch-final.pptx), and [PDF brief](../artifacts/submission/Unpause-brief.pdf) are finished. The video is under two minutes and labels synthetic narration and Android emulator footage. You do not need to record a voiceover to use this version.

The [Devpost draft](https://devpost.com/submit-to/29969-revenuecat-shipaton-2026/manage/submissions/1185565-unpause/additional-info/edit) has its story, media, testing instructions, and supported award descriptions saved. Final validation currently requires the actual RevenueCat project ID. Store publication and real monetization are also eligibility requirements even though the form does not require a store URL to save the draft.

Finish the RevenueCat/Samsung accounts in their prepared browser tabs. Samsung requires your date of birth, password, and subsequent verification; RevenueCat requires a password. Browser credential rules require you to complete new password entry yourself. Then connect real products, verify purchases/restores and judge access, supply the approved store URL and project ID, and finish the entry. Update the preview's pending-release statements only when those events have happened.

Use genuine identity, business, and payout information for seller verification. Do not paste secrets into a conversation: use local environment files and provider secret stores. Physical Galaxy testing and store review remain necessary. The exact current state is recorded in [launch status](release/launch-status-2026-09-16.md).
