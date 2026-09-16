import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  MapPin,
  Pause,
  Play,
  Share2,
  Trash2,
} from "lucide-react-native";
import { c, common, font } from "../components/theme";
import { Button, Chip, Field } from "../components/ui";
import { ProjectArt } from "../components/ProjectArt";
import { useDraftPhotos } from "../hooks/useDraftPhotos";
import { useApp } from "../store";
import {
  canCreateProject,
  categories,
  checkpointProject,
  createProject,
  elapsedMinutes,
  validateDraft,
} from "../domain/projects";
import type { Category, Energy, Project, ProjectDraft } from "../domain/types";
import { pickPhoto, exportProject, clearUnusedPhotos } from "../services/media";
import { cancelReminder, scheduleReminder } from "../services/reminders";
import * as Crypto from "expo-crypto";
export type Notice = (message: string) => void;
export function ProjectDetail({
  id,
  back,
  checkpoint,
  edit,
  notify,
  confirm,
  studio,
  paywall,
}: {
  id: string;
  back: () => void;
  checkpoint: () => void;
  edit: () => void;
  notify: Notice;
  confirm: (title: string, text: string, action: () => Promise<void>) => void;
  studio: boolean;
  paywall: () => void;
}) {
  const { data, update, snapshot } = useApp();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const p = data.projects.find((p) => p.id === id);
  const session =
    data.activeSession?.projectId === id ? data.activeSession : null;
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);
  if (!p) return <Button title="Back to your shelf" onPress={back} />;
  const cp = p.checkpoints[0];
  const elapsed = session
    ? Math.max(0, Math.floor((now - Date.parse(session.startedAt)) / 1000))
    : 0;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
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
  const resume = () =>
    run(async () => {
      if (data.activeSession && data.activeSession.projectId !== id) {
        notify(
          "You have a session open in another project. Leave a checkpoint there before starting this one.",
        );
        return;
      }
      await update((d) => ({
        ...d,
        activeSession: {
          projectId: id,
          startedAt: new Date().toISOString(),
          targetMinutes: p.nextMinutes,
        },
        projects: d.projects.map((x) =>
          x.id === id ? { ...x, status: "active" } : x,
        ),
      }));
    });
  const finish = () =>
    confirm(
      "A lovely thing, finished.",
      "Move this project to your finished shelf? Your photos and checkpoints stay with it.",
      async () => {
        if (session) {
          notify(
            "Save your session with a checkpoint first, then mark your project finished.",
          );
          return;
        }
        await update((d) => ({
          ...d,
          projects: d.projects.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "finished",
                  updatedAt: new Date().toISOString(),
                  reminderAt: undefined,
                  reminderId: undefined,
                }
              : x,
          ),
        }));
        if (p.reminderId)
          await cancelReminder(p.reminderId).catch((e) => notify(e.message));
        notify("Made by you. That’s worth a little celebration.");
      },
    );
  return (
    <View style={{ gap: 24 }}>
      <View style={[common.row, { justifyContent: "space-between" }]}>
        <Button
          title="Your shelf"
          icon={ArrowLeft}
          kind="ghost"
          onPress={back}
        />
        <View style={common.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit project"
            onPress={edit}
            style={s.iconButton}
          >
            <Edit3 size={18} color={c.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share project handoff"
            onPress={() => run(() => exportProject(p))}
            style={s.iconButton}
          >
            <Share2 size={18} color={c.muted} />
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 9 }}>
        <Text style={[common.label, { color: c.purple }]}>
          {p.category} ·{" "}
          {p.status === "finished"
            ? "FINISHED WITH CARE"
            : session
              ? "A LITTLE MAKING TIME"
              : "A WORK IN PROGRESS"}
        </Text>
        <Text
          accessibilityRole="header"
          style={[
            common.title,
            { fontSize: width < 700 ? 36 : 46, lineHeight: 54 },
          ]}
        >
          {p.title}
        </Text>
        <Text style={common.muted}>{p.description}</Text>
      </View>
      {session && (
        <View
          style={[
            s.timer,
            width < 700 && { flexDirection: "column", alignItems: "stretch" },
          ]}
        >
          <View style={{ flex: width < 700 ? undefined : 1, gap: 7 }}>
            <Text style={[common.label, { color: c.purple }]}>
              THIS TIME IS YOURS
            </Text>
            <Text
              accessibilityLiveRegion="none"
              numberOfLines={1}
              style={{ fontFamily: font.serif, fontSize: 40, color: c.ink }}
            >
              {Math.floor(elapsed / 60)
                .toString()
                .padStart(2, "0")}
              :{(elapsed % 60).toString().padStart(2, "0")}
            </Text>
            <Text style={common.muted}>
              {elapsed >= session.targetMinutes * 60
                ? "Your little window is complete. Stop whenever feels right."
                : `${session.targetMinutes} minutes was the plan. There’s no rush.`}
            </Text>
          </View>
          <Button
            title="Pause & leave a note"
            onPress={checkpoint}
            icon={Pause}
          />
        </View>
      )}
      <View style={{ flexDirection: width < 800 ? "column" : "row", gap: 24 }}>
        <View style={{ flex: 1, gap: 22 }}>
          <View style={{ borderRadius: 20, overflow: "hidden" }}>
            <ProjectArt
              category={p.category}
              color={p.color}
              uri={p.coverUri}
              height={width < 700 ? 220 : 280}
            />
          </View>
          <View style={[common.card, { gap: 17 }]}>
            <Text style={common.label}>WHERE YOU LEFT OFF</Text>
            <Text style={[common.body, { fontSize: 16, lineHeight: 26 }]}>
              {cp.stoppedAt ||
                "The idea is here. Your first small step is ready."}
            </Text>
            {cp.photoUri && cp.photoUri !== p.coverUri && (
              <Image
                source={{ uri: cp.photoUri }}
                accessibilityLabel="Last checkpoint photo"
                style={{ height: 180, borderRadius: 12 }}
              />
            )}
            <Text style={[common.muted, { fontSize: 11 }]}>
              {new Date(cp.createdAt).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}{" "}
              · A note from past you
            </Text>
          </View>
          <View style={[common.card, { gap: 12 }]}>
            <View style={common.row}>
              <MapPin size={16} color={c.green} />
              <Text style={common.label}>EVERYTHING IN ITS PLACE</Text>
            </View>
            <Text style={common.body}>
              {cp.materials ||
                "No materials location saved yet. Add one when you pause."}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 22 }}>
          <View style={[s.nextCard, { gap: 18 }]}>
            <View style={common.row}>
              <Play size={16} color={c.purple} />
              <Text style={[common.label, { color: c.purple }]}>
                YOUR WAY BACK IN
              </Text>
            </View>
            <Text
              style={{
                fontFamily: font.serif,
                fontSize: 29,
                lineHeight: 39,
                color: c.ink,
              }}
            >
              {cp.nextStep}
            </Text>
            <View style={common.row}>
              <View style={s.tag}>
                <Clock3 size={12} color={c.purple} />
                <Text style={s.tagText}>{p.nextMinutes} minutes</Text>
              </View>
              <View style={s.tag}>
                <Text style={s.tagText}>{p.energy} energy</Text>
              </View>
            </View>
            {cp.blocker ? (
              <View
                style={{
                  backgroundColor: "#FFF4E4",
                  padding: 13,
                  borderRadius: 12,
                  gap: 5,
                }}
              >
                <Text style={[common.label, { color: "#856D46" }]}>
                  BEFORE YOU START
                </Text>
                <Text style={common.body}>{cp.blocker}</Text>
              </View>
            ) : null}
            {p.status === "finished" ? (
              <Button
                title="Make a little more"
                kind="secondary"
                onPress={() => {
                  if (!canCreateProject(data.projects, studio)) {
                    paywall();
                    return;
                  }
                  run(() =>
                    update((d) => ({
                      ...d,
                      projects: d.projects.map((x) =>
                        x.id === id ? { ...x, status: "paused" } : x,
                      ),
                    })),
                  );
                }}
                icon={Play}
              />
            ) : session ? (
              <View style={{ gap: 12 }}>
                <Text style={[common.muted, { color: c.purple }]}>
                  One small step is enough. Enjoy making.
                </Text>
                <Button
                  title="Save a checkpoint"
                  onPress={checkpoint}
                  icon={Pause}
                />
              </View>
            ) : (
              <Button
                title="Let’s make a little"
                onPress={resume}
                icon={Play}
                busy={busy}
              />
            )}
          </View>
          <View style={[common.card, { gap: 16 }]}>
            <Text style={common.label}>ALL THE LITTLE RETURNS</Text>
            <View style={[common.row, { gap: 30 }]}>
              <View>
                <Text style={s.stat}>{p.sessionCount}</Text>
                <Text style={common.muted}>making sessions</Text>
              </View>
              <View>
                <Text style={s.stat}>{p.totalMinutes}</Text>
                <Text style={common.muted}>minutes of care</Text>
              </View>
            </View>
          </View>
          {p.status !== "finished" && (
            <View style={{ gap: 9 }}>
              <Button
                title={
                  p.reminderAt ? "Remove reminder" : "A gentle nudge tomorrow"
                }
                kind="secondary"
                icon={Bell}
                busy={busy}
                onPress={() =>
                  run(async () => {
                    if (p.reminderId) {
                      await cancelReminder(p.reminderId);
                      await update((d) => ({
                        ...d,
                        projects: d.projects.map((x) =>
                          x.id === id
                            ? {
                                ...x,
                                reminderId: undefined,
                                reminderAt: undefined,
                              }
                            : x,
                        ),
                      }));
                      notify("Reminder removed.");
                    } else {
                      const date = new Date();
                      date.setDate(date.getDate() + 1);
                      date.setHours(18, 0, 0, 0);
                      const reminderId = await scheduleReminder(p, date);
                      try {
                        await update((d) => ({
                          ...d,
                          projects: d.projects.map((x) =>
                            x.id === id
                              ? {
                                  ...x,
                                  reminderId,
                                  reminderAt: date.toISOString(),
                                }
                              : x,
                          ),
                        }));
                      } catch (e) {
                        await cancelReminder(reminderId);
                        throw e;
                      }
                      notify("A gentle reminder is set for tomorrow at 6 pm.");
                    }
                  })
                }
              />
              {p.reminderAt && (
                <Text
                  style={[common.muted, { fontSize: 11, textAlign: "center" }]}
                >
                  {new Date(p.reminderAt).toLocaleString()}
                </Text>
              )}
              <Button
                title="Mark as finished"
                kind="ghost"
                onPress={finish}
                icon={CheckCircle2}
              />
            </View>
          )}
        </View>
      </View>
      <View style={{ gap: 15 }}>
        <Text style={{ fontFamily: font.serif, fontSize: 27, color: c.ink }}>
          The story so far
        </Text>
        {p.checkpoints.map((point, i) => (
          <View
            key={point.id}
            style={[
              common.card,
              {
                gap: 10,
                borderLeftWidth: 3,
                borderLeftColor: i === 0 ? c.purple : c.line,
              },
            ]}
          >
            <View style={[common.row, { justifyContent: "space-between" }]}>
              <Text
                style={[common.label, { color: i === 0 ? c.purple : c.muted }]}
              >
                {i === 0 ? "LATEST NOTE" : "CHECKPOINT"}
              </Text>
              <Text style={[common.muted, { fontSize: 11 }]}>
                {new Date(point.createdAt).toLocaleDateString()} ·{" "}
                {point.minutes} min
              </Text>
            </View>
            <Text style={common.body}>
              {point.stoppedAt || "A new beginning."}
            </Text>
            <Text style={common.muted}>Next: {point.nextStep}</Text>
            {point.photoUri && (
              <Button
                title="Remove checkpoint photo"
                kind="ghost"
                onPress={() =>
                  confirm(
                    "Remove this photo?",
                    "Keep the written checkpoint and remove its image. This also removes the cover if it uses this same image.",
                    async () => {
                      await update((d) => ({
                        ...d,
                        projects: d.projects.map((x) =>
                          x.id === id
                            ? {
                                ...x,
                                coverUri:
                                  x.coverUri === point.photoUri
                                    ? undefined
                                    : x.coverUri,
                                checkpoints: x.checkpoints.map((cp) =>
                                  cp.id === point.id
                                    ? { ...cp, photoUri: undefined }
                                    : cp,
                                ),
                              }
                            : x,
                        ),
                      }));
                      await clearUnusedPhotos(snapshot().projects).catch((e) =>
                        notify(e.message),
                      );
                    },
                  )
                }
              />
            )}
            {point.photoUri && (
              <Image
                source={{ uri: point.photoUri }}
                accessibilityLabel="Checkpoint photo"
                style={{ height: 150, borderRadius: 12, marginTop: 6 }}
              />
            )}
          </View>
        ))}
      </View>
      <Button
        title="Delete project"
        kind="danger"
        icon={Trash2}
        onPress={() =>
          confirm(
            "Delete this project?",
            "This removes its notes and history from this device. Export a backup first if you want to keep them.",
            async () => {
              await update((d) => ({
                ...d,
                activeSession:
                  d.activeSession?.projectId === id ? null : d.activeSession,
                projects: d.projects.filter((x) => x.id !== id),
              }));
              back();
              await clearUnusedPhotos(snapshot().projects).catch((e) =>
                notify(e.message),
              );
              if (p.reminderId)
                await cancelReminder(p.reminderId).catch((e) =>
                  notify(e.message),
                );
            },
          )
        }
      />
    </View>
  );
}
export function ProjectForm({
  project,
  done,
  notify,
  studio,
  paywall,
}: {
  project?: Project;
  done: (id: string) => void;
  notify: Notice;
  studio: boolean;
  paywall: () => void;
}) {
  const { data, update, snapshot } = useApp();
  const [draft, setDraft] = useState<ProjectDraft>({
    title: project?.title || "",
    category: project?.category || "Sewing",
    description: project?.description || "",
    energy: project?.energy || "gentle",
    nextMinutes: project?.nextMinutes || 10,
    nextStep: project?.checkpoints[0].nextStep || "",
    materials: project?.checkpoints[0].materials || "",
    coverUri: project?.coverUri,
  });
  const photoDraft = useDraftPhotos(data.projects, notify);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const patch = (value: Partial<ProjectDraft>) =>
    setDraft((d) => ({ ...d, ...value }));
  const save = async () => {
    const error = validateDraft(draft);
    if (error) {
      setError(error);
      return;
    }
    if (!project && !canCreateProject(data.projects, studio)) {
      paywall();
      return;
    }
    setBusy(true);
    try {
      const id = project?.id || Crypto.randomUUID();
      const now = new Date().toISOString();
      await update((d) => {
        if (!project && !canCreateProject(d.projects, studio))
          throw new Error(
            "Your free shelf has three open projects. Finish a project or unlock Studio.",
          );
        return {
          ...d,
          projects: project
            ? d.projects.map((p) =>
                p.id === id
                  ? {
                      ...p,
                      title: draft.title.trim(),
                      category: draft.category,
                      description: draft.description.trim(),
                      energy: draft.energy,
                      nextMinutes: draft.nextMinutes,
                      coverUri: draft.coverUri,
                      updatedAt: now,
                      checkpoints: [
                        {
                          ...p.checkpoints[0],
                          nextStep: draft.nextStep.trim(),
                          materials: draft.materials.trim(),
                        },
                        ...p.checkpoints.slice(1),
                      ],
                    }
                  : p,
              )
            : [createProject(draft, id, now), ...d.projects],
        };
      });
      photoDraft.keep(draft.coverUri);
      done(id);
      void clearUnusedPhotos(snapshot().projects).catch((e) =>
        notify(e.message),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your project.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <Text style={common.muted}>
        {project
          ? "Make the next return even easier."
          : "You don’t need a plan for the whole thing. Just a place to begin."}
      </Text>
      <Field
        label="Project name"
        placeholder="The Sunday tote"
        value={draft.title}
        onChangeText={(title) => patch({ title })}
        maxLength={80}
      />
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>What are you making?</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              selected={draft.category === category}
              onPress={() => patch({ category })}
            />
          ))}
        </View>
      </View>
      <Field
        label="A little about it"
        placeholder="What are you making, and where are you so far?"
        multiline
        value={draft.description}
        onChangeText={(description) => patch({ description })}
        maxLength={1000}
      />
      <Field
        label="Your next tiny step"
        placeholder="Pin the straps to the top edge."
        hint="Something you could do with your hands, in one sitting."
        multiline
        value={draft.nextStep}
        onChangeText={(nextStep) => patch({ nextStep })}
        maxLength={1000}
      />
      <Field
        label="Where are the pieces?"
        placeholder="In the basket beside the sewing machine."
        multiline
        value={draft.materials}
        onChangeText={(materials) => patch({ materials })}
        maxLength={2000}
      />
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>How long might that next step take?</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[10, 25, 45, 90].map((m) => (
            <Chip
              key={m}
              label={`${m} min`}
              selected={draft.nextMinutes === m}
              onPress={() => patch({ nextMinutes: m })}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>The energy it needs</Text>
        <View style={common.row}>
          {(["gentle", "steady", "focused"] as Energy[]).map((energy) => (
            <Chip
              key={energy}
              label={energy}
              selected={draft.energy === energy}
              onPress={() => patch({ energy })}
            />
          ))}
        </View>
      </View>
      {draft.coverUri && (
        <Image
          source={{ uri: draft.coverUri }}
          style={{ height: 180, borderRadius: 16 }}
          accessibilityLabel="Your project photo"
        />
      )}
      <Button
        title={draft.coverUri ? "Change project photo" : "Add a project photo"}
        kind="secondary"
        onPress={async () => {
          try {
            const uri = await pickPhoto();
            if (uri) {
              photoDraft.track(uri);
              patch({ coverUri: uri });
            }
          } catch (e) {
            notify(e instanceof Error ? e.message : "Could not open photos.");
          }
        }}
      />
      {!!draft.coverUri && (
        <Button
          title="Remove cover photo"
          kind="ghost"
          onPress={() => patch({ coverUri: undefined })}
        />
      )}
      {Platform.OS !== "web" && (
        <Button
          title="Take a project photo"
          kind="secondary"
          onPress={async () => {
            try {
              const uri = await pickPhoto("camera");
              if (uri) {
                photoDraft.track(uri);
                patch({ coverUri: uri });
              }
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not open the camera.",
              );
            }
          }}
        />
      )}
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#A64343", fontFamily: font.medium }}
        >
          {error}
        </Text>
      )}
      <Button
        title={project ? "Save changes" : "Give it a place"}
        onPress={save}
        busy={busy}
        icon={ArrowRight}
      />
    </View>
  );
}
export function CheckpointForm({
  project: p,
  done,
  notify,
}: {
  project: Project;
  done: () => void;
  notify: Notice;
}) {
  const { data, update, snapshot } = useApp();
  const session =
    data.activeSession?.projectId === p.id ? data.activeSession : null;
  const [stoppedAt, setStopped] = useState("");
  const [nextStep, setNext] = useState("");
  const [materials, setMaterials] = useState(p.checkpoints[0].materials);
  const [blocker, setBlocker] = useState("");
  const [photoUri, setPhoto] = useState<string | undefined>();
  const [nextMinutes, setMinutes] = useState(p.nextMinutes);
  const photoDraft = useDraftPhotos(data.projects, notify);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!nextStep.trim()) {
      setError("Leave future you one small next step.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const point = {
        id: Crypto.randomUUID(),
        createdAt: now,
        stoppedAt: stoppedAt.trim(),
        nextStep: nextStep.trim(),
        materials: materials.trim(),
        blocker: blocker.trim(),
        minutes: session ? elapsedMinutes(session.startedAt, Date.now()) : 0,
        photoUri,
      };
      await update((d) => ({
        ...d,
        activeSession:
          d.activeSession?.projectId === p.id ? null : d.activeSession,
        projects: d.projects.map((x) =>
          x.id === p.id ? { ...checkpointProject(x, point), nextMinutes } : x,
        ),
      }));
      photoDraft.keep(photoUri);
      done();
      notify("A little progress, safely kept. See you next time.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your checkpoint.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 22 }}>
      <View
        style={{
          backgroundColor: c.lilac,
          padding: 17,
          borderRadius: 15,
          gap: 6,
        }}
      >
        <Text
          style={{
            fontFamily: font.serifItalic,
            fontSize: 24,
            color: c.purple,
          }}
        >
          Dear future me,
        </Text>
        <Text style={common.muted}>
          A minute of remembering now. An easier beginning later.
        </Text>
      </View>
      <Field
        label="Where did you stop?"
        placeholder="Straps are pinned. Left the needle at the first blue pin."
        multiline
        value={stoppedAt}
        onChangeText={setStopped}
        maxLength={4000}
      />
      <Field
        label="What’s the next tiny step?"
        placeholder="Sew the first strap, then turn the bag around."
        multiline
        value={nextStep}
        onChangeText={setNext}
        maxLength={1000}
      />
      <View style={{ gap: 10 }}>
        <Text style={s.fieldLabel}>Next time, you’ll need about</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[10, 25, 45, 90].map((m) => (
            <Chip
              key={m}
              label={`${m} min`}
              selected={nextMinutes === m}
              onPress={() => setMinutes(m)}
            />
          ))}
        </View>
      </View>
      <Field
        label="Where did you put everything?"
        multiline
        value={materials}
        onChangeText={setMaterials}
        maxLength={2000}
      />
      <Field
        label="Anything to sort out first?"
        placeholder="Optional: buy matching thread, wait for paint to dry…"
        multiline
        value={blocker}
        onChangeText={setBlocker}
        maxLength={2000}
      />
      {photoUri && (
        <Image
          source={{ uri: photoUri }}
          accessibilityLabel="Checkpoint photo preview"
          style={{ height: 180, borderRadius: 14 }}
        />
      )}
      <Button
        title={
          photoUri ? "Change checkpoint photo" : "Save a photo of this moment"
        }
        kind="secondary"
        onPress={async () => {
          try {
            const uri = await pickPhoto();
            if (uri) {
              photoDraft.track(uri);
              setPhoto(uri);
            }
          } catch (e) {
            notify(e instanceof Error ? e.message : "Could not open photos.");
          }
        }}
      />
      {!!photoUri && (
        <Button
          title="Remove this photo"
          kind="ghost"
          onPress={() => setPhoto(undefined)}
        />
      )}
      {Platform.OS !== "web" && (
        <Button
          title="Take a checkpoint photo"
          kind="secondary"
          onPress={async () => {
            try {
              const uri = await pickPhoto("camera");
              if (uri) {
                photoDraft.track(uri);
                setPhoto(uri);
              }
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not open the camera.",
              );
            }
          }}
        />
      )}
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#A64343", fontFamily: font.medium }}
        >
          {error}
        </Text>
      )}
      <Button title="Save my place" onPress={save} busy={busy} icon={Check} />
    </View>
  );
}
const s = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: c.paper,
  },
  timer: {
    backgroundColor: "#EEEDF7",
    padding: 22,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  nextCard: {
    backgroundColor: "#EEEAF6",
    borderWidth: 1,
    borderColor: "#E0D9F0",
    padding: 25,
    borderRadius: 22,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF80",
    borderRadius: 8,
  },
  tagText: { fontSize: 11, fontFamily: font.medium, color: c.purple },
  stat: { fontSize: 35, fontFamily: font.serif, color: c.ink },
  fieldLabel: { fontFamily: font.medium, fontSize: 13, color: c.ink },
});
