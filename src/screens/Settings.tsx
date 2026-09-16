import React, { useEffect, useRef, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { useFormSafety, type ReportFormSafety } from "../hooks/useFormSafety";
import {
  ArrowRight,
  Check,
  Download,
  Heart,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react-native";
import { c, common, font } from "../components/theme";
import { Button, Chip, Field } from "../components/ui";
import { useApp } from "../store";
import {
  exportBackup,
  importBackup,
  clearUnusedPhotos,
  discardImportedPhotos,
} from "../services/media";
import { cancelReminder } from "../services/reminders";
import { blankData } from "../domain/projects";
import {
  authConfigured,
  authProvider,
  deleteAccount,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updatePassword,
  type Session,
} from "../services/auth";
import {
  billingConfigured,
  billingSandbox,
  getStudioPackages,
  purchaseStudio,
  restoreStudio,
  type PurchasesPackage,
} from "../services/billing";
import type { Notice } from "./Project";
const publicLinks = {
  privacy:
    process.env.EXPO_PUBLIC_PRIVACY_URL ||
    "https://unpause-studio.web.app/privacy",
  terms:
    process.env.EXPO_PUBLIC_TERMS_URL || "https://unpause-studio.web.app/terms",
  support:
    process.env.EXPO_PUBLIC_SUPPORT_URL ||
    "https://unpause-studio.web.app/support",
};
export function Settings({
  notify,
  account,
  session,
  studio,
  paywall,
  confirm,
  legal,
}: {
  notify: Notice;
  account: () => void;
  session: Session | null;
  studio: boolean;
  paywall: () => void;
  confirm: (
    title: string,
    text: string,
    action: () => Promise<void>,
    cancel?: () => Promise<void>,
  ) => void;
  legal: (type: "privacy" | "terms") => void;
}) {
  const { data, update, snapshot } = useApp();
  const [name, setName] = useState(data.displayName);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 25 }}>
      <Text style={common.label}>A SPACE THAT FEELS LIKE YOU</Text>
      <Text accessibilityRole="header" style={common.title}>
        Your corner.
      </Text>
      <View style={[common.card, { gap: 18 }]}>
        <Text style={{ fontFamily: font.serif, fontSize: 24, color: c.ink }}>
          A little introduction
        </Text>
        <Field
          label="What should we call you?"
          placeholder="Your first name"
          value={name}
          onChangeText={setName}
          maxLength={60}
        />
        <Button
          title="Save name"
          onPress={() =>
            run(async () => {
              await update((d) => ({ ...d, displayName: name.trim() }));
              notify("Good to have you here.");
            })
          }
          kind="secondary"
          busy={busy}
        />
      </View>
      <View style={[common.card, { gap: 17 }]}>
        <View style={common.row}>
          <ShieldCheck size={22} color={c.green} />
          <Text style={{ fontFamily: font.serif, fontSize: 24, color: c.ink }}>
            Your projects, your device.
          </Text>
        </View>
        <Text style={common.body}>
          Your photos and project notes stay on this device. An account connects
          your Studio purchase; it does not upload or sync your projects.
        </Text>
        <Text style={common.muted}>
          {session
            ? `Signed in as ${session.user.email}`
            : "You’re using your local studio. No account needed to make a little progress."}
        </Text>
        <Button
          title={session ? "Sign out" : "Sign in or create an account"}
          icon={session ? LogOut : LogIn}
          kind="secondary"
          onPress={() => (session ? run(() => signOut()) : account())}
          busy={busy}
        />
        {session && (
          <Button
            title="Delete my account"
            kind="danger"
            onPress={() =>
              confirm(
                "Delete your account?",
                "This permanently removes your login and linked customer profile. Local projects stay on this device. Export a backup first. Store purchases and receipts remain with the store.",
                async () => {
                  await deleteAccount();
                  notify(
                    "Your account was deleted. Your local projects are still here.",
                  );
                },
              )
            }
          />
        )}
      </View>
      <View style={[common.card, { backgroundColor: c.lilac, gap: 15 }]}>
        <View style={common.row}>
          <Sparkles size={21} color={c.purple} />
          <Text style={{ fontFamily: font.serif, fontSize: 26, color: c.ink }}>
            Room for every idea.
          </Text>
        </View>
        <Text style={common.body}>
          {studio
            ? "Studio is yours. Make room for as many open projects as you like."
            : "Three open projects are free. Studio makes room for all your ideas with one lifetime purchase."}
        </Text>
        <Button
          title={studio ? "Your Studio membership" : "Explore Studio"}
          onPress={paywall}
          icon={ArrowRight}
        />
      </View>
      <View style={[common.card, { gap: 17 }]}>
        <Text style={{ fontFamily: font.serif, fontSize: 24, color: c.ink }}>
          Keep a copy. Keep it yours.
        </Text>
        <Text style={common.muted}>
          Export your projects, photos, and history as a backup. Keep it
          somewhere safe before changing phones or clearing app data.
        </Text>
        <Button
          title="Export a backup"
          icon={Download}
          kind="secondary"
          busy={busy}
          onPress={() =>
            run(async () => {
              await exportBackup(data);
              notify("Your backup is ready to save.");
            })
          }
        />
        <Button
          title="Import a backup"
          icon={Upload}
          kind="secondary"
          busy={busy}
          onPress={() =>
            run(async () => {
              const imported = await importBackup();
              if (!imported) return;
              confirm(
                "Replace this device’s studio?",
                `The backup contains ${imported.projects.length} projects. This replaces your current projects. Reminders and running sessions are not restored. Export your current studio first if needed.`,
                async () => {
                  await update(() => imported);
                  await clearUnusedPhotos(snapshot().projects).catch((e) =>
                    notify(e.message),
                  );
                  for (const p of data.projects)
                    if (p.reminderId) await cancelReminder(p.reminderId);
                  notify("Your projects are back where they belong.");
                },
                () => discardImportedPhotos(imported, snapshot().projects),
              );
            })
          }
        />
        <Text style={[common.muted, { fontSize: 11 }]}>
          Backups contain private notes and photos. Share them only with people
          you trust.
        </Text>
      </View>
      <View style={{ gap: 9 }}>
        <Button
          title={
            data.projects.some((p) => p.isSample)
              ? "Clear sample studio & start fresh"
              : "Erase local projects"
          }
          kind="danger"
          onPress={() =>
            confirm(
              "Start with an empty shelf?",
              "This removes all project notes and photos from this device. Export a backup first. Your account and store purchase are separate.",
              async () => {
                await update((d) => ({
                  ...blankData(),
                  hasOnboarded: true,
                  displayName: d.displayName,
                }));
                await clearUnusedPhotos(snapshot().projects).catch((e) =>
                  notify(e.message),
                );
                for (const p of data.projects)
                  if (p.reminderId) await cancelReminder(p.reminderId);
                notify("A fresh page. Ready for your next idea.");
              },
            )
          }
        />
        <View style={[common.row, { justifyContent: "center" }]}>
          <Button
            title="Privacy"
            kind="ghost"
            onPress={() => legal("privacy")}
          />
          <Button title="Terms" kind="ghost" onPress={() => legal("terms")} />
          <Button
            title="Support"
            kind="ghost"
            onPress={() => run(() => Linking.openURL(publicLinks.support))}
          />
        </View>
        <View style={{ alignItems: "center", gap: 7, paddingVertical: 15 }}>
          <Heart size={16} color={c.coral} />
          <Text style={[common.muted, { fontSize: 12 }]}>
            Created by Shivam Gupta. Made for the joy of making.
          </Text>
          <Text style={[common.muted, { fontSize: 10 }]}>
            Unpause · 1.0.0 ·{" "}
            {Platform.OS === "web" ? "Web companion" : "Mobile studio"}
          </Text>
        </View>
      </View>
    </View>
  );
}
export function AccountForm({
  done,
  recovery = false,
  onSafetyChange,
}: {
  done: () => void;
  recovery?: boolean;
  onSafetyChange?: ReportFormSafety;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">(
    recovery ? "reset" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const operation = useRef(false);
  useFormSafety(false, busy, onSafetyChange);
  const submit = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (recovery) {
        await updatePassword(password);
        setMessage(
          "Your password has been updated. You can close this window.",
        );
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage(
          authProvider === "firebase"
            ? "If an account exists for this email, a reset link is on its way. Set your new password on the linked page, then return here to sign in."
            : "If an account exists for this email, a reset link is on its way. Open it on this device.",
        );
      } else if (mode === "signup") {
        const result = await signUp(email, password);
        if (result.session) done();
        else
          setMessage(
            "Check your email to confirm your account. Open the link on this device, then sign in.",
          );
      } else {
        await signIn(email, password);
        done();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete that request.",
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <Text style={common.muted}>
        An account keeps your Studio purchase connected. Your projects stay
        local; use backups to move them between devices.
      </Text>
      {!authConfigured && (
        <View
          style={{ backgroundColor: "#FFF1D9", padding: 17, borderRadius: 13 }}
        >
          <Text style={common.body}>
            Accounts aren’t connected in this build yet. You can use every free
            project feature without an account.
          </Text>
        </View>
      )}
      {!recovery && (
        <View style={common.row}>
          <Chip
            label="Sign in"
            selected={mode === "login"}
            onPress={() => setMode("login")}
          />
          <Chip
            label="Create account"
            selected={mode === "signup"}
            onPress={() => setMode("signup")}
          />
        </View>
      )}
      {!recovery && (
        <Field
          editable={!busy}
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      )}
      {(recovery || mode !== "reset") && (
        <Field
          editable={!busy}
          label={recovery ? "New password" : "Password"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={
            mode === "signup" || recovery ? "new-password" : "current-password"
          }
          hint={mode === "signup" || recovery ? "At least 10 characters." : ""}
        />
      )}
      <Button
        title={
          recovery
            ? "Save new password"
            : mode === "signup"
              ? "Create my account"
              : mode === "reset"
                ? "Send reset link"
                : "Sign in"
        }
        disabled={!authConfigured}
        busy={busy}
        onPress={submit}
      />
      {!recovery && (
        <Button
          title={mode === "reset" ? "Back to sign in" : "Forgot password?"}
          kind="ghost"
          onPress={() => setMode(mode === "reset" ? "login" : "reset")}
        />
      )}{" "}
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ fontFamily: font.medium, color: "#A64343", lineHeight: 22 }}
        >
          {error}
        </Text>
      )}
      {message && (
        <Text
          accessibilityRole="alert"
          style={{ fontFamily: font.medium, color: c.green, lineHeight: 22 }}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
export function Paywall({
  studio,
  refresh,
  legal,
  account,
  signedIn,
  onSafetyChange,
}: {
  studio: boolean;
  refresh: () => Promise<void>;
  legal: (type: "privacy" | "terms") => void;
  account: () => void;
  signedIn: boolean;
  onSafetyChange?: ReportFormSafety;
}) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(billingConfigured);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const operation = useRef(false);
  useFormSafety(false, busy, onSafetyChange);
  useEffect(() => {
    let live = true;
    if (billingConfigured)
      getStudioPackages()
        .then((p) => {
          if (live) setPackages(p);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    return () => {
      live = false;
    };
  }, []);
  const buy = async (restore = false) => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      const active = restore
        ? await restoreStudio()
        : await purchaseStudio(packages[0]);
      await refresh();
      setMessage(
        active
          ? billingSandbox
            ? "Test purchase verified by RevenueCat. Sandbox Studio is active."
            : "Studio is yours. Make something wonderful."
          : "No lifetime Studio purchase was found for this store account.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The purchase could not be completed.",
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 23 }}>
      {billingSandbox && (
        <View
          style={{
            padding: 18,
            backgroundColor: c.lilac,
            borderRadius: 14,
            gap: 7,
          }}
        >
          <Text style={[common.body, { color: c.purple }]}>
            RevenueCat Test Store
          </Text>
          <Text style={common.muted}>
            Internal sandbox only. Purchases here test the RevenueCat
            integration and do not charge money or grant a real store purchase.
          </Text>
        </View>
      )}
      <View
        style={{
          backgroundColor: c.purpleDark,
          borderRadius: 20,
          padding: 26,
          gap: 13,
        }}
      >
        <Sparkles size={29} color="#D6CDED" />
        <Text
          style={{
            fontFamily: font.serif,
            fontSize: 37,
            lineHeight: 44,
            color: "#fff",
          }}
        >
          Room for all{"\n"}your unfinished ideas.
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 14,
            lineHeight: 23,
            color: "#D4D0E4",
          }}
        >
          A bigger shelf. The same gentle pace.
        </Text>
      </View>
      {[
        "Unlimited open projects",
        "Every checkpoint, photo, and memory",
        "One purchase. No subscription.",
      ].map((label) => (
        <View key={label} style={common.row}>
          <Check size={17} color={c.green} />
          <Text style={common.body}>{label}</Text>
        </View>
      ))}
      <Text style={common.muted}>
        The free studio includes 3 open projects, unlimited finished projects,
        reminders, and backups. Those are yours whether or not you upgrade.
      </Text>
      {studio ? (
        <View
          style={{
            padding: 20,
            backgroundColor: c.greenLight,
            borderRadius: 14,
          }}
        >
          <Text style={[common.body, { color: c.green }]}>
            {billingSandbox
              ? "Sandbox Studio is active through a verified RevenueCat test purchase."
              : "You have lifetime Studio access. Thank you for supporting Unpause."}
          </Text>
        </View>
      ) : billingConfigured && packages.length ? (
        <>
          <Text style={{ fontFamily: font.serif, fontSize: 34, color: c.ink }}>
            {packages[0].product.priceString}
            <Text style={common.muted}>
              {billingSandbox
                ? " / test price, no charge"
                : " / once, yours for life"}
            </Text>
          </Text>
          {Platform.OS === "web" && !signedIn ? (
            <Button
              title="Sign in to connect your purchase"
              onPress={account}
            />
          ) : (
            <Button
              title={
                billingSandbox
                  ? "Test Studio purchase"
                  : "Make room with Studio"
              }
              busy={busy}
              onPress={() => buy()}
            />
          )}
        </>
      ) : (
        <View
          style={{
            padding: 18,
            backgroundColor: c.lilac,
            borderRadius: 14,
            gap: 7,
          }}
        >
          <Text style={[common.body, { color: c.purple }]}>
            {loading
              ? "Checking the store…"
              : "Studio purchases are not available in this build."}
          </Text>
          <Text style={common.muted}>
            Your free studio works now. Pricing and checkout will appear here
            when the store connection is ready.
          </Text>
        </View>
      )}
      <Button
        title="Restore purchases"
        kind="secondary"
        disabled={!billingConfigured}
        busy={busy}
        onPress={() => buy(true)}
      />
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#A64343", fontFamily: font.medium, lineHeight: 22 }}
        >
          {error}
        </Text>
      )}
      {message && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.green, fontFamily: font.medium, lineHeight: 22 }}
        >
          {message}
        </Text>
      )}
      <Text style={[common.muted, { fontSize: 11 }]}>
        {billingSandbox
          ? "No payment is collected in this internal Test Store build. Test entitlements can be reset and do not establish ownership in a real app store."
          : "Payment is charged by your store at confirmation. Studio is a non-consumable lifetime unlock."}{" "}
        Device storage limits apply. Your notes remain readable if purchase
        verification is temporarily unavailable.
      </Text>
      <View style={common.row}>
        <Button title="Privacy" kind="ghost" onPress={() => legal("privacy")} />
        <Button title="Terms" kind="ghost" onPress={() => legal("terms")} />
      </View>
    </View>
  );
}
export function Legal({ type }: { type: "privacy" | "terms" }) {
  const [linkError, setLinkError] = useState("");
  const paragraphs =
    type === "privacy"
      ? [
          [
            "Your creative life stays yours.",
            "Unpause stores project names, notes, images, session history, and your display name on your device. We do not upload project content or use it to train AI models. Uninstalling the app or clearing browser storage can remove it. Export backups regularly.",
          ],
          [
            "Accounts and purchases",
            "If you create an account, our authentication provider (Firebase, or Supabase in earlier configured builds) processes your email and account credentials. RevenueCat and your chosen app store process customer identifiers, receipts, and purchase status. Unpause does not receive payment-card details. Signing in does not sync projects.",
          ],
          [
            "Photos and reminders",
            "Photo-library access is requested only when you choose a photo. Notifications are requested only when you set a reminder. Reminder titles may appear on your lock screen. These permissions are optional.",
          ],
          [
            "Your controls",
            "Export and import your local data in Your corner. Erase local projects there, and delete a connected account there separately. Store purchase records are governed by the store. No advertising or third-party behavioral analytics are included.",
          ],
          [
            "Support",
            "Created and operated by Shivam Gupta. Visit our support page for account, purchase, and data questions. This policy describes the current app implementation. Last updated September 16, 2026.",
          ],
        ]
      : [
          [
            "A place to keep making",
            "Unpause is a personal project memory tool. You retain ownership of your project content. Keep your own backups; local storage can be lost through device failure, uninstalling, or browser cleanup.",
          ],
          [
            "Free and Studio",
            "Free access allows three open projects and unlimited finished projects, within device and backup-format limits. Studio unlocks the open-project plan limit through a single lifetime purchase. Store pricing is shown before confirmation. There is no recurring subscription in this version.",
          ],
          [
            "Purchases and refunds",
            "Purchases and refunds are handled by your chosen store and its applicable terms. Restore purchases using the same store account. Connecting a user account permits RevenueCat to associate your entitlement across supported platforms.",
          ],
          [
            "Using the app",
            "Use Unpause for lawful personal content. The app is not a safety system, professional instruction service, or medical tool. Project instructions come from you. Check the suitability of tools and materials before using them.",
          ],
          [
            "Availability",
            "Local features do not require a service subscription. Network features depend on their providers. No perpetual cloud storage is included. Statutory consumer rights are not excluded. Creator: Shivam Gupta. Last updated September 16, 2026.",
          ],
        ];
  return (
    <View style={{ gap: 25 }}>
      {paragraphs.map(([title, body]) => (
        <View key={title} style={{ gap: 9 }}>
          <Text style={{ fontFamily: font.serif, fontSize: 23, color: c.ink }}>
            {title}
          </Text>
          <Text style={common.body}>{body}</Text>
        </View>
      ))}
      <Button
        title={
          type === "privacy" ? "Open full privacy policy" : "Open full terms"
        }
        kind="secondary"
        onPress={() => {
          void Linking.openURL(publicLinks[type]).catch(() =>
            setLinkError(
              "The page could not be opened. Check your connection and try again.",
            ),
          );
        }}
      />
      <Button
        title="Contact support"
        kind="ghost"
        onPress={() => {
          void Linking.openURL(publicLinks.support).catch(() =>
            setLinkError(
              "The support page could not be opened. Check your connection and try again.",
            ),
          );
        }}
      />
      {!!linkError && (
        <Text accessibilityRole="alert" style={{ color: "#A64343" }}>
          {linkError}
        </Text>
      )}
    </View>
  );
}
