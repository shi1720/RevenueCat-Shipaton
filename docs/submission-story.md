### Inspiration

You open a drawer and find the project you loved three weeks ago. You have ten free minutes. But where did you stop? What comes next? Where did you put the materials?

Maker communities describe leaving notes with stored projects so they can reconstruct their plans later. That small act became Unpause: a note to your future self, designed around the moment you return.

### What it does

Unpause saves a handoff for an unfinished physical hobby: a photo, where you stopped, one next action, and where the materials live.

When time opens up, choose your available time and energy. Find a project with a step that fits, open its resume card, and make a little. Leave a checkpoint when you stop. Your photos, notes, and past sessions build a history of small returns.

Three unfinished projects are free. Finishing one opens a slot for another idea. Studio is the planned lifetime upgrade for unlimited unfinished projects within device storage limits. Reminders, finished projects, and portable backups stay free.

### How we built it

Shivam Gupta created Unpause with AI-assisted research, implementation, and testing. React Native, Expo, and TypeScript share the core experience across Android, iOS, and web.

The app works locally without signup. Firebase supplies optional account identity. Supabase hosts coordinated Firebase/RevenueCat account deletion. Signing in does not upload or synchronize project notes and photos.

RevenueCat handles lifetime Studio entitlements, restoration, and account identity across Galaxy, iOS, Google Play, and Test Store. Native storage uses bounded chunks and an atomic manifest. Validated backups preserve photos as well as text.

Warm paper colors, Fraunces headings, and original craft illustrations make the shelf inviting.

### Challenges we ran into

A hobby journal can become a large archive. We reproduced an Android storage risk above two megabytes, then tested a 300-checkpoint archive through import and restart, including its latest note and photo.

We also protected unsaved drafts, prevented account changes from applying stale purchase results, and handled failed writes and cancelled imports. Accessibility testing exposed contrast, navigation-role, and narrow-screen layout issues that led to fixes and regression checks.

### Accomplishments that we're proud of

The complete pause, return, make, and checkpoint loop works in a live web app and an installable Android preview. 154 unit tests and 30 browser scenarios pass. Hosted Firebase account flows and coordinated deletion passed live tests. The native RevenueCat Test Store also passed cancellation, simulated failure, success, restore, and cold restart. These simulated transactions do not establish production billing or revenue.

The commercial model fits occasional hobby use: a useful free tier and one understandable lifetime upgrade. US $19.99 is the proposed price to validate with actual buyers.

### What we learned

The next physical action can be more useful than a long plan. A materials note can matter as much as a photo. Preserving that context reliably is part of the product experience.

Notes, Krafio, Purlsy, and Tapcord are credible alternatives. Unpause's bet is a calmer, faster return ritual organized around the time and energy available. That differentiation still needs testing with people's own projects.

### What's next for Unpause

Resolve Samsung corporate commercial seller approval, then complete physical-device store purchases, signing, and a qualifying public release. iOS source and build configuration are prepared; a compiled iOS binary remains to be produced.

Then invite makers to capture a handoff and return on another day. Observe whether they can start, whether they leave a second checkpoint, and whether Studio earns a purchase. Let that evidence guide better capture and craft-specific prompts.

The immediate aim is concrete: help someone reopen the drawer and keep making.
