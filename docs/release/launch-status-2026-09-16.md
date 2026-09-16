# Launch status: September 16, 2026

## Public deliverables

- App: https://unpause-studio.web.app
- Demo: https://www.youtube.com/watch?v=jXpOlvDShRY
- Privacy: https://unpause-studio.web.app/privacy
- Terms: https://unpause-studio.web.app/terms
- Support: https://unpause-studio.web.app/support

The YouTube demo is public, 78 seconds long, and uses actual Android emulator footage. It includes synthetic narration, visible captions, a selectable English subtitle track, and an original thumbnail. AI narration is disclosed in the video and description. YouTube's copyright and Community Guidelines checks reported no issues. A signed-out browser loaded the public player and began playback.

## Devpost

Draft editor: https://devpost.com/submit-to/29969-revenuecat-shipaton-2026/manage/submissions/1185565-unpause/additional-info/edit

Saved: Unpause title, elevator pitch, seven-section project story, technology tags, live app link, public video link, project cover, native screenshots with captions, uncropped 1024px app icon, Android platform, testing instructions, and Design/HAMM/Galaxy rationale. Categories without an implemented integration or supporting evidence were left blank.

Final submission was attempted with the owner's authorized terms acceptance. Devpost rejected it with “Please complete required fields in Additional info before submitting.” The additional-info page identifies **RevenueCat project ID** as the remaining required form field. No identifier was fabricated. The project remains a draft.

A valid project ID alone will not establish eligibility. A qualifying public mobile-store release, real RevenueCat monetization, and judge access still need to be completed under the official rules. The store-release declaration remains unchecked.

## Account setup requiring the owner

Samsung reports no existing account for the supplied Gmail address. Its signup form has the owner's email and name filled, but requires date of birth, a new password, and subsequent verification. RevenueCat's signup form is also prepared and requires a new password. The owner was asked to complete these steps in the browser, without sending passwords in chat. No Samsung seller account, RevenueCat dashboard project, store listing, or live purchase has been claimed as completed.

The browser credential rule requires the owner to complete new credential entry; the date of birth is not known and cannot be inferred. Any later identity, seller, tax, or banking verification must use the owner's real information.

## Infrastructure ownership

Firebase project `unpause-studio` is dedicated to this app, under the requested Google account, on the no-cost Spark plan. Firebase Authentication is the configured primary identity provider. No project-note or photo cloud synchronization is enabled.

An unused free Supabase project named Unpause was also created during setup (`ljguedfuxpadvddzfgsj`). It was not connected to the deployed app after choosing Firebase Auth for public email account support. No app customers were migrated. Supabase remains an optional code-level fallback.

The supplied OpenAI key was used only for speech production and verification. It is not part of the app or repository. A private local credential file is outside the workspace with owner-only permissions. Never include it in a release archive or public testing instructions.

## Release limits

Android preview artifacts use a development test certificate and are not a public Galaxy Store release. iOS source and bundle validation do not constitute a compiled, signed iOS binary. Paid Firebase account deletion is deliberately gated until a verified backend can remove the matching RevenueCat customer and Firebase account safely.

See the Firebase hosting/account evidence, native build evidence, and iteration-two review for exact test results and the remaining device checks.

## Final verification artifacts

The final configured Android sideload preview is `artifacts/builds/unpause-galaxy-preview.apk`, SHA-256 `149e2ca14efabba7139459d0627d7f82ada7840fcf1d44f89b004b61fec3c842`. All 41 source/asset hashes match [the recorded snapshot](evidence/source-snapshot.json). Actual emulator UI sign-in, offline process restart persistence, account deletion, and rejection of the deleted identity passed. Test identities were deleted, and the task emulator was shut down after verification. The APK remains test-signed.

[Hosted UI evidence](evidence/firebase-live-account-evidence.json) records successful account and project lifecycles at mobile/desktop widths, legal routes, and five valid loaded font binaries, with no JavaScript errors. [Reset evidence](evidence/firebase-reset-request-evidence.json) confirms the existing account and accepted request, but the authorized Gmail search found no matching message during the test window. Delivery and link completion remain unverified.
