# Independent adversarial product and release review

Reviewed September 16, 2026 against the actual source, unit/browser tests, desktop/mobile dashboard screenshots, submission copy, business plan, and [research rubric](research/hackathon.md). I also rechecked the [official rules](https://revenuecat-shipaton-2026.devpost.com/rules) and [submission guide](https://www.revenuecat.com/blog/engineering/how-to-submit-your-app-for-shipaton). This is an internal AI judge assessment, not an organizer score or a prediction of winning.

**Verdict:** a coherent, visually polished consumer MVP with a clear human story and honest monetization boundaries. It is not yet a proven business or a qualifying published entry. The most important engineering weaknesses were in long-lived local data and photo lifecycle, rather than basic project creation. The review triggered fixes; their implementation status is recorded separately below.

## Ranked findings and disposition

### Native verification follow-up — keyboard drafts and bounded history: fixed

Android API 36 testing found that Back could dismiss a checkpoint modal while hiding the keyboard, losing an unsaved note. The final handler dismisses a visible keyboard first; emulator verification confirms the typed text and modal remain. Saving the checkpoint and force-stopping/relaunching also preserves the committed note.

The large-history fixture exposed unbounded card rendering in project history and Moments. Both now show ten notes per page. New browser scenarios use a valid archive above 2 MB with 300 checkpoints, verify forward/backward pagination, bound visible card counts, and confirm reload persistence. The full suite now passes 93 unit/service tests and 20 browser scenarios. This is an engineering follow-up, not a revision of the historical advisory score below.

### P1 — Large valid histories could become unreadable on Android: fixed and included in the rebuilt preview

The original storage implementation wrote all JSON into one AsyncStorage row. A valid text-only project with 250 maximum-length checkpoints measured **2,280,661 bytes**, even without photos. That exceeds Android's commonly encountered SQLite CursorWindow single-row capacity. The schema permits 2,000 checkpoints per project and 500 projects, so this was an achievable data-growth failure, not merely malformed input. Existing tests mocked storage and could not expose a native row limit.

Fix implemented in `src/services/storage.ts`: native records now use Unicode-safe chunks of at most 256 KiB, with an atomic generation manifest. All new chunks are written before changing the pointer; a failed chunk or pointer write leaves the previous generation/legacy row intact. A workspace is capped at 20 MB of serialized record data. `plugins/withUnpauseAndroid.js` configures a 64 MB AsyncStorage database so old/new maximum-sized generations can coexist. Web retains its existing key and honest quota errors.

Verification: unit tests round-trip a record above 2 MB, bound every row, preserve old data after a failed pointer write, migrate legacy rows safely, reject missing chunks without overwrite, recover explicitly, and reject records above 20 MB before mutation. The final standalone Android preview also imported a 2,723,781-byte valid archive with 300 checkpoints and an embedded PNG through Android DocumentsUI, then preserved the latest note and image after force-stop/relaunch. This is actual emulator evidence for the large-row regression; physical-device storage exhaustion and injected native filesystem failures remain separate tests.

### P1 — Photo deletion and canceled imports left private files behind: APIs fixed; UI integration added during review

Deleting/erasing/replacing project records originally removed their URIs but not native `unpause-photos` files. Import created native photos before the replace-confirmation dialog, so Cancel also left files. A failed import photo write could leave a partially written file. Repeatedly choosing draft photos could grow storage indefinitely. These were privacy and capacity problems; “erase local projects” should not leave reachable app-owned photo files indefinitely.

`src/services/media.ts` now provides `clearUnusedPhotos(projects)`, `discardImportedPhotos(candidate, protectedProjects)`, and `discardUnusedPhoto(uri, protectedProjects)`. They only delete UUID-named JPEG/PNG/WebP files inside the exact app-owned photo directory, preserve every live cover/history reference, reject traversal/outside paths, and report cleanup failures. A failed photo write removes its partial output. Native import failures discard previously materialized files. UI cleanup is now integrated with successful commits and canceled candidates/drafts; cover and checkpoint photo removal controls are also implemented.

Release acceptance: verify on a native filesystem that project deletion, full erase, import replacement, canceled import, failed record save, abandoned camera/library draft, and changed draft photo remove only the correct files. Never prune before the record commit. Keep a current store snapshot rather than a stale React closure when deciding which photos are referenced. Cleanup errors after a committed save must not be presented as if the record write rolled back.

### P1 — Full photo backups could hit a limit with no clean recovery path: bounded fix implemented during review

At the time of the finding, native photo storage could grow beyond 30 MB while `exportBackup` refused a serialized backup above 30 MB. A cover photo that also appeared in checkpoint history was embedded repeatedly in the JSON. Several photos near the 5 MB per-photo limit could exhaust the backup budget. The error suggested individual project handoffs, but `exportProject` created text without photos, and no old-checkpoint-photo removal control was visible. Users could have been forced to discard project history to make a complete backup fit.

Recommended fix: enforce a portable-backup size budget before accepting additional media, with a useful explanation and a way to remove/replace large photos; or implement complete per-project portable backup and a safe merge import. A streamed archive with a deduplicated photo manifest would be stronger but is a larger format change. Do not claim all photo archives are freely portable while the only complete export can become unavailable during ordinary use. Test multiple photos, repeated cover/history references, export limits, and the proposed recovery path.

Implemented response: native `saveData` now calls `assertPortableBudget` before writing any row. It estimates compact JSON plus base64-encoded file sizes per reference, including repeated cover/history references, and refuses changes above **28 MB** to reserve room below the 30 MB export limit. File sizes are memoized; photos are not read into memory just for estimation. Web's entire embedded record is already capped at 20 MB. Exports now use compact JSON so their size follows this estimate. Cover/checkpoint photo removal controls are implemented. Three additional tests verify repeated-reference counting, no mutation on budget failure, acceptance below the limit, and missing-file errors. This protects new commits; an already damaged or legacy over-budget workspace still needs deliberate recovery, and file loss outside the app cannot be repaired by a size estimate.

### P1 — Pitch promised selectable energy while Home ignored energy: fixed during review

The original Home called `suggestProjects(projects, minutes)` with no energy state/control. The pure function and unit tests supported energy, so those tests passed even though the feature described in the demo, listing, and business plan was missing from the experience. Any/Gentle/Steady/Focused energy controls now pass the chosen value, and energy filtering is covered by the passing real-browser scenarios.

### P1 — Required external release evidence is still missing: operational gate, not an implementation defect

The general competition requires a new public eligible-store release, US availability, functioning RevenueCat-powered monetization, and demonstrated functionality. A web preview or debug-signed APK does not establish those conditions. The prepared docs correctly distinguish them. No live store URL, real purchase/restore evidence, public demo video, or completed Devpost submission was available during this review. These cannot be replaced by more code or by giving a high internal score.

Store/commercial onboarding, owner-controlled credentials, physical Galaxy billing verification, final signing, public policy/support pages, and submission must be completed and evidenced. The prepared script has an explicit truthful fallback when checkout remains unavailable. Keep it. [Official entry requirements](https://revenuecat-shipaton-2026.devpost.com/rules).

### P2 — Sample mode sent a new user directly to a paywall: transition added during review

The original sample studio had three unfinished projects, occupying the free allowance. Clicking New project after exploring the product opened Studio before the user had created a real project. The only obvious way to start fresh was inside Settings. This undermined the strongest acquisition moment and could feel like a payment requirement to try the app.

Add a prominent, explicit “Start my studio” transition in sample mode. Confirm removal of sample content, preserve real projects, and then open creation. Avoid silently deleting a sample project the user has modified. Do not solve this by trusting arbitrary imported `isSample` flags to confer permanent free capacity.

The root added an explicit confirmation when transitioning from sample data to creating a real project. Verify that modified sample content is clearly described before removal and that real projects survive.

### P2 — Notification taps did not return to the referenced project: handler implemented; native delivery unverified

Reminder payloads already include a project ID, but the root originally had no notification-response handler. Tapping a reminder would open the application without restoring its specific context. Cold/warm response handling is now integrated. Actual native notification scheduling, delivery, and tap behavior remain untested. Verify deleted projects, stale IDs, app restart, and permission denial on native hardware; browser tests and an emulator cold launch cannot prove notifications.

### P2 — Import permits more free open projects: document a deliberate grace policy

Imports do not contain an accepted Studio entitlement; unknown entitlement fields are stripped by the data schema, and billing reads real RevenueCat data. However, a valid backup may contain more than three open projects, and those existing projects remain resumable/editable. Free creation/reopen is capped separately. A technically sophisticated user can construct a larger backup without purchasing.

This is a local-access licensing tradeoff, not a server authorization vulnerability: there is no paid cloud operation or sensitive shared resource. Preserve imported data and state the policy explicitly. If strict paid limits are commercially necessary, let users choose which three projects are active while keeping all other imported records readable/exportable. Never silently discard records or mark an import as a verified purchase. Local code/data can always be modified on a user-controlled device; expensive client DRM is not the priority.

### P2 — Technical limits and “unlimited” need consistent user-facing qualification

The app schema has 500-project and 2,000-checkpoint limits, records now cap at 20 MB, photos cap at 5 MB, and backups at 30 MB. Paywall copy says unlimited projects/history with a device-storage caveat. The business plan mentions technical limits, but a paying user should be able to discover practical limits before accumulating an unexportable archive. Replace vague capacity errors with concrete next steps and avoid suggesting a normal backup includes a draft that failed to save.

### P2 — Required screenshot evidence was not yet final

I viewed `artifacts/screenshots/desktop-dashboard.png` and `mobile-dashboard.png`. The desktop composition is balanced and clear; typography, illustration, and palette are notably cohesive. The phone image is attractive but spends much of the first viewport on the hero, so the actual next-step card is below the fold. A shorter mobile hero would show the utility earlier.

The reviewed mobile screenshot was 1082 × 2202 and the desktop was 1440 × 1000; neither substitutes for the specifically required submission image. Export the final phone state at the required 1179 × 2556 size and generate Galaxy's separate listing requirements. Capture actual UI, keep the sample badge if seeded data is used, and avoid decorative device frames where prohibited. Final store asset work is proceeding independently.

## Security and truthfulness assessment

- No stored `studio` flag or imported account field grants entitlement. SDK success alone is insufficient: the service checks active `studio` with no expiry.
- RevenueCat calls and identity transitions are serialized; stale in-flight results reject after an account change. UI identity synchronization also resets Studio state and guards stale results.
- Missing credentials, Expo Go purchases, simulated Test Store keys, failed authentication, canceled purchases, and unsupported web restore are not fabricated as success.
- Native Supabase sessions use SecureStore generations, secure random PKCE/SHA-256 primitives, same-device code exchange, and explicit recovery handling. No service-role key is exposed by the client.
- The deletion function verifies the access token server-side, derives the target ID from the verified user, and never accepts a client-selected deletion target. Real endpoint/auth/RevenueCat behavior remains untested without credentials.
- Import validates all records and foreign-device URI rejection before materializing media, preserves original workspace records until explicit replacement, and clears old session/reminder identities.
- The sources/documents do not claim invented customers, revenue, proven retention, clinical outcomes, interviews, or completed publication. The founder attribution is reasonable, with an explicit instruction to adapt process claims to Shivam's actual involvement.

## Commercial assessment

The problem is recognizable, the product is easy to explain, and lifetime pricing fits a local utility with no recurring inference/cloud-storage cost. Choosing not to add generic AI instruction generation was a sensible scope decision. The explicit free tier and real one-time billing integration are credible foundations.

The commercial weak point is differentiation and proof. Notes and craft trackers are credible substitutes, and the market research acknowledges them. The return ritual is a positioning advantage, not a proven moat. No observed repeated use, payment willingness, distribution advantage, or acquisition cost has been established. The Grand Prize's revenue shortlisting makes actual launch and acquisition more valuable than another decorative feature at this stage.

Next test: five to ten actual multi-hobby makers each capture their own paused object, return to it on another day, and compare the handoff with their current method. Record whether the saved next step was enough to begin and whether they leave a second checkpoint. Offer the configured upgrade without leading them. Report observations and real purchases, including negative results, rather than hypothetical conversion percentages.

## Historical advisory scorecard

These are the original subjective 0–10 internal ratings aligned with category intent, preserved without rescoring after the verification addendum below. They are not official weights and must not be published as judge results. Descriptions in this table reflect the evidence available at the original scoring point.

| Dimension | Product/implementation only, external credentials excluded | Current complete entry, external evidence included | Reason |
| --- | ---: | ---: | --- |
| Clear problem and story | 8.5 | 8.5 | Specific physical-project return moment; concise narrative. |
| Visual design and coherence | 8.3 | 8.0 | Strong screen composition; interaction/motion/accessibility/device proof less developed. |
| Core usability and reliability | 7.2 | 6.0 | Complete local loop; storage fix verified in mocks; native media/recovery and backup limits need closure. |
| Appropriate monetization | 7.5 | 3.0 | Honest lifetime model and real SDK integration; no actual purchase evidence yet. |
| Differentiation and commercial proof | 5.5 | 4.5 | Focused experience; direct substitutes and no observed validation/revenue. |
| Galaxy readiness | 6.8 | 2.5 | Separate package, store SDK, responsive config; no physical Galaxy purchase or published listing. |
| Submission completeness | 8.0 | 2.0 | Good draft copy/script/deck/brief; mandatory live artifacts remain unavailable. |

Ignoring external credentials, the implementation is approximately **7.4/10** at this review point. Including missing release evidence, it is **not submission-ready**, regardless of a numeric average. The most promising categories remain Design, HAMM, and Galaxy after real release and verification. Peace requires actual benefit evidence; Grand Prize cannot be scored as competitive without real revenue.

## Verification performed by this review

- Read the source and existing auth/billing/domain/storage/browser tests.
- Viewed both dashboard screenshot artifacts.
- Reproduced the text-only native single-row size failure condition by calculating a valid record's serialized bytes.
- Implemented native storage and scoped media lifecycle fixes after parent authorization.
- Ran **27 storage/media unit tests: passed**. These include large native rows, generation commit failure, legacy migration, total limits, portable-photo budgeting, cleanup scope, protected references, cancellation, malformed/oversized imports, and partial-file write failure.
- Earlier auth/billing implementation has 14 dedicated tests covering honest failure behavior and identity races; final full-suite reruns remain the root's release responsibility.
- TypeScript passed after the integrated fixes. Native config introspection confirmed the 64 MB AsyncStorage setting. These checks are still distinct from a final signed binary and physical-device verification.
- Physical devices, live accounts, real purchases, signed store artifacts, publication, and submitted video were not verified by this reviewer.

The recommendation at the original review cutoff was to verify the integrated P1 fixes through final UI/native flows, rerun the full suite, and then prioritize the external release path and authentic user feedback. The following addendum records subsequent progress without changing the historical score.

## Final verification addendum — September 16, 2026

This documentation-only update records final results supplied by the primary implementation and native-build agents. It does not claim that this reviewer independently repeated those runs. The earlier **7.4/10** subjective implementation assessment is unchanged; successful checks are evidence of resolved defects, not a reason to inflate a historical judge score.

| Finding / evidence | Final disposition | Remaining limit |
| --- | --- | --- |
| Automated application tests | **93 unit tests passed.** | Mocked service tests do not verify live Supabase or payment-provider behavior. |
| Real-browser scenarios | **20 scenarios passed**, including energy filtering. | Browser results do not prove native permissions, notifications, camera behavior, or Galaxy billing. |
| Native storage generations and capacity | Implemented, tested, and included in the rebuilt preview. | Large-workspace and disk-failure behavior still warrants physical Android verification. |
| Photo cleanup and removal | Scoped cleanup APIs, commit/cancel integration, and cover/checkpoint removal controls are implemented. | Confirm the complete file lifecycle on native hardware; record-level browser tests alone cannot inspect physical-device files. |
| Portable photo budget | Precommit 28 MB estimate, 20 MB record cap, compact exports, and explicit reduction controls are implemented. | Previously damaged/over-budget data and externally missing photo files still require deliberate recovery. |
| Energy matching | UI controls and passing browser coverage are implemented. | No claim of measured time savings or improved user outcomes follows from functional tests. |
| Notification project routing | Cold/warm tap-response handler is integrated. | Actual native scheduling, delivery, and tap behavior are **not yet verified**. |
| Android native compilation | **arm64 Galaxy standalone preview compiled** with bundled JavaScript. | This is a preview artifact, not evidence of production store signing or certification. |
| APK checks | APK signature and **16 KiB alignment verified**. | Signature validity does not establish an owner-controlled production signing identity or store acceptance. |
| Offline runtime smoke test | Emulator offline cold launch completed in **683 ms**, with no runtime errors observed in that run. | This is one emulator observation, not a performance benchmark, a full native end-to-end test, or physical Galaxy evidence. |
| Native visual/demo evidence | Native screenshots, video capture, and the build-evidence record are being finalized separately. | Local captures are not a publicly uploaded, compliant submission video or an approved store listing. |

The most serious identified implementation gaps now have code fixes and automated evidence. The remaining release blockers are explicit: owner/commercial-store onboarding, production signing, real Supabase account flows, real RevenueCat purchases and restores on a **physical Galaxy device**, public policy/support pages, an approved US-accessible store listing, a compliant public demo video, and completed Devpost submission. Native notification delivery and broader physical-device testing also remain unverified. iOS source compatibility/configuration must not be represented as a completed iOS native build or App Store release.

See [native build evidence](release/native-build-evidence.md) for the separately maintained artifact/toolchain record and [launch checklist](release/launch-checklist.md) for the remaining external gates. The native agent is finalizing that evidence record; if it still shows an earlier in-progress state, use the final logs/artifacts and updated record before making a public build claim.

**Release verdict remains:** substantially better verified implementation, but not yet a qualifying published hackathon entry or a validated business. Prioritize the remaining real-device/live-service checks, legitimate publication, and authentic user feedback over additional feature expansion.
