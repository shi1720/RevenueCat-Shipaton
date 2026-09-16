# Native build evidence

Last updated: September 16, 2026. This record distinguishes source compatibility, actual native compilation, device testing, signing, and store publication.

## Local build environment

The host is an Apple Silicon Mac with approximately 185 GiB free disk space at the start. Initially it had Apple Command Line Tools but no full Xcode, runnable JDK, or Android SDK.

An isolated toolchain is installed at `~/.local/share/unpause-android`. No global shell configuration or system-wide Java installation is changed. SDK licenses were accepted only for this local development installation as part of the authorized app build.

| Component | Version | Verification |
| --- | --- | --- |
| Eclipse Temurin JDK | 21.0.12.1+1, macOS aarch64 | `java -version` succeeds; archive SHA-256 verified |
| Android command-line tools | 22.0, package 15859902, macOS arm64 | `sdkmanager --version` succeeds; archive SHA-256 verified |
| Android SDK platform/build tools | 36 / 36.0.0 | Installed and listed by SDK manager |
| Android NDK | 27.1.12297006 | Installed and listed by SDK manager |
| CMake | 3.22.1 | Installed and listed by SDK manager |
| Gradle | 9.3.1 | Downloaded and launched by project wrapper |

JDK archive SHA-256: `3623232f33a9c3baadf304480b2535f9a3cba8a58d42ecbb438ba267315d9998`.
Android CLI archive SHA-256: `835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e`.

Sources: [Adoptium Temurin releases](https://adoptium.net/temurin/releases/?arch=aarch64&os=mac&version=21), [Android official command-line tools](https://developer.android.com/studio#command-tools). The JDK checksum was checked against Adoptium's release API metadata and the Android checksum against the official download page.

## Reproduce a build

Install dependencies with `npm ci`. Install a JDK 17 or newer and Android SDK tools, platform 36, build-tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1. Accept the applicable SDK licenses through `sdkmanager --licenses`.

The local script uses the isolated directories above and the Galaxy store package by default. For an existing toolchain, set `UNPAUSE_JAVA_DIR` to the Java home directory and `UNPAUSE_ANDROID_SDK` to the SDK directory. These are input overrides; the script's standard Java/Android environment exports exist only inside its process tree. To build Google Play instead, set `EXPO_PUBLIC_ANDROID_STORE=google` and regenerate Android configuration before building.

```sh
./scripts/build-android-local.sh debug
./scripts/build-android-local.sh preview
```

If the Android project is missing, the script generates it from Expo config. Native folders are generated and ignored by git. Regenerate them intentionally after changing native app configuration. The default architecture is `arm64-v8a` for modern physical Android devices. `UNPAUSE_ANDROID_ARCHS` can request another supported architecture.

`debug` builds the development variant, which expects Metro. `preview` builds bundled JavaScript using the generated release variant. Expo's generated release signing configuration uses a debug key until a production signing configuration is supplied. **A debug-signed preview must not be represented as a production-signed store submission.**

## Compiled artifacts

Both Android variants compiled successfully on September 16, 2026. The final bundled preview uses source commit `d5d803d` ([source hashes](evidence/source-snapshot.json)). All 29 recorded source/asset hashes were independently checked against the final workspace.

| Artifact | Purpose | SHA-256 |
| --- | --- | --- |
| `artifacts/builds/unpause-galaxy-preview.apk` | Offline, non-debuggable, debug-signed sideload preview | `6cddc8be9bbee102b0a33ea547084ad373e23dd444e9a340faf7d172e943bdb9` |
| `artifacts/builds/unpause-galaxy-debug.apk` | Development client; expects Metro | `0acaa89c275194ee289cd8185d9f1ea4dfdab14b0474183477f70c4558335846` |

Preview metadata: package `com.shivamgupta.unpause.galaxy`, version 1.0.0 (code 1), ARM64, minimum Android API 24, target/compile API 36. Gradle `assembleRelease` succeeded with 690 tasks; final incremental build took 27 seconds. The packaged JavaScript is bundled Hermes bytecode. No Metro server is needed.

The APK signature verifies. Its certificate is **CN=Android Debug**, SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. This is deliberately a test artifact, not a production store release. `zipalign -c -P 16` passes; this verifies APK alignment, not execution on a 16 KiB page-size device (the emulator uses 4 KiB pages).

Merged permission inspection confirms no overlay/SYSTEM_ALERT_WINDOW, microphone, location, contacts, advertising ID, exact-alarm, or audio/video library permissions. Camera/photo access is requested only when selected by the user. Core Google and Samsung billing SDK permissions coexist because the Galaxy addon is installed alongside the core RevenueCat SDK.

## Native runtime verification

Testing used an Android API 36 Google APIs ARM64 **emulator**, not a physical Samsung phone: emulator 37.1.11, system image revision 7, Pixel 7 device profile, hardware acceleration through macOS Hypervisor.Framework. The headless AVD and SDK are isolated under the local toolchain directory. Wi-Fi and mobile data were disabled; ADB reverse mappings and the Metro server were removed before bundled-preview verification.

Verified through actual UI interactions:

- Installation and cold launch of the non-debuggable bundled APK while offline.
- Sample studio, shelf, project detail, active timer, checkpoint form, and Moments navigation.
- Start a session, force-stop the process, relaunch, and return to the same running session without losing its start time.
- Enter checkpoint notes, dismiss the keyboard with Android Back, and preserve the unsaved form. This caught and verified a native-only fix.
- Save a checkpoint, force-stop, relaunch, and see the exact saved stopping point and next step in the project.
- Switch to 2560 × 1600 at density 320: the app renders its wide layout with sidebar and responsive content. This is emulator resizing, not a tested Samsung foldable claim.

## Large archive and photo durability proof

The final `6cddc8…` APK imported a **2,723,781-byte** JSON backup through the real Android document picker. The fixture contained one project, 300 checkpoints, and a valid embedded PNG shared by the cover and latest checkpoint. After confirmation, process force-stop and offline relaunch, the project, exact latest note, and photo rendered successfully.

Read-only inspection of the emulator's synthetic test database confirmed all **300 checkpoints** remained, with **11 chunks**, maximum row length **262,144 characters**, and reconstructed JSON size **2,723,633 bytes**. The embedded PNG was materialized into a 123-byte file under the app's durable `files/unpause-photos/` directory; both photo references resolve to that same file. This directly exercises the fix for Android's per-row storage limit. Emulator ADB root was used only to inspect this synthetic fixture after the UI test; the app itself has no root requirement.

Evidence: `artifacts/builds/native-evidence/stress-result.json`, `stress-relaunch-home.png`, `stress-relaunch-photo.png`, and `stress-relaunch-note.png`. The fixture's SHA-256 is `8934f4a4a34d591facc5e9d6280f5590286ba3a4ab99e3cfa7a7c6241323fed0`. The final ReactNativeJS/AndroidRuntime error log contains no errors.

## Captured submission media

All screenshots are direct native `adb screencap` output, without stretching, cropping, fabricated UI, device frames, or compositing. They show synthetic sample projects, clearly marked Sample studio.

- `artifacts/submission/store-screenshots/`: seven PNGs, exactly 1179 × 2556, density 480. Onboarding, dashboard, shelf, project, next step, session, and a filled checkpoint form.
- `artifacts/submission/galaxy-screenshots/`: six PNGs, exactly 1080 × 2160 (2:1), density 480. Dashboard, shelf, project, next step, filled checkpoint form, and Moments.
- `artifacts/builds/native-evidence/tablet-landscape.png`: 2560 × 1600 resize evidence, excluded from store screenshot sets.
- `artifacts/submission/unpause-native-walkthrough.mp4`: 76.993 seconds, H.264, 1080 × 2160, 6,855,134 bytes; actual silent Android emulator interactions. This is source footage for the narrated submission; it does not demonstrate a purchase.

Screenshots and walkthrough were captured before the final history-pagination-only patch; sample UI is unchanged. The final APK additionally limits long history rendering to ten notes per page. Test evidence and source hashes identify the exact final build independently of these sample assets.

Approximate walkthrough timing: 0–5 seconds shows the next step; 5–17 the session timer; 17–33 a checkpoint being typed; 33–40 photo options and save; 40–54 the saved Moment and history; 54–60 the dashboard; 60–77 the shelf. The footage has no audio track. Android screenrecord metadata tracks were removed by a lossless video-only remux; the pixels and playback speed were not altered.

## Remaining external release gates

Real Samsung purchase/restore requires configured RevenueCat and Samsung products plus a physical Samsung device; it was not tested in this emulator. No working purchase, account service, or public store listing is claimed without credentials and configuration. iOS project generation and Hermes export passed in the root verification run, but a native iOS binary was not compiled because full Xcode is absent.

Public-store distribution still requires owner commercial seller/account verification, a production signing identity, billing configuration, store review, and a public listing. The preview APK does not satisfy the hackathon's published-store requirement by itself.
