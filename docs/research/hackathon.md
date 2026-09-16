# Shipaton 2026: eligibility, delivery, and Galaxy launch research

Verified against current official sources on September 16, 2026. This is an implementation checklist, not a claim that accounts, purchases, certification, or publication have already been completed. The user's empty guidelines block is supplemented by the official 2026 event rules.

## Eligibility and judging

The deadline is **September 30, 2026, 11:45 p.m. PDT** (October 1, 12:15 p.m. IST). A new app must be fully published on an eligible store during the submission window, available in the United States, and behave as demonstrated. RevenueCat must power a purchase or RevenueCat Ads. Beta distribution alone is insufficient. Maintain unrestricted judge access through October 13. Student-only Next Gen has a repository/video exception; do not assume Shivam qualifies. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules)

Relevant judging priorities:

| Category | Evaluation focus |
| --- | --- |
| Grand Prize | RevenueCat-recorded revenue determines shortlisting; sustainable post-launch growth determines selection. |
| Design | Original interactions, aesthetics, delight, and animation. |
| Peace Prize | Demonstrable benefit and practical feasibility. |
| HAMM | Appropriate pricing/paywall, realistic scalable revenue, differentiation. |
| Galaxy | Overall quality plus 20% Galaxy optimization; polished listing; exclusivity optional. |

Galaxy entrants need a live Galaxy URL and optimization explanation. One influencer category maximum; do not use influencer branding without consent. Replit, Kotlin, OneSignal, Layers, and Stripe awards have actual implementation requirements. These criteria are not one generic numeric rubric. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules)

## Submission assets

Prepare project name, tagline, feature description, RevenueCat project ID, live store URL, and category-specific evidence. Include a **1024 × 1024 icon**, at least one **1179 × 2556 screenshot without a device frame**, and a **public YouTube or Vimeo demo under two minutes** showing the real device experience and monetization. Supply a free trial or judge promo code. Materials must be English or translated. Devpost must show Submitted and all five steps complete; a saved draft does not count. Describe actual launch metrics, never forecast numbers as achieved traction. [RevenueCat submission walkthrough](https://www.revenuecat.com/blog/engineering/how-to-submit-your-app-for-shipaton)

Our execution recommendation: target Galaxy, Design, and HAMM; add Peace only if impact is supported by the final product. Treat Grand Prize as a stretch dependent on real acquisition and sales, not code quality alone. Build the video around one human problem, one complete successful workflow, one standout interaction, and one honest paid upgrade. A good deck or PDF supports the pitch but does not replace required assets.

## Samsung: free publishing with real account requirements

Samsung has **no signup or annual publishing fee**. Commercial approval can take days; D-U-N-S verification and international bank verification can each take up to ten business days. Therefore account onboarding is on the critical path immediately, not an afterthought. [Samsung FAQ](https://developer.samsung.com/galaxy-store/faq.html)

Commercial seller status is required for distributing free or paid apps. Samsung's direct documentation allows business verification with D-U-N-S **or alternative DBA/national documentation**, with Seller Portal assistance. A matching verified identity/business and payout account remain necessary. Public email domains require an explanation. Financial-account country must match the seller profile. Do not invent a corporate identity or claim verification happened. [Samsung account preparation](https://developer.samsung.com/galaxy-store/prepare.html)

RevenueCat's onboarding guide describes a corporate/D-U-N-S path and offers an expedited approval contact, **rc.onboard@samsung.com**. This is an escalation option for Shivam, not a guarantee of approval or authorization to send email. The guide requests an APK, a 512 × 512 Galaxy icon, 4–8 screenshots in a 2:1 ratio, listing metadata, support email, age rating, language, publication settings, and data safety. Samsung IAP requires declaring device/other IDs as collected. EU publishing requires a business registration number. Use US availability for judging and select other regions based on actual readiness. [RevenueCat Galaxy onboarding](https://www-docs.revenuecat.com/docs/platform-resources/galaxy-platform-resources/galaxy-store-onboarding)

Samsung's standard developer share is 85% for subscriptions and 80% for one-time purchases, before applicable deductions. Free publishing does not mean zero transaction costs. [Samsung revenue-share announcement](https://developer.samsung.com/sdp/news/en/2025/03/13/new-revenue-share-model-for-galaxy-store)

## RevenueCat and React Native: supported Galaxy path

Galaxy support exists in **react-native-purchases 10.3.0+**. Install the **react-native-purchases-store-galaxy** add-on. Configure the Galaxy public API key, `store: 'GALAXY'`, and an explicit billing mode. Use TEST for financial-transaction-free testing and ALWAYS_FAIL for error testing; only PRODUCTION is permitted in beta/production submissions. Real purchase tests require a **physical Samsung Galaxy device signed into a Samsung account**; emulators cannot prove this flow. Configure the app and products in the portals first. iOS and Google Play use their corresponding RevenueCat app keys and native stores. [RevenueCat React Native installation](https://www.revenuecat.com/docs/getting-started/installation/reactnative)

Illustrative integration shape (verify installed package types before implementation):

```ts
import { GALAXY_BILLING_MODE } from 'react-native-purchases-store-galaxy';

Purchases.configure({
  apiKey: galaxyPublicApiKey,
  store: 'GALAXY',
  galaxyBillingMode: releaseBuild
    ? GALAXY_BILLING_MODE.PRODUCTION
    : GALAXY_BILLING_MODE.TEST,
});
```

Do not import the Galaxy native module unconditionally into web code. Never treat a locally toggled premium state as a verified purchase.

To connect the Galaxy store in RevenueCat, create the Galaxy app with its package name. An administrator creates a Samsung Seller Portal service account with Publishing & ITEM and GSS access, downloads its private key, and places the service-account ID/private key in the RevenueCat dashboard. **That private key must never ship in the app or repository.** [RevenueCat Galaxy connection guide](https://www-docs.revenuecat.com/docs/platform-resources/galaxy-platform-resources/galaxy-setup-guide)

RevenueCat's Pro tier is free below the $2,500 monthly tracked revenue threshold, then charges 1% of tracked revenue; the base is before store fees/taxes. Budget for the full tracked amount once charged, not merely the excess over $2,500. [RevenueCat billing](https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management)

## Recommended release gates (our engineering judgment)

1. Verify Shivam's actual Samsung commercial account status immediately. If pending, prepare the binary and listing while onboarding proceeds; approval cannot be manufactured by code.
2. Create and activate real store products; connect RevenueCat; map one entitlement to coherent offerings. Provide a meaningful free tier and a judge-access mechanism.
3. Build signed Android release APK and iOS-compatible source/build configuration. Distinguish a successful source check, emulator build, device test, store certification, and public release in status reporting.
4. Test login/logout, persisted data, restart, offline recovery, exports, cancellation, restore, entitlement expiration, and unavailable billing. No secrets in binaries; server-side paid operations must check verified entitlements.
5. Test an actual Galaxy purchase/restore on physical hardware. Use correct production billing mode for the submitted binary. Closed beta is the Samsung route for IAP apps. [Samsung release guide](https://developer.samsung.com/galaxy-store/launch.html)
6. Check small phone, tablet, foldable-style wide layout, resizing/multi-window, font scaling, screen reader labels, keyboard, contrast, and reduced motion. Claim Samsung optimization only for implemented and demonstrated behavior.
7. Ship a complete public listing early enough for review and correction. Confirm a US-accessible URL and fresh install before recording final footage. Prepare authentic acquisition experiments and track observed results.

## External dependencies we cannot truthfully mark complete without evidence

- Samsung commercial identity/business/payout verification and store approval.
- RevenueCat project, app keys, actual products/offerings, service-account connection, real purchase evidence.
- Physical Galaxy-device purchase test and a device recording.
- Signing credentials and any iOS distribution account needed for App Store publication.
- Public video upload and final Devpost submission under Shivam's account.

The most viable legitimate zero-upfront-store-fee path is **Galaxy Store + Samsung IAP through RevenueCat**, subject to seller approval and physical-device testing. A web preview can make the app easy to evaluate during development; it does not substitute for a qualifying public mobile-store release.
