import { z } from "zod";
import type {
  AppData,
  Checkpoint,
  Energy,
  Project,
  ProjectDraft,
} from "./types";

export const FREE_PROJECT_LIMIT = 3;
export const categories = [
  "Sewing",
  "Woodwork",
  "Art",
  "Electronics",
  "Garden",
  "Other",
] as const;
const validDate = z.string().datetime({ offset: true });
const photo = z
  .string()
  .max(8_000_000)
  .refine(
    (v) =>
      /^(data:image\/(jpeg|png|webp);base64,|file:\/\/|blob:|https:\/\/)/.test(
        v,
      ),
    "Unsupported photo format",
  )
  .optional();
const checkpointSchema = z.object({
  id: z.string().min(1).max(100),
  createdAt: validDate,
  stoppedAt: z.string().max(4000),
  nextStep: z.string().trim().min(1).max(1000),
  materials: z.string().max(2000),
  blocker: z.string().max(2000),
  minutes: z.number().int().min(0).max(1440),
  photoUri: photo,
});
const projectSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(80),
    category: z.enum(categories),
    description: z.string().max(1000),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    status: z.enum(["paused", "active", "finished"]),
    energy: z.enum(["gentle", "steady", "focused"]),
    nextMinutes: z.number().int().min(1).max(180),
    createdAt: validDate,
    updatedAt: validDate,
    checkpoints: z.array(checkpointSchema).min(1).max(2000),
    totalMinutes: z.number().int().min(0).max(10000000),
    sessionCount: z.number().int().min(0).max(1000000),
    coverUri: photo,
    reminderId: z.string().optional(),
    reminderAt: validDate.optional(),
    isSample: z.boolean().optional(),
  })
  .superRefine((project, ctx) => {
    const checkpointIds = project.checkpoints.map(
      (checkpoint) => checkpoint.id,
    );
    if (new Set(checkpointIds).size !== checkpointIds.length)
      ctx.addIssue({ code: "custom", message: "Duplicate checkpoint IDs" });
  });
export const appDataSchema = z
  .object({
    version: z.literal(1),
    projects: z.array(projectSchema).max(500),
    activeSession: z
      .object({
        projectId: z.string(),
        startedAt: validDate,
        targetMinutes: z.number().int().min(1).max(180),
      })
      .nullable(),
    hasOnboarded: z.boolean(),
    displayName: z.string().max(60),
  })
  .superRefine((data, ctx) => {
    const ids = data.projects.map((p) => p.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate project IDs" });
    if (
      data.activeSession &&
      !data.projects.some(
        (p) => p.id === data.activeSession?.projectId && p.status === "active",
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Session must belong to an active project",
      });
    if (
      data.projects.some(
        (p) => p.status === "active" && p.id !== data.activeSession?.projectId,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Every active project must have the current session",
      });
  });
export const blankData = (): AppData => ({
  version: 1,
  projects: [],
  activeSession: null,
  hasOnboarded: false,
  displayName: "",
});
export const palette: Record<Project["category"], string> = {
  Sewing: "#EDDCCE",
  Woodwork: "#E1E5D5",
  Art: "#E5DFF1",
  Electronics: "#DCE5E9",
  Garden: "#D9E7DB",
  Other: "#EDE3CE",
};
export function validateDraft(draft: ProjectDraft): string | null {
  if (!draft.title.trim()) return "Give your project a name.";
  if (draft.title.trim().length > 80) return "Use a name under 80 characters.";
  if (!draft.nextStep.trim()) return "Leave yourself one small next step.";
  if (draft.nextStep.length > 1000)
    return "Keep your next step under 1,000 characters.";
  if (draft.description.length > 1000)
    return "Keep your stopping point under 1,000 characters.";
  if (draft.materials.length > 2000)
    return "Keep material notes under 2,000 characters.";
  if (!categories.includes(draft.category)) return "Choose a project category.";
  if (!["gentle", "steady", "focused"].includes(draft.energy))
    return "Choose an energy level.";
  if (!photo.safeParse(draft.coverUri).success)
    return "Choose a supported photo.";
  if (
    !Number.isInteger(draft.nextMinutes) ||
    draft.nextMinutes < 1 ||
    draft.nextMinutes > 180
  )
    return "Choose between 1 and 180 minutes.";
  return null;
}
export function createProject(
  draft: ProjectDraft,
  id: string,
  now: string,
): Project {
  const error = validateDraft(draft);
  if (error) throw new Error(error);
  return projectSchema.parse({
    id,
    title: draft.title.trim(),
    category: draft.category,
    description: draft.description.trim(),
    color: palette[draft.category],
    status: "paused",
    energy: draft.energy,
    nextMinutes: draft.nextMinutes,
    createdAt: now,
    updatedAt: now,
    totalMinutes: 0,
    sessionCount: 0,
    coverUri: draft.coverUri,
    checkpoints: [
      {
        id: `${id}-first`,
        createdAt: now,
        stoppedAt: draft.description.trim(),
        nextStep: draft.nextStep.trim(),
        materials: draft.materials.trim(),
        blocker: "",
        minutes: 0,
      },
    ],
  });
}
export function checkpointProject(
  project: Project,
  checkpoint: Checkpoint,
): Project {
  const valid = checkpointSchema.parse(checkpoint);
  return projectSchema.parse({
    ...project,
    status: "paused",
    updatedAt: valid.createdAt,
    checkpoints: [valid, ...project.checkpoints],
    sessionCount: project.sessionCount + 1,
    totalMinutes: project.totalMinutes + valid.minutes,
    coverUri: valid.photoUri || project.coverUri,
  });
}
export function suggestProjects(
  projects: Project[],
  minutes: number,
  energy?: Energy,
): Project[] {
  const rank = { gentle: 0, steady: 1, focused: 2 };
  return projects
    .filter(
      (p) =>
        p.status !== "finished" &&
        p.nextMinutes <= minutes &&
        (!energy || rank[p.energy] <= rank[energy]),
    )
    .sort(
      (a, b) =>
        Number(Boolean(a.checkpoints[0]?.blocker)) -
          Number(Boolean(b.checkpoints[0]?.blocker)) ||
        a.updatedAt.localeCompare(b.updatedAt),
    );
}
export function parseBackup(text: string): AppData {
  if (text.length > 30_000_000)
    throw new Error("Backup is too large. Maximum size is 30 MB.");
  const data = appDataSchema.parse(JSON.parse(text));
  // Reminders belong to the old device. A restored session must be deliberately restarted.
  return {
    ...data,
    activeSession: null,
    projects: data.projects.map((p) => ({
      ...p,
      status: p.status === "active" ? "paused" : p.status,
      reminderId: undefined,
      reminderAt: undefined,
    })),
  };
}
export function elapsedMinutes(start: string, now: number): number {
  return Math.max(
    0,
    Math.min(1440, Math.floor((now - Date.parse(start)) / 60000)),
  );
}
export function daysSince(date: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(date)) / 86400000));
}
export function canCreateProject(
  projects: Project[],
  studio: boolean,
): boolean {
  return (
    studio ||
    projects.filter((p) => p.status !== "finished").length < FREE_PROJECT_LIMIT
  );
}
