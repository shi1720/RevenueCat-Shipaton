import Constants from "expo-constants";
import { Platform } from "react-native";
import { GALAXY_BILLING_MODE } from "react-native-purchases-store-galaxy";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

export type { PurchasesPackage } from "react-native-purchases";

const androidStore = process.env.EXPO_PUBLIC_ANDROID_STORE || "google";
const apiKey =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : Platform.OS === "android"
      ? androidStore === "galaxy"
        ? process.env.EXPO_PUBLIC_REVENUECAT_GALAXY_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY;

export const billingConfigured = Boolean(apiKey?.trim());
let sdk: typeof import("react-native-purchases").default | undefined;
let initialized = false;
let identifiedUser: string | undefined;
let queue: Promise<unknown> = Promise.resolve();
let identityRevision = 0;
let requestedIdentity: string | undefined;
let identityRequested = false;

// Serialize identity changes with transactions so one account never receives
// another account's in-flight purchase result.
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.catch(() => undefined);
  return result;
}

function forCurrentIdentity<T>(operation: () => Promise<T>): Promise<T> {
  const revision = identityRevision;
  const verify = () => {
    if (revision !== identityRevision)
      throw new Error(
        "Your account changed. Refresh Studio status for the current account.",
      );
  };
  return serial(async () => {
    verify();
    const result = await operation();
    verify();
    return result;
  });
}

async function purchases() {
  if (!billingConfigured)
    throw new Error(
      "Studio purchases are not configured in this build. All free features remain available.",
    );
  if (apiKey!.trim().startsWith("test_"))
    throw new Error(
      "This build requires a real store or RevenueCat Billing app key. Use the store sandbox to test purchases.",
    );
  if (Platform.OS !== "web" && Constants.appOwnership === "expo") {
    throw new Error(
      "Real purchases require an installed Unpause development or store build. Expo Go cannot make purchases.",
    );
  }
  if (
    Platform.OS === "android" &&
    !["google", "galaxy"].includes(androidStore)
  ) {
    throw new Error(
      "Unknown Android store configuration. Use google or galaxy.",
    );
  }
  if (!sdk) sdk = (await import("react-native-purchases")).default;
  return sdk;
}

async function configure(userId?: string) {
  const client = await purchases();
  if (!initialized) {
    const base = {
      apiKey: apiKey!.trim(),
      ...(userId ? { appUserID: userId } : {}),
    };
    client.configure(
      Platform.OS === "android" && androidStore === "galaxy"
        ? {
            ...base,
            store: "GALAXY",
            galaxyBillingMode: GALAXY_BILLING_MODE.PRODUCTION,
          }
        : base,
    );
    initialized = true;
    identifiedUser = userId;
  } else if (identifiedUser !== userId) {
    if (userId) await client.logIn(userId);
    else if (!(await client.isAnonymous())) await client.logOut();
    identifiedUser = userId;
  }
  return client;
}

async function ready() {
  return initialized ? purchases() : configure();
}

function hasStudio(info: CustomerInfo): boolean {
  const entitlement = info.entitlements.active.studio;
  return Boolean(entitlement?.isActive && entitlement.expirationDate === null);
}

/** Call on startup and every auth change; omission explicitly returns to anonymous identity. */
export function initializeBilling(userId?: string): Promise<void> {
  if (!identityRequested || requestedIdentity !== userId) identityRevision++;
  identityRequested = true;
  requestedIdentity = userId;
  return serial(async () => {
    await configure(userId);
  });
}

export function getStudioStatus(): Promise<boolean> {
  return forCurrentIdentity(async () =>
    hasStudio(await (await ready()).getCustomerInfo()),
  );
}

/** Only the lifetime package is eligible for Unpause's one-time Studio purchase. */
export function getStudioPackages(): Promise<PurchasesPackage[]> {
  return forCurrentIdentity(async () => {
    const offerings = await (await ready()).getOfferings();
    return (offerings.current?.availablePackages ?? []).filter(
      (pkg) => pkg.packageType === "LIFETIME",
    );
  });
}

export function purchaseStudio(pkg: PurchasesPackage): Promise<boolean> {
  return forCurrentIdentity(async () => {
    if (pkg.packageType !== "LIFETIME")
      throw new Error("Studio requires a one-time lifetime package.");
    if (Platform.OS === "web" && !identifiedUser)
      throw new Error(
        "Sign in before purchasing Studio on web so your purchase is linked to your account.",
      );
    const { customerInfo } = await (await ready()).purchasePackage(pkg);
    if (!hasStudio(customerInfo))
      throw new Error(
        "The store returned a purchase, but Studio is not active yet. Refresh your purchase status or contact support before buying again.",
      );
    return true;
  });
}

export function restoreStudio(): Promise<boolean> {
  return forCurrentIdentity(async () => {
    if (Platform.OS === "web")
      throw new Error(
        "Web purchases are linked to your account. Sign in with the purchasing account and refresh Studio status. Restore Purchases is available in the iOS and Android apps.",
      );
    return hasStudio(await (await ready()).restorePurchases());
  });
}
