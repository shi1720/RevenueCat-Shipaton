# Verification ledger

Recorded September 16, 2026. Passing a source test, running a native preview, and publishing a store release are different results.

## Firebase launch verification update

The final Firebase preview passes **101 unit/service tests and 30 browser scenarios**, plus TypeScript, formatting, web/iOS/Android exports, and a targeted secret scan. Real hosted tests cover accounts and the full project workflow at 390px and 1280px. The final native APK includes Firebase sign-in, encrypted session persistence through an offline restart, and successful account deletion. All 41 recorded source hashes match the committed source. See [iteration-two review](../review-iteration2.md), [hosted evidence](firebase-hosting.md), and [native evidence](native-build-evidence.md).

All five hosted fonts now return actual TTF binaries and load correctly, including in a browser with the earlier broken font responses cached. The deploy script rejects missing account configuration, a mismatched Firebase project, and stale exports before upload.

Firebase accepted password-reset requests for an existing test identity, but no matching email was found in the authorized mailbox during the test window. Delivery and link completion remain unverified. Temporary identities were removed. Real purchases, production signing, physical Galaxy checks, and store publication remain pending.

## Earlier baseline and stress evidence

| Layer | Result | Scope and limits |
| --- | --- | --- |
| TypeScript | Passed | `npm run typecheck` across app, services, tests, and configuration. |
| Unit/service suite | 93 passed | Domain transitions, matching, import validation, persistence failure, bounded native storage, photo cleanup/budgets, auth and purchase identity races. Provider SDKs are mocked in these tests. |
| Browser suite | 20 passed | Desktop and phone UI; creation, session persistence, checkpoints, finish/reopen, filtering, photo backup/restore, destructive-action cancellation, and malformed imports. |
| Automated accessibility | Passed on scanned screens | Axe WCAG A/AA checks on dashboard, project detail, and creation form. This is not a complete screen-reader or accessibility certification. |
| Responsive browser checks | Passed | Desktop, mobile, and narrow 320-pixel layouts. See [browser evidence](web-qa-evidence.md). |
| Dependency audit | 0 reported vulnerabilities | `npm audit` on the installed lockfile at verification time; this is not a guarantee against undisclosed vulnerabilities. |
| Web production export | Passed | Bundled static web app, exercised by browser tests. |
| iOS/Android JavaScript exports | Passed | Expo/Hermes production bundling; this does not compile an iOS application. |
| Supabase function type check | Passed | `deno check` for authenticated account deletion. No live Supabase endpoint was available. |
| iOS native project generation | Passed | Expo prebuild generated the Xcode project. Full Xcode and CocoaPods were unavailable, so no iOS binary was compiled or signed. |
| Android native compilation and offline launch | Passed | Standalone arm64 Galaxy preview on Android API 36 emulator, with no Metro connection. See the exact binary, checksum, permission audit, and device checks in [native evidence](native-build-evidence.md). |
| Real account lifecycle | Pending owner configuration | Signup, email delivery, recovery redirects, login, account switching, and server deletion require the owner's Supabase deployment. |
| Real store purchase/restore | Pending store configuration and hardware | Requires configured RevenueCat/store products and physical target hardware. An emulator does not prove Samsung IAP. |
| Store signing, review, publication | Pending owner and store | Preview uses a test signing certificate. No public app listing or completed hackathon entry is claimed. |

The local Expo Doctor run passed its dependency/configuration checks. After generating the ignored iOS project, its CocoaPods check reported the missing native toolchain. This is a known iOS build prerequisite, not evidence of a completed iOS build.

The final source pass adds a valid archive above 2 MB with 300 checkpoints. On both phone and desktop, project history and Moments render ten notes at a time; older/newer navigation remains reachable and the archive survives reload. This verifies bounded initial rendering as well as data retention. The native fixture additionally embeds a real image; its device result is recorded separately in the native evidence.

The final native APK also passed a **2,723,781-byte backup import through Android's real document picker**, explicit replacement, force-stop, and relaunch. Its latest note and embedded image remained available. This is emulator evidence for actual native storage/media behavior, distinct from mocked service tests and physical-device certification.

The [independent review](../review.md) records findings and fixes rather than presenting an invented organizer score. The [launch checklist](launch-checklist.md) remains the acceptance checklist for the exact configured, signed store binary; many checks must be repeated on physical hardware even where automation already passes.

The complete [GitHub CI run for source commit d5d803d](https://github.com/shi1720/RevenueCat-Shipaton/actions/runs/35098812202) passed, including all 20 browser scenarios, TypeScript, formatting, unit tests, Deno checking, and web/iOS/Android/Galaxy JavaScript exports. Final documentation and media commits do not change that source. The [native disk inspection](evidence/stress-result.json) records 11 committed chunks and all 300 checkpoints after the actual import/restart test.
