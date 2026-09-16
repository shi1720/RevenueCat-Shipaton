import type { ExpoConfig } from "expo/config";

const store = process.env.EXPO_PUBLIC_ANDROID_STORE || "google";
if (!["google", "galaxy"].includes(store))
  throw new Error("EXPO_PUBLIC_ANDROID_STORE must be google or galaxy.");

const testStore = process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE === "true";
const buildProfile = process.env.EAS_BUILD_PROFILE || "";
const internalBuild = buildProfile
  ? /^(development|preview)(-|$)/.test(buildProfile)
  : process.env.UNPAUSE_BUILD_DISTRIBUTION === "internal";
if (testStore && !internalBuild)
  throw new Error(
    "RevenueCat Test Store is restricted to internal preview/development builds. For a local preview, explicitly set UNPAUSE_BUILD_DISTRIBUTION=internal.",
  );

const config: ExpoConfig = {
  name: testStore ? "Unpause Sandbox" : "Unpause",
  slug: "unpause",
  description: "Save your place in the things you love making.",
  version: "1.0.0",
  scheme: testStore ? "unpause-sandbox" : "unpause",
  orientation: "default",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  backgroundColor: "#F8F7F3",
  platforms: ["ios", "android", "web"],
  ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
  ios: {
    bundleIdentifier: testStore
      ? "com.shivamgupta.unpause.sandbox"
      : "com.shivamgupta.unpause",
    supportsTablet: true,
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        "Take a photo of your project so you can remember exactly where to pick it up.",
      NSPhotoLibraryUsageDescription:
        "Choose a project photo to save with your next step. Photos stay on this device.",
    },
    privacyManifests: { NSPrivacyTracking: false },
  },
  android: {
    package: testStore
      ? "com.shivamgupta.unpause.sandbox"
      : store === "galaxy"
        ? "com.shivamgupta.unpause.galaxy"
        : "com.shivamgupta.unpause",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#5753A3",
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.POST_NOTIFICATIONS",
    ],
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_AUDIO",
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_EXACT_ALARM",
      "com.google.android.gms.permission.AD_ID",
    ],
    predictiveBackGestureEnabled: true,
  },
  web: {
    favicon: "./assets/icon.png",
    bundler: "metro",
    name: "Unpause",
    shortName: "Unpause",
    backgroundColor: "#F8F7F3",
    themeColor: "#5753A3",
  },
  plugins: [
    "expo-font",
    ["expo-secure-store", { configureAndroidBackup: true }],
    "expo-sharing",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Choose a project photo to save with your next step. Photos stay on this device.",
        cameraPermission:
          "Take a photo of your project so you can remember exactly where to pick it up.",
        microphonePermission: false,
      },
    ],
    [
      "expo-notifications",
      {
        color: "#5753A3",
        defaultChannel: "project-reminders",
        enableBackgroundRemoteNotifications: false,
      },
    ],
    "./plugins/withUnpauseAndroid.js",
  ],
  extra: {
    androidStore: store,
    revenueCatTestStore: testStore,
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : {}),
  },
};

export default config;
