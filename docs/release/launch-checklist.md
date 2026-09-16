# Unpause launch gates

This is an evidence checklist. An unchecked item is not a claim that the implementation is absent; it requires confirmation. Source exports, browser tests, native builds, real device verification, store approval, and public release are separate milestones.

**Target:** a legitimate Galaxy Store release first, with iOS and Google Play compatible source/build configuration. Samsung has no publishing signup/annual fee, but commercial seller approval, signing, hardware testing, and transaction deductions still apply. See [official-source research](../research/hackathon.md).

## 1. Product and data

- [ ] First launch offers a working local experience without credentials. Sample projects are clearly examples and can be removed without affecting a user's own records.
- [ ] Create a project with name, category, energy, next-step duration, next action, materials, and optional photo.
- [ ] Time and energy filters return the correct projects; blocked work is visibly identified and ranked after ready work.
- [ ] Resume opens the latest checkpoint; only one session can be active; switching projects cannot silently discard the running session.
- [ ] Background/restart resumes timer state correctly. Save a checkpoint after less than a minute, several minutes, and a changed device clock.
- [ ] Checkpoint history and cumulative minutes update once. Double taps do not create duplicate sessions or checkpoints.
- [ ] Finish a project and confirm it releases an unfinished-project slot. Test any reopen path against the free allowance.
- [ ] Free cap is enforced on every route that increases unfinished projects, including create, reopen, and import policy; existing data is never silently removed to meet a cap.
- [ ] Every write handles storage failure without falsely saying “saved.” Corrupt local data is not overwritten with samples.
- [ ] Export/import round-trips real user projects. Invalid JSON, duplicate IDs, dangling sessions, excessive size, invalid fields, and interrupted imports preserve existing data.
- [ ] Imported active sessions are deliberately paused and old-device notification IDs removed.
- [ ] Verify photo survival after app restart and backup on another device. A file/blob URI is not itself a portable image backup. Preserve actual image content or keep the exact limitation visible.
- [ ] Technical maximums are clear: current import safeguards cap projects/checkpoints and media size. “Unlimited Studio” is a pricing allowance, not infinite storage.

## 2. Automated and manual quality

- [ ] `npm run typecheck` passes on the final commit.
- [ ] `npm test` passes on the final commit. Domain tests cover free/finished behavior, draft boundaries, safe imports, matching, checkpoint accumulation, and clocks.
- [ ] `npm run export:web` passes. Native iOS and Android exports/build checks also pass where configured.
- [ ] Browser end-to-end tests create, pause, resume, finish, and verify persistence after reload.
- [ ] Test empty, one-project, free-cap, finished-only, blocked-only, and no-matches states.
- [ ] Test small phone, larger phone, tablet/foldable widths, keyboard avoidance, rotation/resizing, and safe areas.
- [ ] Test screen-reader labels, touch targets, contrast, enlarged text, reduced motion, and permission-denied paths.
- [ ] Test photos from library and camera where supported, cancelled picker, oversized image, lost file access, and web behavior.
- [ ] Test device reminders with allowed/denied permissions, rescheduling, cancellation, project deletion, completion, and import.
- [ ] Verify native date/time display across time zones and reminder behavior around daylight-saving changes where applicable.
- [ ] Record exact commands, commit, platform/device, and pass/fail evidence. Do not relabel unrun device tests as passing.

## 3. Optional accounts

- [ ] Create a Supabase project and configure only public client URL/key in app environment variables. No service-role key in app or repository.
- [ ] Configure allowed redirects/deep links and email delivery; test verification, login, logout, wrong password, password reset, network failure, and expired sessions.
- [ ] Test account switching with existing local projects. Make local-data behavior clear; signing in does not upload or synchronize projects.
- [ ] Provide account deletion and required public instructions if accounts ship. Reauthentication/error states must work. Separate local project deletion from backend account deletion.
- [ ] Publish an accurate privacy policy covering actual enabled services and retention; verify optional auth is not required for the free local app.

## 4. Real monetization

- [ ] Create RevenueCat project and platform apps. Use distinct public SDK keys for iOS, Google, Galaxy, and web where applicable.
- [ ] Create the actual one-time, non-consumable Studio store product. Configure a lifetime package in the current offering and map the `studio` entitlement.
- [ ] Connect Samsung's required service account privately in RevenueCat. Private service-account keys never belong in the binary, `.env.example`, screenshots, or Git.
- [ ] Configure the Android store selection correctly. Galaxy builds use the Galaxy adapter and production billing mode for submission.
- [ ] Test a real purchase on a physical Samsung Galaxy signed into a Samsung account. Expo Go, web mockups, and emulators cannot prove Samsung IAP.
- [ ] Verify cancellation, rejected transaction, pending entitlement, offline offering failure, duplicate tap, restore, refund/revocation, logout, and account change.
- [ ] Confirm Studio unlock comes from verified entitlement, not a local boolean or a button pretending to purchase.
- [ ] Price displayed is the actual localized one-time price; no recurring-subscription language or unconfigured price masquerading as checkout.
- [ ] Protect saved projects during temporarily unavailable entitlement checks. Test the purchase identity after anonymous-to-signed-in transition.
- [ ] Provide and test a legitimate judge-access mechanism; do not leave a general production bypass.

## 5. Seller accounts, signing, and stores - external gates

- [ ] Shivam's Samsung seller identity/business/payout verification is approved. Check onboarding lead times now; code cannot bypass them.
- [ ] Confirm app/package identity, versioning, signing key custody, and release owner. Keep signing assets outside Git.
- [ ] Produce a signed release APK for Galaxy and install that exact artifact on physical hardware.
- [ ] For iOS publication, obtain required Apple distribution access, signing, and App Store configuration. Compatible code is not a published iOS app.
- [ ] For Google Play publication, complete its separate seller/testing/release requirements. Galaxy approval does not cover Google or Apple.
- [ ] Fill store metadata, support contact, privacy/terms URLs, content rating, data disclosures, and target regions using actual SDK behavior.
- [ ] Upload required icon and screenshots at the correct dimensions. Check spelling, legibility, safe cropping, and no prototype states.
- [ ] Complete store review, resolve feedback, and verify the public listing is accessible in the United States.
- [ ] Fresh-install the public build from the listing and repeat the core journey and purchase/restore checks.

## 6. Hackathon submission

- [ ] Recheck the current official rules and actual category eligibility against [research](../research/hackathon.md).
- [ ] Record a real device demo below two minutes using [the verbatim script](../submission.md). Shivam provides the voiceover and any real-world footage.
- [ ] Show the full return loop and actual monetization. No simulated checkout success, invented founder history, traction, or user quotes.
- [ ] Upload public YouTube/Vimeo video and verify the link in a logged-out browser.
- [ ] Include the actual public store URL, RevenueCat project ID, required icon/screenshots, and judge-access details.
- [ ] Describe only verified Galaxy optimizations; do not claim exclusive Galaxy distribution if the app is distributed elsewhere.
- [ ] Record actual revenue/usage evidence for any claims. Lifetime purchase revenue is not ARR.
- [ ] Confirm all Devpost steps are complete and the entry is marked Submitted before the deadline. A saved draft is insufficient.
- [ ] Maintain functioning public app and judge access throughout the required judging window.

## What still needs Shivam or external approval

Identity/payout verification, account ownership, store signing/distribution access, real RevenueCat/store product configuration, physical device purchase testing, final public store approval, voiceover/real-world recording, and submission under Shivam's identity require real evidence. Publicly reachable support/privacy endpoints and account-deletion configuration also need to be live before shipping their claims.

Supply public SDK keys through local environment configuration, never a public repository. Private signing/service-account credentials should go directly into the relevant secure build or vendor dashboard. We should complete all code, tests, assets, and copy before asking Shivam to perform these concrete external steps.
