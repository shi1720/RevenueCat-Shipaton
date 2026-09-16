# Second implementation review

Reviewed September 16, 2026. This is an internal engineering review and AI-assisted judge exercise, not an organizer score or a prediction of winning. The historical 7.4/10 advisory score in [the first review](review.md) is preserved without rescoring.

## Concrete findings fixed

| Priority | Observed issue | Implemented response and evidence |
| --- | --- | --- |
| P1 | Closing a project or checkpoint form discarded typed notes without an explicit choice. Closing during photo selection or save could race draft-file cleanup. | Forms report dirty/busy state to their modal owner. Unsaved changes offer Keep/Discard, web navigation receives a before-unload guard, and modal close is blocked while saving or selecting media. Native Back still dismisses the keyboard first. Operation locks prevent duplicate photo/save actions. Browser tests keep and discard both project and checkpoint drafts, then reload to verify saved data and active sessions. |
| P1 | Same-user auth token refresh unnecessarily invalidated a pending entitlement read and reset visible Studio state. | Billing identity revisions now change only when the requested account changes. App identity synchronization likewise preserves same-user state. A new service test resolves a pending entitlement request during repeated initialization for the same UID, while existing tests still reject true account-switch races. |
| P2 | The small-phone dashboard devoted excessive space to decorative copy and pushed the useful next step down. | Reduced compact heading/hero spacing and type size, removed two decorative compact labels, and surfaced the actual saved next step directly in the hero. A 320px viewport test verifies a useful resume CTA above 600 CSS pixels and no page overflow. Viewed the generated 320px screenshot: hierarchy and contrast remain clear, with an actionable next step visible before the filters. |
| P2 | Add/close controls were smaller than 44px; long buttons and project energy choices could crowd narrow screens. | Enlarged controls/chips to 44px, allowed button text to shrink/wrap and form energy choices to wrap. Browser checks assert narrow-screen bounds and the close target size. Existing automated WCAG A/AA checks remain passing. |
| P2 | Recovery content used a fixed centered view that could become unreachable on short screens. | Recovery now scrolls while retaining its centered content on larger screens. |
| P2 | Legal/support copy still described future publication rather than taking users to real pages. | Settings now links to the final Firebase privacy, terms, and support routes, with clear link failure feedback. Removed the em dash from project handoff export; there are no em dashes in `App.tsx` or `src`. |

Draft-photo effect cleanup also now resets its live flag during React effect setup, making development strict-effect replay safe. Cleanup preserves current committed references. The change does not claim complete physical-device filesystem lifecycle verification.

## Real account provider integration

The owner approved Firebase Auth as the primary configured provider because Supabase's built-in development email delivery does not support a general public rollout without separate SMTP setup. There were no existing app customer accounts to migrate. The previous Supabase implementation remains a fallback when no complete Firebase configuration is supplied.

The app facade now uses actual Firebase email/password signup, sign-in, reset, logout, and deletion. Native persistence uses the existing encrypted SecureStore adapter through Firebase's official native persistence API. Web uses Firebase browser persistence. Auth state maps a real Firebase UID into the existing RevenueCat identity contract. Signup signs in immediately; email verification is not claimed. Password resets use Firebase's hosted one-use-code page and a Continue link to the hosted app root. No project sync was introduced.

Before real RevenueCat keys are enabled with Firebase accounts, a secure account/purchase-profile deletion endpoint is required. Its exact token validation, recent-login, UID derivation, cleanup ordering, and retry contract is documented in [Firebase account configuration](release/firebase-accounts.md). The client and production configuration gate refuse to treat missing backend cleanup as a completed deletion. With billing absent, account deletion calls real Firebase `deleteUser` and clearly reports its recent-login requirement.

The existing [Supabase account guide](release/accounts-and-billing.md) now points to the primary Firebase path. Public client config is kept in the ignored environment file; no server credentials were introduced into client code.

## Verification performed

- `npm run typecheck`: passed.
- `npm test`: **100 tests passed across five files**, including six Firebase facade tests and a new same-account billing race test.
- Credential-free export plus `npm run test:e2e`: **26 desktop/mobile scenarios passed**. This includes project create/pause/resume/finish/persistence, backup/photo round-trip, malformed import protection, free cap, honest unavailable billing, energy filtering, large-history pagination, accessibility, 320px layout, and new draft safety cases.
- Configured Firebase export with `E2E_AUTH_CONFIGURED=1 npm run test:e2e`: **26 scenarios passed**, including the enabled real-account form. This run does not create provider accounts.
- Configured Firebase web export: passed. Native iOS and Android JavaScript/Hermes exports: passed. These are bundle checks, not newly signed native releases or physical-device account tests.
- Inspected generated outputs to confirm the configured Firebase public key is actually embedded in each platform bundle without printing its value. A stale Metro transform initially reused the credential-free web build despite `.env.local` loading; rebuilding with `--clear` corrected it, and the hosting script now clears the cache on build.
- The Firebase-aware release configuration checker rejects a missing account deletion endpoint and accepts complete configuration fields. It does not prove that an endpoint exists or is secure.
- `git diff --check`: passed at review cutoff.

The separate hosting agent owns live public-browser account tests and deployment evidence. Its provider-level smoke test reported actual signup, sign-in, profile lookup, deletion, and rejection after deletion, with its synthetic account removed. Those checks are reported here as supplied evidence; they are distinct from this reviewer's mocked unit tests and from email delivery verification. See the final hosting record for the exact public-browser flows once complete.

## Remaining evidence and product limits

The implementation should not be called flawless. Native account persistence after process death, physical Galaxy billing/restore, native notification delivery, final store signing/publication, email reset delivery to an owner-controlled inbox, and account/purchase deletion with live RevenueCat remain separate acceptance tests. No customer traction, payment willingness, measured retention, or winning probability has been established.

Previously damaged workspaces with externally missing native photos can still require deliberate repair/removal before a valid portable save. New saves are bounded and protected, but this review did not simulate every OS file-loss condition. Browser storage is device/origin-local; signing in does not make multi-device project sync or multi-tab transactional editing available.

The best next work is to finish actual service/device verification and observe makers returning to their own projects on a later day. The product's value proposition is clearer and safer after these changes; its commercial differentiation still needs evidence from use and payment.

## Final security and SDK audit

A subsequent source-level audit examined Firebase's installed React Native persistence implementation, not only this app's adapter mocks. The SDK wraps stored values with JSON and needs only `getItem`, `setItem`, and `removeItem`, matching the SecureStore adapter. It also catches persistence availability failures and silently falls back to memory. That could make a successful native login disappear after restart without an explanation.

The app now performs an explicit SecureStore write/remove preflight and calls Firebase's public `setPersistence` after initialization before native signup/sign-in. If secure storage is unavailable, no signup/sign-in request is sent, the user receives a recoverable explanation, and a later retry can succeed. A new test covers both the failure and retry. **The final unit count is 101**, with TypeScript passing.

The audit also corrected password-reset confirmation copy. Firebase uses its hosted action handler, so users can set the password there and return to sign in; it does not require the Supabase same-device PKCE flow. The Supabase fallback retains its same-device wording. The hosting agent reports that Firebase's server password policy now enforces a ten-character minimum, matching client validation.

Generated web, iOS, and Android JavaScript exports were scanned for private-key blocks, Supabase server secrets, service-role JWTs, GitHub token forms, and live payment secret forms: **no matches**. A raw Hermes bytecode scan initially matched a Supabase secret-prefix check concatenated with other strings in the binary string pool; readable native JavaScript exports resolved that false positive. Public Firebase client configuration is intentionally embedded. This targeted scan is evidence for those token classes, not a guarantee that arbitrary unknown secret formats are impossible.

Account deletion remains fail-closed when RevenueCat is configured without its secure cleanup endpoint. The server contract must verify a fresh Firebase token, recent authentication and the correct project, derive the target UID from that token, and complete RevenueCat cleanup before deleting Auth. That backend remains a paid-release requirement, not a deployed capability claimed here.

No em dashes remain in `App.tsx`, `src`, the updated README, this review, or the Firebase setup guide. Native UI/account restart tests, email-delivery evidence, and final binaries continue to be recorded by their owning agents. The hosting agent has confirmed a real hosted UI account lifecycle test; refer to the hosting verification record for its exact flow and cleanup evidence.


## Hosted font-delivery regression

The owner's manual in-app-browser check found serif fallback where DM Sans should render. Independent Playwright inspection reproduced failed font faces. The root cause was Firebase Hosting's `**/node_modules/**` ignore pattern: Expo exports package fonts beneath an asset path containing `node_modules`, so Hosting excluded them. The SPA rewrite then returned HTTP 200 HTML at each font URL. Its immutable asset cache header made those invalid responses persist for returning browsers. A status-code-only deployment check missed the defect.

The hosting agent removed that exclusion. Web font imports now use dedicated local `assets/fonts` files with their original OFL licenses and new URLs, bypassing already cached invalid package URLs. Platform-specific imports preserve the original native font assets. Web typography also includes explicit system sans-serif and Georgia fallbacks, so a network failure cannot turn all body text into the browser's default serif.

New browser scenarios verify all five HTTP responses have TrueType magic bytes and are not HTML, then explicitly load/check all five browser font faces. A second scenario blocks every font request and verifies readable fallback typography and working onboarding. **The expanded suite passes all 30 scenarios** on desktop and mobile; 101 unit tests and TypeScript also pass. These checks replace a mere successful HTTP status as the font acceptance criterion. Post-deployment testing also covers a browser profile that visited the previous broken font URLs, without clearing its cache.


Post-deployment confirmation at 2026-09-16 13:44 UTC: the same persistent Chromium profile that previously observed the broken fonts loaded all five new font faces successfully without clearing its cache. Each hosted asset returned HTTP 200, `font/ttf`, TrueType magic `00010000`, and the expected nontrivial file size. The final 390px screenshot was inspected and shows the intended sans-serif body with Fraunces headings. The hosted result is captured in `artifacts/screenshots/hosted-mobile-fonts.png`; the detailed local verification ledger is `.codex-finalizer/hosted-font-recovery-evidence.json`.
