# Unpause submission kit

Prepared for **Shivam Gupta**, RevenueCat Shipaton 2026.

Try [the live web app](https://unpause-studio.web.app) and watch [the public narrated demo](https://www.youtube.com/watch?v=jXpOlvDShRY).

| File | Use |
| --- | --- |
| [Unpause-pitch-final.pptx](Unpause-pitch-final.pptx) | Editable seven-slide product/business pitch, refreshed with live links and verified account/test evidence. Sources are in speaker notes. |
| [Unpause-brief.pdf](Unpause-brief.pdf) | Two-page judge brief with clickable app, demo, and source links. |
| [Narrated native demo](Unpause-demo-narrated.mp4) | 77.792-second landscape demo with visible AI narration disclosure and captions. |
| [Timed captions](Unpause-demo-narrated.srt) | 25 speech-aligned cues for the final narrated demo. |
| [Devpost cover](Unpause-devpost-cover.png) | 1500 × 1000 PNG using original branding and actual native UI. |
| [YouTube thumbnail](Unpause-youtube-thumbnail.png) | 1920 × 1080 PNG, matching the public demo. |
| [Galaxy icon](galaxy-icon-512.png) | 512 × 512 listing icon. The [original app icon](../../assets/icon.png) is 1024 × 1024. |
| [Hackathon screenshots](store-screenshots/) | Native Android emulator captures at 1179 × 2556. Sample content remains labeled. |
| [Galaxy screenshots](galaxy-screenshots/) | Separate native captures at 1080 × 2160 for the listing's 2:1 portrait requirement. |
| [Silent native source](unpause-native-walkthrough.mp4) | Original emulator recording used to make the narrated demo. |

Use the [paste-ready Devpost story](../../docs/submission-story.md), [complete form fields and testing instructions](../../docs/submission-fields.md), and [verbatim narration guide](../../docs/submission.md). Older `unpause-voiceover-captions.en.srt` cues refer to an earlier narration draft; use `Unpause-demo-narrated.srt` with the final video.

## Current evidence

The web app is publicly hosted on Firebase. Real hosted signup, reload persistence, sign-in, sign-out, confirmed account deletion, and rejection after deletion passed. Local projects remain on the device after account deletion. Firebase is the primary optional account provider, with Supabase retained as a configurable fallback. Accounts do not synchronize projects.

The implementation passes **101 unit tests** and **30 desktop/mobile browser scenarios**. An installable Android emulator preview exists. Native bundle checks do not establish physical-device account persistence or a compiled iOS release. See [the second implementation review](../../docs/review-iteration2.md), [native evidence](../../docs/release/native-build-evidence.md), and [video evidence](../../docs/release/video-evidence.md).

## Remaining release gates

RevenueCat integration is implemented, but live store purchases, purchase-profile deletion, physical Galaxy purchase/restore verification, final signing, and eligible store publication remain pending. US $19.99 is a proposed lifetime Studio price. No customer traction or proven willingness to pay is claimed.

The current demo shows native emulator interactions with illustrative projects. It does not demonstrate a completed purchase or store approval. The web app and public video do not substitute for the hackathon's qualifying store release and monetization requirements. See [owner setup](../../docs/OWNER_SETUP.md) and the [launch checklist](../../docs/release/launch-checklist.md).

## Rebuild assets

The generation scripts are `scripts/generate-submission.mjs`, `scripts/generate-submission-brief.py`, `scripts/generate-demo.py`, and `scripts/generate-submission-covers.py`. Use the bundled workspace Node/Python dependencies for the slides and PDF. Set a fresh `OUTPUT_PPTX` filename when regenerating the deck because its finalizer deliberately protects existing outputs. Render and inspect new slides/pages before replacing the stable submission filenames.

The artifacts credit Shivam Gupta as creator and preserve honest distinctions between implementation, verified behavior, pricing hypotheses, and release requirements.
