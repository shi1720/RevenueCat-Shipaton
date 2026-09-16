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

## Current evidence

- JDK executes successfully.
- Android CLI executes successfully.
- Galaxy Expo native prebuild: succeeded for `com.shivamgupta.unpause.galaxy`.
- Native Android compile: in progress.
- `adb devices`: no connected devices.
- APK installation/device behavior: not verified.
- Real Samsung purchase/restore: not verified; requires a physical Samsung device and configured store products.
- iOS native compile: not verified; full Xcode is absent.
- Apple/Google/Galaxy public store listing: not verified.

Public-store distribution remains separate from compiling a test APK: commercial seller/account verification, production signing, billing configuration, store review, and a public listing must be completed and evidenced.
