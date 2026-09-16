#!/usr/bin/env bash
set -euo pipefail

# Local build only. No cloud account, production signing key, or global shell edits.
# Dependencies: npm ci, a JDK >=17, Android SDK command-line tools and accepted SDK licenses.
# Override UNPAUSE_JAVA_DIR / UNPAUSE_ANDROID_SDK to use existing installations.
UNPAUSE_REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UNPAUSE_TOOL_DIR="${UNPAUSE_TOOL_DIR:-$HOME/.local/share/unpause-android}"
UNPAUSE_JAVA_DIR="${UNPAUSE_JAVA_DIR:-$UNPAUSE_TOOL_DIR/jdk/Contents/Home}"
UNPAUSE_ANDROID_SDK="${UNPAUSE_ANDROID_SDK:-$UNPAUSE_TOOL_DIR/sdk}"
UNPAUSE_VARIANT="${1:-debug}"

if [[ ! -x "$UNPAUSE_JAVA_DIR/bin/java" ]]; then
  echo "JDK unavailable. Set UNPAUSE_JAVA_DIR to a JDK 17+ installation directory." >&2
  exit 1
fi
if [[ ! -d "$UNPAUSE_ANDROID_SDK" ]]; then
  echo "Android SDK unavailable. Set UNPAUSE_ANDROID_SDK to its directory." >&2
  exit 1
fi
case "$UNPAUSE_VARIANT" in
  debug) UNPAUSE_GRADLE_TASK=":app:assembleDebug" ;;
  preview) UNPAUSE_GRADLE_TASK=":app:assembleRelease" ;;
  *) echo "Usage: scripts/build-android-local.sh [debug|preview]" >&2; exit 1 ;;
esac

# These exports exist only in this script's process tree.
export JAVA_HOME="$UNPAUSE_JAVA_DIR"
export ANDROID_HOME="$UNPAUSE_ANDROID_SDK"
export ANDROID_SDK_ROOT="$UNPAUSE_ANDROID_SDK"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
export GRADLE_USER_HOME="$UNPAUSE_TOOL_DIR/gradle"
export EXPO_PUBLIC_ANDROID_STORE="${EXPO_PUBLIC_ANDROID_STORE:-galaxy}"
cd "$UNPAUSE_REPO_DIR"

if [[ ! -f android/gradlew ]]; then
  CI=1 npx expo prebuild --platform android --no-install
fi

UNPAUSE_EXPECTED_PACKAGE="$(npx expo config --json | node -e 'let text="";process.stdin.on("data",chunk=>text+=chunk);process.stdin.on("end",()=>process.stdout.write(JSON.parse(text).android.package));')"
if ! grep -Fq "applicationId '$UNPAUSE_EXPECTED_PACKAGE'" android/app/build.gradle; then
  echo "Native package differs from current Expo config. Regenerate with: EXPO_PUBLIC_ANDROID_STORE=$EXPO_PUBLIC_ANDROID_STORE npx expo prebuild --platform android --no-install" >&2
  exit 1
fi

# arm64-v8a targets modern physical Android phones. Override for other test hardware.
cd android
./gradlew "$UNPAUSE_GRADLE_TASK" \
  "-PreactNativeArchitectures=${UNPAUSE_ANDROID_ARCHS:-arm64-v8a}" \
  --no-daemon --max-workers=4

if [[ "$UNPAUSE_VARIANT" == preview ]]; then
  UNPAUSE_APK_SOURCE="app/build/outputs/apk/release/app-release.apk"
else
  UNPAUSE_APK_SOURCE="app/build/outputs/apk/debug/app-debug.apk"
fi
mkdir -p "$UNPAUSE_REPO_DIR/artifacts/builds"
UNPAUSE_APK_DEST="$UNPAUSE_REPO_DIR/artifacts/builds/unpause-$EXPO_PUBLIC_ANDROID_STORE-$UNPAUSE_VARIANT.apk"
cp "$UNPAUSE_APK_SOURCE" "$UNPAUSE_APK_DEST"
echo "APK preserved outside generated native folders: $UNPAUSE_APK_DEST"
shasum -a 256 "$UNPAUSE_APK_DEST"

if [[ "$UNPAUSE_VARIANT" == preview ]]; then
  echo "Generated Expo release configuration uses a DEBUG signing key. This is a sideload test build, not a store release."
else
  echo "The debug variant expects a Metro development server. Use preview for bundled JavaScript."
fi
