# Independent adversarial product and release review

Reviewed September 16, 2026 against the actual source, unit/browser tests, desktop/mobile dashboard screenshots, submission copy, business plan, and [research rubric](research/hackathon.md). I also rechecked the [official rules](https://revenuecat-shipaton-2026.devpost.com/rules) and [submission guide](https://www.revenuecat.com/blog/engineering/how-to-submit-your-app-for-shipaton). This is an internal AI judge assessment, not an organizer score or a prediction of winning.

**Verdict:** a coherent, visually polished consumer MVP with a clear human story and honest monetization boundaries. It is not yet a proven business or a qualifying published entry. The most important engineering weaknesses were in long-lived local data and photo lifecycle, rather than basic project creation. The review triggered fixes; their implementation status is recorded separately below.

## Ranked findings and disposition

### P1 — Large valid histories could become unreadable on Android: fixed in code, native rebuild required

The original storage implementation wrote all JSON into one AsyncStorage row. A valid text-only project with 250 maximum-length checkpoints measured **2,280,661 bytes**, even without photos. That exceeds Android's commonly encountered SQLite CursorWindow single-row capacity. The schema permits 2,000 checkpoints per project and 500 projects, so this was an achievable data-growth failure, not merely malformed input. Existing tests mocked storage and could not expose a native row limit.

Fix implemented in `src/services/storage.ts`: native records now use Unicode-safe chunks of at most 256 KiB, with an atomic generation manifest. All new chunks are written before changing the pointer; a failed chunk or pointer write leaves the previous generation/legacy row intact. A workspace is capped at 20 MB of serialized record data. `plugins/withUnpauseAndroid.js` configures a 64 MB AsyncStorage database so old/new maximum-sized generations can coexist. Web retains its existing key and honest quota errors.

Verification: unit tests round-trip a record above 2 MB, bound every row, preserve old data after a failed pointer write, migrate legacy rows safely, reject missing chunks without overwrite, recover explicitly, and reject records above 20 MB before mutation. The native builder was told to regenerate Gradle properties. A unit pass does not replace an actual Android load/restart test.

### P1 — Photo deletion and canceled imports left private files behind: APIs fixed; UI integration added during review

Deleting/erasing/replacing project records originally removed their URIs but not native `unpause-photos` files. Import created native photos before the replace-confirmation dialog, so Cancel also left files. A failed import photo write could leave a partially written file. Repeatedly choosing draft photos could grow storage indefinitely. These were privacy and capacity problems; “erase local projects” should not leave reachable app-owned photo files indefinitely.

`src/services/media.ts` now provides `clearUnusedPhotos(projects)`, `discardImportedPhotos(candidate, protectedProjects)`, and `discardUnusedPhoto(uri, protectedProjects)`. They only delete UUID-named JPEG/PNG/WebP files inside the exact app-owned photo directory, preserve every live cover/history reference, reject traversal/outside paths, and report cleanup failures. A failed photo write removes its partial output. Native import failures discard previously materialized files. The root implementation is wiring cleanup to successful commits and canceled candidates/drafts.

Release acceptance: verify on a native filesystem that project deletion, full erase, import replacement, canceled import, failed record save, abandoned camera/library draft, and changed draft photo remove only the correct files. Never prune before the record commit. Keep a current store snapshot rather than a stale React closure when deciding which photos are referenced. Cleanup errors after a committed save must not be presented as if the record write rolled back.

### P1 — Full photo backups could hit a limit with no clean recovery path: bounded fix implemented during review

Native photo storage can grow beyond 30 MB while `exportBackup` refuses a serialized backup above 30 MB. A cover photo that also appears in checkpoint history is embedded repeatedly in the JSON. Several photos near the 5 MB per-photo limit can exhaust the backup budget. The error suggests individual project handoffs, but `exportProject` creates text without photos. There is no visible old-checkpoint-photo removal control. Users may have to discard project history to make a complete backup fit.

Recommended fix: enforce a portable-backup size budget before accepting additional media, with a useful explanation and a way to remove/replace large photos; or implement complete per-project portable backup and a safe merge import. A streamed archive with a deduplicated photo manifest would be stronger but is a larger format change. Do not claim all photo archives are freely portable while the only complete export can become unavailable during ordinary use. Test multiple photos, repeated cover/history references, export limits, and the proposed recovery path.

Implemented response: native `saveData` now calls `assertPortableBudget` before writing any row. It estimates compact JSON plus base64-encoded file sizes per reference, including repeated cover/history references, and refuses changes above **28 MB** to reserve room below the 30 MB export limit. File sizes are memoized; photos are not read into memory just for estimation. Web's entire embedded record is already capped at 20 MB. Exports now use compact JSON so their size follows this estimate. The root is adding cover/checkpoint photo removal controls. Three additional tests verify repeated-reference counting, no mutation on budget failure, acceptance below the limit, and missing-file errors. This protects new commits; an already damaged or legacy over-budget workspace still needs deliberate recovery, and file loss outside the app cannot be repaired by a size estimate.

### P1 — Pitch promised selectable energy while Home ignored energy: fixed during review

The original Home called `suggestProjects(projects, minutes)` with no energy state/control. The pure function and unit tests supported energy, so those tests passed even though the feature described in the demo, listing, and business plan was missing from the experience. The root has now added Any/Gentle/Steady/Focused energy controls and passes the chosen value. Browser tests must verify visible filtering, including no-match states, before the voiceover demonstrates it.

### P1 — Required external release evidence is still missing: operational gate, not an implementation defect

The general competition requires a new public eligible-store release, US availability, functioning RevenueCat-powered monetization, and demonstrated functionality. A web preview or debug-signed APK does not establish those conditions. The prepared docs correctly distinguish them. No live store URL, real purchase/restore evidence, public demo video, or completed Devpost submission was available during this review. These cannot be replaced by more code or by giving a high internal score.

Store/commercial onboarding, owner-controlled credentials, physical Galaxy billing verification, final signing, public policy/support pages, and submission must be completed and evidenced. The prepared script has an explicit truthful fallback when checkout remains unavailable. Keep it. [Official entry requirements](https://revenuecat-shipaton-2026.devpost.com/rules).

### P2 — Sample mode sent a new user directly to a paywall: transition added during review

The sample studio has three unfinished projects, occupying the free allowance. Clicking New project after exploring the product opens Studio before the user has created a real project. The only obvious way to start fresh was inside Settings. This undermines the strongest acquisition moment and can feel like a payment requirement to try the app.

Add a prominent, explicit “Start my studio” transition in sample mode. Confirm removal of sample content, preserve real projects, and then open creation. Avoid silently deleting a sample project the user has modified. Do not solve this by trusting arbitrary imported `isSample` flags to confer permanent free capacity.

The root added an explicit confirmation when transitioning from sample data to creating a real project. Verify that modified sample content is clearly described before removal and that real projects survive.

### P2 — Notification taps did not return to the referenced project: being fixed during review

Reminder payloads already include a project ID, but the root originally had no notification-response handler. Tapping a reminder would open the application without restoring its specific context. The root is adding cold/warm response handling. Verify deleted projects, stale IDs, app restart, and permission denial on native hardware; browser tests cannot prove notifications.

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

## Advisory scorecard

These are subjective 0–10 internal ratings aligned with category intent. They are not official weights and must not be published as judge results.

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

Verify the integrated P1 fixes through the final UI/native flows, rerun the full suite, verify a real native build/device, and then prioritize the external release path and authentic user feedback.
