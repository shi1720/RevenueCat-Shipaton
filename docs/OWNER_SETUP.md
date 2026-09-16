# Shivam’s launch handoff

Unpause’s local studio is implemented and independently tested. You can use the app without API keys. These are the owner-only steps needed to turn it into a published, monetized Shipaton entry.

## 1. Start Samsung verification first

Visit [Samsung Seller Portal](https://seller.samsungapps.com/) using your own Samsung account. Check your commercial seller status and complete the identity/business/payout information Samsung requires for your region. Free publishing still requires commercial approval; use genuine documents. D-U-N-S is one route, and Samsung documents alternatives through support.

The app’s Galaxy package is **`com.shivamgupta.unpause.galaxy`**. Do not register the Google package for the Galaxy binary. If verification is delayed, RevenueCat lists **rc.onboard@samsung.com** as an onboarding contact. An optional draft is below; it has not been sent.

> Subject: Shipaton 2026 — Galaxy Store onboarding for Unpause
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

## 2. Connect optional accounts

Create an owner-controlled project at [Supabase](https://supabase.com/dashboard). The detailed guide is [accounts-and-billing.md](release/accounts-and-billing.md). Set the project URL and **publishable/anon key** locally:

```sh
cp .env.example .env.local
```

Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Configure email confirmation, password-reset URLs, and allowed redirects for `unpause://auth/callback` and your exact web origin. Deploy the included `delete-account` function. Never put a service-role key in an Expo variable.

The account is for identity and purchases. It does not upload or synchronize project content. Test signup, confirmation, login, reset, logout, and account deletion with your own disposable test account before release.

## 3. Connect the real paid upgrade

In [RevenueCat](https://app.revenuecat.com/), create your project and a Galaxy app matching the package above. Connect Samsung IAP through RevenueCat’s current onboarding steps.

- Entitlement: **`studio`**.
- Product: **non-consumable**, suggested ID `unpause_studio_lifetime`.
- Current offering: `default`, containing the built-in **Lifetime** package (`$rc_lifetime`).
- Proposed launch price: **$19.99 once**, subject to your decision and each store’s localized pricing.
- Set `EXPO_PUBLIC_REVENUECAT_GALAXY_KEY` and `EXPO_PUBLIC_ANDROID_STORE=galaxy`.
- When billing is enabled, configure the deletion function’s `REVENUECAT_ENABLED` and server-side `REVENUECAT_SECRET_KEY` through Supabase’s secrets dashboard.

For iOS and Google Play, repeat with those stores’ own products, app identifiers, and public SDK keys. Never substitute a private API key or simulated `test_` key.

A physical Samsung Galaxy device signed into a Samsung account is required for Galaxy purchase testing. Test with the appropriate store sandbox/explicit test-mode build. The checked-in production billing configuration can charge real money; no automated test in this repository makes a real purchase.

## 4. Publish support and policy pages

Provide a working support contact and owner-controlled public HTTPS privacy, terms, and support pages. The app includes accurate in-app policy text. Publish reviewed copies and set `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`, and `EXPO_PUBLIC_SUPPORT_URL`. Verify the store data-disclosure forms against every enabled SDK. Local project storage does not mean account/purchase services collect no data.

## 5. Make the production binary

The local preview APK is for sideloaded testing. It uses a debug/test signing certificate and is **not the final store binary**.

Follow [build.md](release/build.md). Set up your own Expo project and signing credentials, then run the release configuration gate and the correct EAS profile. Keep production keystores, passwords, Apple credentials, and Samsung service keys private. An Apple developer account and suitable build/signing setup are needed for iOS store distribution.

Test the exact signed binary before uploading. Confirm purchase, cancellation, restore, app restart, large backup import, photos, permissions, rotation/resizing, and account deletion on actual target hardware. Preserve the signing key for future updates.

## 6. Record and submit

The [verbatim script and shot list](submission.md), [editable deck](../artifacts/submission/Unpause-pitch-final.pptx), and [PDF brief](../artifacts/submission/Unpause-brief.pdf) are prepared. A silent native emulator walkthrough and screenshots are reference material; label their origin honestly. Record the final demo on the installed release build, add your narration and accurate captions, and keep the final video under two minutes.

Use the provided store listing copy. Replace any pending checkout shot with a real configured flow only after testing it. Upload the public video to YouTube/Vimeo, supply the approved store URL, RevenueCat project ID, and a tested judge-access mechanism, and submit the Devpost entry. Do not claim user traction or revenue unless you have actual evidence.

## What to share for the next integration pass

You do not need to paste secrets into a conversation. Fill `.env.local` on this machine, configure server secrets in the provider dashboards, and report that setup is ready. The next pass can then verify real authentication and store configuration. Signing, business verification, physical Galaxy testing, and your voice recording require your direct participation.
