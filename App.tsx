import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { Fraunces_500Medium_Italic } from "@expo-google-fonts/fraunces/500Medium_Italic";
import * as Linking from "expo-linking";
import {
  ArrowRight,
  BookOpen,
  Check,
  Home as HomeIcon,
  Layers,
  Leaf,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  X,
} from "lucide-react-native";
import { AppProvider, useApp } from "./src/store";
import { c, common, font } from "./src/components/theme";
import { Button } from "./src/components/ui";
import { Mark, ProjectArt } from "./src/components/ProjectArt";
import { Home, Moments, Shelf } from "./src/screens/Home";
import {
  CheckpointForm,
  ProjectDetail,
  ProjectForm,
} from "./src/screens/Project";
import { AccountForm, Legal, Paywall, Settings } from "./src/screens/Settings";
import { Recovery } from "./src/screens/Recovery";
import { sampleData } from "./src/domain/samples";
import { canCreateProject } from "./src/domain/projects";
import {
  authConfigured,
  getSession,
  handleAuthUrl,
  subscribeAuth,
  type Session,
} from "./src/services/auth";
import {
  billingConfigured,
  getStudioStatus,
  initializeBilling,
} from "./src/services/billing";

type Tab = "home" | "shelf" | "moments" | "settings";
type Sheet =
  | "new"
  | "edit"
  | "checkpoint"
  | "account"
  | "recovery"
  | "studio"
  | "privacy"
  | "terms"
  | null;
const tabs = [
  { id: "home", label: "Your day", icon: HomeIcon },
  { id: "shelf", label: "Project shelf", icon: Layers },
  { id: "moments", label: "Little moments", icon: BookOpen },
  { id: "settings", label: "Your corner", icon: SettingsIcon },
] as const;
export default function App() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loaded || error ? (
        <AppProvider>
          <Workspace />
        </AppProvider>
      ) : (
        <View style={s.loading}>
          <ActivityIndicator color={c.purple} />
          <Text style={{ color: c.muted, marginTop: 15 }}>
            Making a little room…
          </Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}
function Workspace() {
  const { data, loading, loadError, reload, update, snapshot } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const [tab, setTab] = useState<Tab>("home");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [studio, setStudio] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    text: string;
    action: () => Promise<void>;
    cancel?: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const content = useRef<ScrollView>(null);
  const initialNotificationRead = useRef(false);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 8500);
  }, []);
  const refreshStudio = useCallback(async () => {
    if (!billingConfigured) {
      setStudio(false);
      return;
    }
    setStudio(await getStudioStatus());
  }, []);
  useEffect(() => {
    let live = true;
    let identityRevision = 0;
    const sync = (next: Session | null) => {
      const revision = ++identityRevision;
      if (!live) return;
      setSession(next);
      setStudio(false);
      if (billingConfigured)
        void initializeBilling(next?.user.id)
          .then(getStudioStatus)
          .then((active) => {
            if (live && revision === identityRevision) setStudio(active);
          })
          .catch(() => {});
    };
    if (authConfigured) {
      getSession()
        .then(sync)
        .catch((e) => notify(e.message));
      const unsubscribe = subscribeAuth((next, event) => {
        sync(next);
        if (event === "PASSWORD_RECOVERY") setSheet("recovery");
      });
      return () => {
        live = false;
        unsubscribe();
      };
    }
    sync(null);
    return () => {
      live = false;
    };
  }, [notify]);
  useEffect(() => {
    if (!authConfigured) return;
    const process = (url: string) => {
      void handleAuthUrl(url)
        .then((result) => {
          if (result.recovery) setSheet("recovery");
          else if (result.handled) {
            setSheet(null);
            notify("Your account is connected.");
          }
        })
        .catch((e) => notify(e.message));
    };
    Linking.getInitialURL().then((url) => {
      if (url) process(url);
    });
    const listener = Linking.addEventListener("url", (event) =>
      process(event.url),
    );
    return () => listener.remove();
  }, [notify]);
  useEffect(() => {
    if (Platform.OS === "web" || loading) return;
    let live = true;
    let remove: (() => void) | undefined;
    void import("expo-notifications")
      .then(async (Notifications) => {
        const openReminder = (
          response: import("expo-notifications").NotificationResponse | null,
        ) => {
          const id = response?.notification.request.content.data?.projectId;
          if (
            live &&
            typeof id === "string" &&
            data.projects.some((p) => p.id === id)
          ) {
            setProjectId(id);
            setSheet(null);
          }
        };
        const listener =
          Notifications.addNotificationResponseReceivedListener(openReminder);
        remove = () => listener.remove();
        if (!live) {
          remove();
          return;
        }
        if (!initialNotificationRead.current) {
          initialNotificationRead.current = true;
          openReminder(await Notifications.getLastNotificationResponseAsync());
          await Notifications.clearLastNotificationResponseAsync();
        }
      })
      .catch(() => {
        /* Notifications are optional; reading one never blocks local projects. */
      });
    return () => {
      live = false;
      remove?.();
    };
  }, [loading, data.projects]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (confirmation) {
        if (confirmBusy) return true;
        void confirmation.cancel?.().catch((e) => notify(e.message));
        setConfirmation(null);
        return true;
      }
      if (sheet) {
        setSheet(null);
        return true;
      }
      if (projectId) {
        setProjectId(null);
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [confirmation, sheet, projectId, tab]);
  useEffect(() => {
    content.current?.scrollTo({ y: 0, animated: false });
  }, [tab, projectId]);
  const open = (id: string) => {
    setProjectId(id);
    setSheet(null);
  };
  const navigate = (next: Tab) => {
    setTab(next);
    setProjectId(null);
  };
  const create = () => {
    if (
      !canCreateProject(data.projects, studio) &&
      data.projects.some((p) => p.isSample)
    ) {
      confirm(
        "Make this studio yours?",
        "Remove the illustrative sample projects and start with your own idea. Any real projects you have added will stay.",
        async () => {
          await update((d) => ({
            ...d,
            projects: d.projects.filter((p) => !p.isSample),
            activeSession: d.projects.some(
              (p) => p.isSample && p.id === d.activeSession?.projectId,
            )
              ? null
              : d.activeSession,
          }));
          setSheet(
            canCreateProject(snapshot().projects, studio) ? "new" : "studio",
          );
        },
      );
    } else setSheet(canCreateProject(data.projects, studio) ? "new" : "studio");
  };
  const confirm = (
    title: string,
    text: string,
    action: () => Promise<void>,
    cancel?: () => Promise<void>,
  ) => setConfirmation({ title, text, action, cancel });
  const cancelConfirmation = () => {
    if (confirmBusy) return;
    void confirmation?.cancel?.().catch((e) => notify(e.message));
    setConfirmation(null);
  };
  const project = data.projects.find((p) => p.id === projectId);
  if (loading)
    return (
      <View style={s.loading}>
        <Mark />
        <ActivityIndicator style={{ marginTop: 20 }} color={c.purple} />
      </View>
    );
  if (loadError) return <Recovery error={loadError} retry={reload} />;
  if (!data.hasOnboarded)
    return (
      <Welcome
        start={async (sample) => {
          try {
            await update(() =>
              sample ? sampleData() : { ...data, hasOnboarded: true },
            );
          } catch (e) {
            notify(
              e instanceof Error ? e.message : "Could not start your studio.",
            );
          }
        }}
        error={toast}
      />
    );
  const titles: Record<Exclude<Sheet, null>, string> = {
    new: "Give an idea a home.",
    edit: "A little adjustment.",
    checkpoint: "Save your place.",
    account: "Welcome to your corner.",
    recovery: "A fresh password.",
    studio: "Unpause Studio",
    privacy: "Your privacy.",
    terms: "The simple terms.",
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        {wide && (
          <View style={s.sidebar}>
            <View style={[common.row, { paddingHorizontal: 9, gap: 11 }]}>
              <Mark />
              <Text style={s.wordmark}>
                unpause<Text style={{ color: c.purple }}>.</Text>
              </Text>
            </View>
            <Text
              style={[
                common.label,
                {
                  fontSize: 8,
                  paddingLeft: 11,
                  marginTop: 13,
                  letterSpacing: 2,
                },
              ]}
            >
              PICK UP WHERE YOU LEFT OFF
            </Text>
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Studio navigation"
              style={{ gap: 8, marginTop: 51 }}
            >
              {tabs.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === t.id && !projectId }}
                  accessibilityLabel={t.label}
                  onPress={() => navigate(t.id)}
                  style={[s.navItem, tab === t.id && !projectId && s.navActive]}
                >
                  <t.icon
                    size={18}
                    color={tab === t.id && !projectId ? c.purple : c.muted}
                  />
                  <Text
                    style={[
                      s.navLabel,
                      tab === t.id &&
                        !projectId && {
                          color: c.purple,
                          fontFamily: font.bold,
                        },
                    ]}
                  >
                    {t.label}
                  </Text>
                  {t.id === "shelf" && (
                    <Text style={s.count}>
                      {
                        data.projects.filter((p) => p.status !== "finished")
                          .length
                      }
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={{ paddingHorizontal: 7, marginTop: 30 }}>
              <Button title="New project" onPress={create} icon={Plus} />
            </View>
            <View style={{ flex: 1 }} />
            <View style={s.studioPromo}>
              <View style={common.row}>
                <Sparkles size={17} color={c.purple} />
                <Text
                  style={{
                    fontFamily: font.bold,
                    fontSize: 12,
                    color: c.purple,
                  }}
                >
                  {studio ? "Your Studio" : "A little more room"}
                </Text>
              </View>
              <Text style={[common.muted, { fontSize: 11, lineHeight: 18 }]}>
                {studio
                  ? "Every idea has a place."
                  : "For the wonderfully many things you want to make."}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Explore Studio"
                onPress={() => setSheet("studio")}
              >
                <Text
                  style={{
                    fontFamily: font.bold,
                    color: c.purple,
                    fontSize: 11,
                  }}
                >
                  {studio ? "View membership →" : "Meet Unpause Studio →"}
                </Text>
              </Pressable>
            </View>
            <View style={[common.row, { padding: 14, marginTop: 20 }]}>
              <View style={s.avatar}>
                <Text style={{ color: c.purple, fontFamily: font.bold }}>
                  {data.displayName ? data.displayName[0].toUpperCase() : "U"}
                </Text>
              </View>
              <View>
                <Text
                  style={{ fontFamily: font.bold, fontSize: 12, color: c.ink }}
                >
                  {data.displayName || "Your little studio"}
                </Text>
                <Text style={[common.muted, { fontSize: 10 }]}>
                  {studio ? "Studio member" : "Free · made for you"}
                </Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[s.topbar, { paddingHorizontal: wide ? 40 : 22 }]}>
            {wide ? (
              <View style={common.row}>
                <Text
                  style={{
                    fontFamily: font.medium,
                    fontSize: 11,
                    color: c.muted,
                  }}
                >
                  YOUR STUDIO
                </Text>
                <Text style={{ color: "#C7C3D2" }}> / </Text>
                <Text
                  style={{
                    fontFamily: font.medium,
                    fontSize: 11,
                    color: c.ink,
                  }}
                >
                  {project
                    ? "Project memory"
                    : tabs.find((t) => t.id === tab)?.label}
                </Text>
              </View>
            ) : (
              <View style={common.row}>
                <Mark size={29} />
                <Text style={[s.wordmark, { fontSize: 25 }]}>unpause.</Text>
              </View>
            )}
            <View style={common.row}>
              {data.projects.some((p) => p.isSample) && (
                <View style={s.sampleBadge}>
                  <Text
                    style={{
                      fontFamily: font.medium,
                      color: c.purple,
                      fontSize: 10,
                    }}
                  >
                    Sample studio
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New project"
                onPress={create}
                style={s.addButton}
              >
                <Plus size={20} color={c.purple} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            ref={content}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: wide ? 40 : 22,
              paddingTop: wide ? 33 : 24,
              paddingBottom: 40,
              alignItems: "center",
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ width: "100%", maxWidth: 1100 }}>
              {project ? (
                <ProjectDetail
                  id={project.id}
                  back={() => {
                    setProjectId(null);
                    setTab("shelf");
                  }}
                  checkpoint={() => setSheet("checkpoint")}
                  edit={() => setSheet("edit")}
                  notify={notify}
                  confirm={confirm}
                  studio={studio}
                  paywall={() => setSheet("studio")}
                />
              ) : tab === "home" ? (
                <Home
                  open={open}
                  create={create}
                  shelf={() => navigate("shelf")}
                />
              ) : tab === "shelf" ? (
                <Shelf open={open} create={create} />
              ) : tab === "moments" ? (
                <Moments open={open} />
              ) : (
                <Settings
                  notify={notify}
                  account={() => setSheet("account")}
                  session={session}
                  studio={studio}
                  paywall={() => setSheet("studio")}
                  confirm={confirm}
                  legal={setSheet}
                />
              )}
            </View>
          </ScrollView>
          {!wide && (
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Studio navigation"
              style={s.bottomNav}
            >
              {tabs.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="tab"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: tab === t.id && !project }}
                  onPress={() => navigate(t.id)}
                  style={s.bottomItem}
                >
                  <t.icon
                    size={20}
                    color={tab === t.id && !project ? c.purple : c.muted}
                  />
                  <Text
                    style={{
                      fontFamily: font.medium,
                      fontSize: 9,
                      color: tab === t.id && !project ? c.purple : c.muted,
                    }}
                  >
                    {t.id === "shelf"
                      ? "Projects"
                      : t.id === "moments"
                        ? "Moments"
                        : t.id === "settings"
                          ? "Your corner"
                          : "Your day"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      <Modal
        visible={!!sheet}
        transparent
        animationType="fade"
        onRequestClose={() => setSheet(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.overlay}
        >
          <View
            style={[
              s.sheet,
              {
                maxHeight: width < 700 ? "96%" : "90%",
                borderRadius: width < 700 ? 22 : 26,
              },
            ]}
          >
            <View style={s.sheetHeader}>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: font.serif,
                  fontSize: 27,
                  color: c.ink,
                  flex: 1,
                }}
              >
                {sheet ? titles[sheet] : ""}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={() => setSheet(null)}
                style={s.close}
              >
                <X size={20} color={c.ink} />
              </Pressable>
            </View>
            {!!toast && (
              <Text
                accessibilityRole="alert"
                style={{
                  paddingHorizontal: 24,
                  paddingBottom: 12,
                  fontFamily: font.medium,
                  color: c.purple,
                  lineHeight: 21,
                }}
              >
                {toast}
              </Text>
            )}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: 24,
                paddingTop: 8,
                paddingBottom: 32,
              }}
            >
              {sheet === "new" || sheet === "edit" ? (
                <ProjectForm
                  key={sheet === "edit" ? project?.id : "new"}
                  project={sheet === "edit" ? project : undefined}
                  done={open}
                  notify={notify}
                  studio={studio}
                  paywall={() => setSheet("studio")}
                />
              ) : sheet === "checkpoint" && project ? (
                <CheckpointForm
                  project={project}
                  done={() => setSheet(null)}
                  notify={notify}
                />
              ) : sheet === "account" || sheet === "recovery" ? (
                <AccountForm
                  recovery={sheet === "recovery"}
                  done={() => {
                    setSheet(null);
                    notify("Welcome to your corner.");
                  }}
                />
              ) : sheet === "studio" ? (
                <Paywall
                  studio={studio}
                  refresh={refreshStudio}
                  legal={setSheet}
                  account={() => setSheet("account")}
                  signedIn={!!session}
                />
              ) : sheet === "privacy" || sheet === "terms" ? (
                <Legal type={sheet} />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={!!confirmation}
        transparent
        animationType="fade"
        onRequestClose={cancelConfirmation}
      >
        <View style={s.overlay}>
          <View style={[s.sheet, { padding: 25, gap: 20, maxWidth: 450 }]}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: font.serif, fontSize: 28, color: c.ink }}
            >
              {confirmation?.title}
            </Text>
            <Text style={common.body}>{confirmation?.text}</Text>
            <View style={common.row}>
              <Button
                title="Keep things as they are"
                kind="secondary"
                disabled={confirmBusy}
                onPress={cancelConfirmation}
                style={{ flex: 1 }}
              />
              <Button
                title="Continue"
                busy={confirmBusy}
                onPress={async () => {
                  if (!confirmation) return;
                  setConfirmBusy(true);
                  try {
                    await confirmation.action();
                    setConfirmation(null);
                  } catch (e) {
                    notify(
                      e instanceof Error
                        ? e.message
                        : "Could not complete this action.",
                    );
                  } finally {
                    setConfirmBusy(false);
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
      {!!toast && (
        <Pressable
          accessibilityRole="alert"
          onPress={() => setToast("")}
          style={[
            s.toast,
            { bottom: wide ? 28 : 94, left: wide ? 270 : 18, right: 24 },
          ]}
        >
          <Text
            style={{
              fontFamily: font.medium,
              color: "#fff",
              fontSize: 13,
              lineHeight: 21,
              flex: 1,
            }}
          >
            {toast}
          </Text>
          <X size={17} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}
function Welcome({
  start,
  error,
}: {
  start: (sample: boolean) => Promise<void>;
  error: string;
}) {
  const { width } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const go = async (sample: boolean) => {
    setBusy(true);
    await start(sample);
    setBusy(false);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: width < 700 ? 25 : 55,
        }}
      >
        <View style={{ maxWidth: 1000, width: "100%", gap: 35 }}>
          <View style={common.row}>
            <Mark />
            <Text style={s.wordmark}>unpause.</Text>
          </View>
          <View
            style={{
              flexDirection: width < 800 ? "column" : "row",
              gap: width < 800 ? 30 : 70,
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, gap: 23 }}>
              <Text style={[common.label, { color: c.purple }]}>
                FOR THE JOY OF PICKING IT BACK UP
              </Text>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: font.serif,
                  fontSize: width < 700 ? 48 : 64,
                  lineHeight: width < 700 ? 55 : 72,
                  color: c.ink,
                }}
              >
                Life happens.{"\n"}Your ideas{"\n"}can wait.
              </Text>
              <Text
                style={[
                  common.body,
                  { fontSize: 16, lineHeight: 27, maxWidth: 420 },
                ]}
              >
                A home for your half-made things. Save where you stopped, find
                your next small step, and make a little room for making.
              </Text>
              <View style={{ gap: 12, marginTop: 7 }}>
                <Button
                  title="Make room for my projects"
                  onPress={() => go(false)}
                  busy={busy}
                  icon={ArrowRight}
                />
                <Button
                  title="Explore a sample studio"
                  onPress={() => go(true)}
                  disabled={busy}
                  kind="secondary"
                />
              </View>
              <View style={common.row}>
                <Leaf size={15} color={c.green} />
                <Text style={[common.muted, { fontSize: 11 }]}>
                  Free to begin. No account. No streaks. No rush.
                </Text>
              </View>
              {!!error && <Text style={{ color: "#A64343" }}>{error}</Text>}
            </View>
            <View style={{ flex: 1, width: "100%", maxWidth: 400, gap: 18 }}>
              <View
                style={{
                  backgroundColor: "#E9E0D4",
                  borderRadius: 25,
                  overflow: "hidden",
                  transform: [{ rotate: "3deg" }],
                }}
              >
                <ProjectArt category="Sewing" height={260} />
                <View style={{ backgroundColor: "#fff", padding: 24, gap: 12 }}>
                  <Text style={[common.label, { color: c.purple }]}>
                    A NOTE TO FUTURE YOU
                  </Text>
                  <Text
                    style={{
                      fontFamily: font.serif,
                      fontSize: 27,
                      lineHeight: 35,
                      color: c.ink,
                    }}
                  >
                    “The straps are pressed.{"\n"}Just pin them in place.”
                  </Text>
                  <View style={common.row}>
                    <Check size={14} color={c.green} />
                    <Text style={common.muted}>
                      10 minutes. A lovely place to begin.
                    </Text>
                  </View>
                </View>
              </View>
              <Text
                style={[
                  common.muted,
                  {
                    textAlign: "center",
                    fontFamily: font.serifItalic,
                    fontSize: 18,
                    marginTop: 8,
                  },
                ]}
              >
                Less remembering. More making.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: c.bg,
  },
  sidebar: {
    width: 235,
    backgroundColor: "#FDFCF9",
    borderRightWidth: 1,
    borderRightColor: c.line,
    padding: 19,
    paddingTop: 34,
  },
  wordmark: {
    fontFamily: font.serif,
    fontSize: 30,
    color: c.ink,
    letterSpacing: -1.3,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  navActive: { backgroundColor: c.lilac },
  navLabel: { fontFamily: font.medium, fontSize: 12, color: c.muted, flex: 1 },
  count: {
    fontFamily: font.medium,
    fontSize: 10,
    color: c.muted,
    backgroundColor: "#E8E5DE",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  studioPromo: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#F0EDF6",
    gap: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E9E2D5",
    alignItems: "center",
    justifyContent: "center",
  },
  topbar: {
    height: 76,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: c.lilac,
  },
  sampleBadge: {
    backgroundColor: c.lilac,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FDFCF9",
    borderTopWidth: 1,
    borderTopColor: c.line,
    minHeight: 69,
    paddingBottom: 4,
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#20203085",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  sheet: {
    width: "100%",
    maxWidth: 580,
    backgroundColor: c.bg,
    borderRadius: 26,
    overflow: "hidden",
    flexShrink: 1,
  },
  sheetHeader: {
    padding: 24,
    paddingBottom: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#ECEAE4",
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    backgroundColor: c.purpleDark,
    padding: 17,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
