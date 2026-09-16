import { describe, expect, it } from "vitest";
import {
  appDataSchema,
  blankData,
  canCreateProject,
  checkpointProject,
  createProject,
  daysSince,
  elapsedMinutes,
  parseBackup,
  suggestProjects,
  validateDraft,
} from "../src/domain/projects";
import type {
  AppData,
  Checkpoint,
  Project,
  ProjectDraft,
} from "../src/domain/types";

const NOW = "2026-09-16T10:00:00.000Z";
const draft = (overrides: Partial<ProjectDraft> = {}): ProjectDraft => ({
  title: "Canvas tote",
  category: "Sewing",
  description: "Body sewn; straps pressed.",
  energy: "gentle",
  nextMinutes: 10,
  nextStep: "Pin the left strap.",
  materials: "Blue basket.",
  ...overrides,
});
const project = (id: string, overrides: Partial<Project> = {}): Project => ({
  ...createProject(draft(), id, NOW),
  ...overrides,
});
const data = (
  projects: Project[],
  overrides: Partial<AppData> = {},
): AppData => ({
  ...blankData(),
  projects,
  ...overrides,
});
const checkpoint = (overrides: Partial<Checkpoint> = {}): Checkpoint => ({
  id: "checkpoint-second",
  createdAt: "2026-09-16T10:12:00.000Z",
  stoppedAt: "Left strap pinned.",
  nextStep: "Pin the right strap.",
  materials: "Blue basket.",
  blocker: "",
  minutes: 12,
  ...overrides,
});

describe("free project allowance", () => {
  it("allows a third unfinished project and refuses a fourth", () => {
    const projects = [project("one"), project("two", { status: "active" })];
    expect(canCreateProject(projects, false)).toBe(true);
    expect(canCreateProject([...projects, project("three")], false)).toBe(
      false,
    );
  });

  it("finished projects release a slot and do not consume future slots", () => {
    const projects = [
      project("one"),
      project("two"),
      project("done", { status: "finished" }),
    ];
    expect(canCreateProject(projects, false)).toBe(true);
    expect(canCreateProject([...projects, project("three")], false)).toBe(
      false,
    );
  });

  it("Studio allows more active projects without changing saved projects", () => {
    const projects = Array.from({ length: 12 }, (_, index) =>
      project(String(index)),
    );
    expect(canCreateProject(projects, true)).toBe(true);
    expect(projects).toHaveLength(12);
  });
});

describe("project drafts", () => {
  it("creates a paused project with trimmed context and a zero-minute first checkpoint", () => {
    const created = createProject(
      draft({ title: "  Canvas tote  ", nextStep: "  Pin the strap.  " }),
      "tote",
      NOW,
    );
    expect(created).toMatchObject({
      id: "tote",
      title: "Canvas tote",
      status: "paused",
      sessionCount: 0,
      totalMinutes: 0,
    });
    expect(created.checkpoints).toHaveLength(1);
    expect(created.checkpoints[0]).toMatchObject({
      nextStep: "Pin the strap.",
      minutes: 0,
      createdAt: NOW,
    });
    expect(appDataSchema.safeParse(data([created])).success).toBe(true);
  });

  it.each([
    { title: "  " },
    { title: "x".repeat(81) },
    { nextStep: "\n  " },
    { nextStep: "x".repeat(1001) },
    { nextMinutes: 0 },
    { nextMinutes: 181 },
    { nextMinutes: 1.5 },
    { nextMinutes: Number.NaN },
    { nextMinutes: Number.POSITIVE_INFINITY },
    { description: "x".repeat(1001) },
    { materials: "x".repeat(2001) },
    { coverUri: "javascript:alert(1)" },
  ])("rejects unusable input %j before creating a project", (overrides) => {
    expect(validateDraft(draft(overrides))).toBeTypeOf("string");
    expect(() => createProject(draft(overrides), "bad", NOW)).toThrow();
  });

  it.each([1, 180])("accepts the supported time boundary %i", (nextMinutes) => {
    expect(
      validateDraft(
        draft({
          nextMinutes,
          title: "x".repeat(80),
          nextStep: "x".repeat(1000),
        }),
      ),
    ).toBeNull();
  });

  it("rejects invalid runtime categories and energy levels", () => {
    expect(
      validateDraft(draft({ category: "Unknown" as ProjectDraft["category"] })),
    ).toBeTypeOf("string");
    expect(
      validateDraft(draft({ energy: "Unknown" as ProjectDraft["energy"] })),
    ).toBeTypeOf("string");
  });

  it("accepts maximum-length contextual notes and creates importable data", () => {
    const created = createProject(
      draft({ description: "x".repeat(1000), materials: "x".repeat(2000) }),
      "max",
      NOW,
    );
    expect(parseBackup(JSON.stringify(data([created]))).projects[0]).toEqual(
      created,
    );
  });
});

describe("safe backup import", () => {
  it("round-trips a valid project and retains checkpoint history", () => {
    const original = data([checkpointProject(project("tote"), checkpoint())], {
      displayName: "Shivam",
      hasOnboarded: true,
    });
    expect(parseBackup(JSON.stringify(original))).toEqual(original);
  });

  it("clears device reminders and pauses a restored live session", () => {
    const original = data(
      [
        project("tote", {
          status: "active",
          reminderId: "old-device-id",
          reminderAt: NOW,
        }),
      ],
      {
        activeSession: { projectId: "tote", startedAt: NOW, targetMinutes: 10 },
      },
    );
    const restored = parseBackup(JSON.stringify(original));
    expect(restored.activeSession).toBeNull();
    expect(restored.projects[0]).toMatchObject({
      status: "paused",
      reminderId: undefined,
      reminderAt: undefined,
    });
    expect(original.projects[0].status).toBe("active");
  });

  it.each([
    "not json",
    "{}",
    "null",
    JSON.stringify({ ...blankData(), version: 2 }),
  ])("rejects malformed or unsupported data", (text) => {
    expect(() => parseBackup(text)).toThrow();
  });

  it("rejects duplicate project IDs instead of silently replacing a project", () => {
    expect(() =>
      parseBackup(JSON.stringify(data([project("same"), project("same")]))),
    ).toThrow(/Duplicate project IDs/);
  });

  it("rejects duplicate checkpoint IDs and blank next steps", () => {
    const duplicate = project("tote", {
      checkpoints: [checkpoint(), checkpoint()],
    });
    expect(() => parseBackup(JSON.stringify(data([duplicate])))).toThrow(
      /Duplicate checkpoint IDs/,
    );
    const blank = project("tote", {
      checkpoints: [checkpoint({ nextStep: "   " })],
    });
    expect(() => parseBackup(JSON.stringify(data([blank])))).toThrow();
  });

  it("rejects orphaned or multiple active projects", () => {
    expect(() =>
      parseBackup(
        JSON.stringify(data([project("orphan", { status: "active" })])),
      ),
    ).toThrow(/Every active project/);
    const original = data(
      [
        project("one", { status: "active" }),
        project("two", { status: "active" }),
      ],
      {
        activeSession: { projectId: "one", startedAt: NOW, targetMinutes: 10 },
      },
    );
    expect(() => parseBackup(JSON.stringify(original))).toThrow(
      /Every active project/,
    );
  });

  it.each(["missing", "paused", "finished"])(
    "rejects a session attached to a %s project",
    (status) => {
      const projects =
        status === "missing"
          ? []
          : [project("tote", { status: status as "paused" | "finished" })];
      expect(() =>
        parseBackup(
          JSON.stringify(
            data(projects, {
              activeSession: {
                projectId: "tote",
                startedAt: NOW,
                targetMinutes: 10,
              },
            }),
          ),
        ),
      ).toThrow(/Session must belong to an active project/);
    },
  );

  it.each([
    { checkpoints: [] },
    { totalMinutes: -1 },
    { nextMinutes: 181 },
    { createdAt: "yesterday" },
    { color: "javascript:alert(1)" },
    { coverUri: "javascript:alert(1)" },
  ])("rejects structurally invalid project records %j", (overrides) => {
    expect(() =>
      parseBackup(JSON.stringify(data([project("invalid", overrides)]))),
    ).toThrow();
  });

  it("rejects oversized input before attempting JSON parsing", () => {
    expect(() => parseBackup(" ".repeat(30_000_001))).toThrow(
      /Backup is too large/,
    );
  });
});

describe("finding a project that fits", () => {
  it("respects the exact time boundary and omits finished projects", () => {
    const choices = [
      project("long", { nextMinutes: 11 }),
      project("fits"),
      project("finished", { status: "finished" }),
    ];
    expect(suggestProjects(choices, 10).map((p) => p.id)).toEqual(["fits"]);
    expect(suggestProjects(choices, 9)).toEqual([]);
  });

  it("includes only the selected energy level or gentler work", () => {
    const choices = [
      project("gentle"),
      project("steady", { energy: "steady" }),
      project("focused", { energy: "focused" }),
    ];
    expect(suggestProjects(choices, 10, "gentle").map((p) => p.id)).toEqual([
      "gentle",
    ]);
    expect(suggestProjects(choices, 10, "steady").map((p) => p.id)).toEqual([
      "gentle",
      "steady",
    ]);
    expect(suggestProjects(choices, 10, "focused")).toHaveLength(3);
    expect(suggestProjects(choices, 10)).toHaveLength(3);
  });

  it("ranks unblocked work ahead of blocked work, then older projects first", () => {
    const blocked = project("blocked", {
      updatedAt: "2026-01-01T00:00:00.000Z",
      checkpoints: [checkpoint({ blocker: "Need thread." })],
    });
    const old = project("old", { updatedAt: "2026-09-01T00:00:00.000Z" });
    const recent = project("recent");
    const choices = [recent, blocked, old];
    expect(suggestProjects(choices, 10).map((p) => p.id)).toEqual([
      "old",
      "recent",
      "blocked",
    ]);
    expect(choices.map((p) => p.id)).toEqual(["recent", "blocked", "old"]);
  });
});

describe("saving the next handoff", () => {
  it("prepends a checkpoint, accumulates making time, and retains previous history", () => {
    const original = project("tote", {
      status: "active",
      sessionCount: 2,
      totalMinutes: 25,
    });
    const paused = checkpointProject(original, checkpoint());
    expect(paused).toMatchObject({
      status: "paused",
      sessionCount: 3,
      totalMinutes: 37,
      updatedAt: "2026-09-16T10:12:00.000Z",
    });
    expect(paused.checkpoints.map((c) => c.id)).toEqual([
      "checkpoint-second",
      "tote-first",
    ]);
    expect(original.status).toBe("active");
    expect(original.checkpoints).toHaveLength(1);
  });

  it("updates the cover only when a new checkpoint photo is present", () => {
    const original = project("tote", {
      coverUri: "https://example.com/original.jpg",
    });
    expect(checkpointProject(original, checkpoint()).coverUri).toBe(
      original.coverUri,
    );
    expect(
      checkpointProject(
        original,
        checkpoint({ photoUri: "file:///new-photo.jpg" }),
      ).coverUri,
    ).toBe("file:///new-photo.jpg");
  });

  it.each([-1, 1.5, 1441])(
    "rejects invalid recorded duration %i without mutating the project",
    (minutes) => {
      const original = project("tote");
      expect(() =>
        checkpointProject(original, checkpoint({ minutes })),
      ).toThrow();
      expect(original.totalMinutes).toBe(0);
      expect(original.checkpoints).toHaveLength(1);
    },
  );

  it("refuses duplicate history identifiers without overwriting the old record", () => {
    const original = project("tote");
    expect(() =>
      checkpointProject(original, checkpoint({ id: "tote-first" })),
    ).toThrow(/Duplicate checkpoint IDs/);
    expect(original.checkpoints[0].nextStep).toBe("Pin the left strap.");
  });

  it("refuses a checkpoint if cumulative counters would create an invalid backup", () => {
    const original = project("tote", { totalMinutes: 10_000_000 });
    expect(() => checkpointProject(original, checkpoint())).toThrow();
    expect(original.totalMinutes).toBe(10_000_000);
  });
});

describe("clock boundaries", () => {
  const start = Date.parse(NOW);
  it("records complete elapsed minutes and clamps negative time", () => {
    expect(elapsedMinutes(NOW, start - 1)).toBe(0);
    expect(elapsedMinutes(NOW, start + 59_999)).toBe(0);
    expect(elapsedMinutes(NOW, start + 60_000)).toBe(1);
    expect(elapsedMinutes(NOW, start + 119_999)).toBe(1);
  });

  it("caps accidentally long-running sessions at 24 hours", () => {
    expect(elapsedMinutes(NOW, start + 1440 * 60_000)).toBe(1440);
    expect(elapsedMinutes(NOW, start + 7 * 86400000)).toBe(1440);
  });

  it("uses elapsed 24-hour periods and never shows negative days", () => {
    expect(daysSince(NOW, start - 86400000)).toBe(0);
    expect(daysSince(NOW, start + 86399999)).toBe(0);
    expect(daysSince(NOW, start + 86400000)).toBe(1);
    expect(daysSince("2026-09-16T15:30:00+05:30", start + 86400000)).toBe(1);
  });
});
