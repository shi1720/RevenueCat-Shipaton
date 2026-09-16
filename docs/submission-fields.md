# Unpause submission fields

Prepared September 16, 2026. The web app is publicly hosted. The Android app is a preview; an eligible app-store release and live store purchases remain pending. Internal readiness notes are separated from the paste-ready story.

**Web app:** https://unpause-studio.web.app

**Uploaded video:** https://www.youtube.com/watch?v=jXpOlvDShRY

The YouTube video is public; playback was confirmed after processing.

## Project name

Unpause

## Elevator pitch

Leave yourself a way back. Unpause saves the next tiny step in an unfinished hobby, then helps you find a project that fits the time and energy you have.

## Project story

Paste the following seven sections into the Devpost story, keeping their headings. Adapt to the actual form if Devpost provides separate fields.

### Inspiration

You open a drawer and find the project you loved three weeks ago. You have ten free minutes. But where did you stop? What comes next? Where did you put the materials?

Maker communities describe leaving notes with stored projects so they can reconstruct their plans later. That small act became Unpause: a note to your future self, designed around the moment you return.

### What it does

Unpause saves a handoff for an unfinished physical hobby: a photo, where you stopped, one tiny next action, and where the materials live.

When time opens up, choose your available time and energy. Find a project with a step that fits, open its resume card, and make a little. Leave a fresh checkpoint when you stop. Your photos, notes, and past sessions build a history of small returns.

Three unfinished projects are free. Finishing one opens a slot for another idea. Studio is the planned lifetime upgrade for unlimited unfinished projects within device storage limits. Reminders, finished projects, and portable backups stay free.

### How we built it

Shivam Gupta created Unpause with AI-assisted research, implementation, and testing. React Native, Expo, and TypeScript share the core experience across Android, iOS, and web.

The app works locally without signup. Firebase supports optional account identity, with Supabase retained as a configurable fallback. Signing in does not upload or synchronize project notes and photos.

RevenueCat integration handles lifetime offerings, verified Studio entitlements, purchase restoration, and account changes. Native storage uses bounded chunks and an atomic manifest. Validated backups preserve photos as well as text.

Warm paper colors, violet accents, Fraunces headings, and original craft illustrations give the shelf its identity.

### Challenges we ran into

A hobby journal can become a large archive. We reproduced an Android storage risk above two megabytes, then tested a 300-checkpoint archive through import and restart, including its latest note and photo.

We also protected unsaved drafts, prevented account changes from applying stale purchase results, and handled failed writes and cancelled imports. Accessibility testing exposed contrast, navigation-role, and narrow-screen layout issues that led to fixes and regression checks.

### Accomplishments that we're proud of

The complete pause, return, make, and checkpoint loop works in a live web app and an installable Android preview. The latest implementation passes 101 unit tests and 30 desktop/mobile browser scenarios. The hosted app also passed real signup, session persistence, sign-in, sign-out, and account deletion. Android emulator checks exercise the native making workflow.

The commercial model fits occasional hobby use: a useful free tier and one understandable lifetime upgrade. US $19.99 is the proposed price to validate with actual buyers.

### What we learned

The next physical action can be more useful than a long plan. A materials note can matter as much as a photo. Preserving that context reliably is part of the product experience.

Notes, Krafio, Purlsy, and Tapcord are credible alternatives. Unpause's bet is a calmer, faster return ritual organized around the time and energy available. That differentiation still needs testing with people's own projects.

### What's next for Unpause

Finish real store purchases, restoration, account/purchase-data deletion, physical-device testing, and a qualifying public store release. iOS source and build configuration are prepared; a compiled iOS binary remains to be produced.

Then invite makers to capture a handoff and return on another day. Observe whether they can start, whether they leave a second checkpoint, and whether Studio earns a purchase. Let that evidence guide better capture and craft-specific prompts.

The immediate aim is concrete: help someone reopen the drawer and keep making.

## Built with

TypeScript, React Native, Expo, RevenueCat, Samsung IAP integration, Firebase Authentication, Firebase Hosting, Supabase (optional fallback), AsyncStorage, Zod, Vitest, Playwright.

Do not select Kotlin Multiplatform, Replit, OneSignal, Layers, RevenueCat Ads, RevenueCat Funnels, Stripe, or Noise as implemented integrations. Generated native Kotlin project files do not make this a Kotlin Multiplatform entry.

## Testing instructions

### Working preview

Open [the live Unpause app](https://unpause-studio.web.app). No account is required for the local project experience. An Android APK is also supplied as a native preview. The Android preview uses a test certificate and runs offline without a development server. Install it only as the clearly labeled development preview.

1. Choose **Make room for my projects** for a clean studio, or **Explore a sample studio** for labeled example projects.
2. Create a project named **Patchwork bookmark**. Enter **Sew the short edge with violet thread** as the next step and **Small basket on the desk** as the materials location. Choose ten minutes and gentle energy. Add a photo if available.
3. Save the project. Open its resume card and select **Let's make a little**. The app starts a making session.
4. Use **Pause & leave a note** or **Save a checkpoint**, as shown in the build. Record where you stopped and leave a new next action. Save your place and confirm the new checkpoint appears in history.
5. Restart the app or reload the web preview. Confirm the saved project and latest checkpoint remain.
6. On **Your day**, try the time and energy filters. In the sample studio, ten minutes and gentle energy should include the Sunday tote and exclude the longer shelf project.
7. Mark a project finished and confirm it remains on the finished shelf. It no longer consumes one of the three free unfinished-project slots.
8. In **Your corner**, export a backup. Import that backup only after reading the replacement confirmation. Cancel first to verify that existing data stays intact, then restore if desired.

Project names, notes, and photos in the demonstration are examples. No private account credentials should appear in public testing instructions.

### Optional account access

Firebase is the primary account provider in the configured app; Supabase remains an optional configuration fallback. Open **Your corner** and the account panel to create an account or sign in with your own email address. Signing in connects account identity while projects remain on this device. It does not provide cloud project sync. Never publish private test credentials.

The public web app passed actual signup, persistence after reload, sign-out, sign-in, account deletion with confirmation, and rejection of the deleted credentials. Local projects remained intact after account deletion. Password reset email delivery and native account persistence on physical hardware remain separate checks. See [Firebase account setup](release/firebase-accounts.md).

### Premium access

The preview does not demonstrate live store purchases. Checkout remains explicitly unavailable until the real offering is configured.

Before final judging, supply an actual trial or redeemable promo code and verify it against the published store build. Include the precise redemption route and a way to contact the entrant if access fails. Do not put a made-up code, local entitlement bypass, or “all premium features work” claim into this field. For a configured native build, verify **Restore purchases** with the purchasing store account.

## YouTube title

Unpause: Leave Yourself a Way Back | Shipaton 2026 Native App Demo

## YouTube description

Unpause remembers the next tiny step in an unfinished hobby, so a little free time becomes making time.

Try the web app: https://unpause-studio.web.app

Created by Shivam Gupta for RevenueCat Shipaton 2026. This demo shows actual native Android emulator interactions with illustrative sample projects. The narration is AI-generated and does not reproduce Shivam's voice.

Save where you stopped, find a project that fits your time and energy, make a little, and leave your next handoff. The core experience works locally without signup, with photos, project history, and portable backups. Optional accounts do not synchronize project data.

Three unfinished projects are free. Studio is the planned lifetime upgrade through RevenueCat. Live purchase verification and public app-store release remain pending.

#Shipaton #RevenueCat #Unpause

## Cover assets

- [Devpost cover](../artifacts/submission/Unpause-devpost-cover.png): 1500 × 1000, 3:2 PNG.
- [YouTube thumbnail](../artifacts/submission/Unpause-youtube-thumbnail.png): 1920 × 1080, 16:9 PNG.

Both use original branding and an actual native preview frame. They do not replace the required unframed 1179 × 2556 app screenshot.

## Category descriptions

### RevenueCat Design Award

Look at the handoff card, the time-and-energy return flow, and the way each project keeps its context together. Warm paper colors, violet accents, serif headings, and original craft illustrations make the shelf approachable. The copy treats an unfinished project as something the user can return to, with no overdue labels or streak pressure. Responsive layouts and the accessibility fixes help that visual idea hold up on smaller screens.

### HAMM Award

Unpause pairs three free unfinished projects with a planned one-time Studio unlock. Finishing a project releases a free slot, while backups and existing memories remain accessible. RevenueCat supplies the lifetime entitlement, offerings, restoration, and purchase identity handling. The proposed US $19.99 price fits intermittent hobby use and the low operating cost of local storage. Payment willingness and real revenue remain unvalidated until launch and actual purchases.

### Best App for Galaxy

The repository includes a distinct Galaxy configuration, the RevenueCat Galaxy billing adapter, responsive narrow/wide layouts, and Android build support. Real Galaxy purchase testing, physical foldable validation, and the public Galaxy Store listing remain release gates. Do not claim Samsung feature integration, physical foldable testing, or store exclusivity without evidence.

## Internal rubric assessment

This is an internal readiness assessment, not an organizer score or a prediction of winning.

| Category | Current case | Evidence still needed |
| --- | --- | --- |
| Design | Strongest product fit: coherent visual identity and a clear return interaction | Final release-device polish and the public eligible-store build |
| HAMM | Understandable lifetime model and implemented RevenueCat plumbing | Configured premium access, real transactions, and payment validation |
| Galaxy | Separate integration/configuration and demonstrated Android preview | Physical Galaxy testing, meaningful device optimization evidence, and public listing |
| Peace | Plausible benefit for people returning to creative hobbies | Observed benefit and a credible community-impact case |
| Grand Prize | No supported growth case yet | Post-release acquisition/retention experiments and RevenueCat-recorded revenue |
| BuildInPublic / Most Viral | Development artifacts and a demo are available | Actual public journey, audience response, and attributable conversion evidence |

The core project is ready for a transparent preview. A completed Devpost form cannot substitute for the missing publication and monetization conditions.

## Final form fields that cannot be invented

- Actual public store URL, accessible from the United States.
- Actual RevenueCat project identifier and configured qualifying purchase.
- Public YouTube or Vimeo URL that opens without a request for access.
- Tested premium trial or promo code for judges.
- Accurate first-public-release date within the qualifying window.
- Any required age, residency, conflict-of-interest, or student declarations based on Shivam's actual circumstances.
- Real growth metrics only when supported by records.

## Eligibility check against the latest supplied overview

The attached overview introduces no general exception to public store release. Its broad age label does not override the official adult-entry rule or the restricted student route. The current rules still distinguish Next Gen through active enrollment, a qualifying academic email, and a public repository with a detectable open-source license. An entrant cannot assume student eligibility to bypass store publication.

Main-category submission still needs a newly released eligible-store app, working RevenueCat monetization, US access, a public device-demo video, the required icon/screenshot, and judge access to premium features. The text of the attached overview and the official rules use slightly different start-date wording. Plan the first store release within August 1 through September 30 rather than relying on that discrepancy. The deadline remains October 1 at 12:15 pm IST. The formal rules control eligibility. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules)

Public source is not mandatory for the ordinary categories. Category-specific integrations and actual growth evidence still matter. None of the sponsorship or student exceptions should be selected merely because the app uses React Native or includes a preview APK.

## Source references for the story

The maker behavior comes from a [first-person sewing discussion](https://www.reddit.com/r/sewing/comments/1u4dxvf/who_fizzles_out_before_finishing_a_sewing_project/). Competitive descriptions use official pages for [Krafio](https://www.krafio.app/?lang=en), [Purlsy](https://purlsy.com/), and [Tapcord](https://tapcord.app/for/crafts). Implementation and testing claims refer to the repository's [native evidence](release/native-build-evidence.md), [web QA evidence](release/web-qa-evidence.md), and [independent review](review.md). These references do not establish market prevalence or willingness to pay.
