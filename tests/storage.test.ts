import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  budget: vi.fn(),
  platform: { OS: "web" },
  generation: 0,
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));
vi.mock("react-native", () => ({ Platform: storage.platform }));
vi.mock("expo-crypto", () => ({
  randomUUID: () => `generation-${++storage.generation}`,
}));
vi.mock("../src/services/media", () => ({
  assertPortableBudget: storage.budget,
}));
import { blankData } from "../src/domain/projects";

beforeEach(() => {
  vi.resetModules();
  storage.getItem.mockReset();
  storage.setItem.mockReset();
  storage.removeItem.mockReset();
  storage.budget.mockReset();
  storage.budget.mockResolvedValue(undefined);
  storage.setItem.mockResolvedValue(undefined);
  storage.removeItem.mockResolvedValue(undefined);
  storage.platform.OS = "web";
  storage.generation = 0;
});

describe("durable project storage", () => {
  it("uses a blank workspace only when no record exists", async () => {
    const { loadData } = await import("../src/services/storage");
    storage.getItem.mockResolvedValue(null);
    expect(await loadData()).toEqual(blankData());
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "{broken",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ ...blankData(), projects: [{}] }),
  ])("preserves corrupt or incompatible records: %s", async (raw) => {
    const { loadData } = await import("../src/services/storage");
    storage.getItem.mockResolvedValue(raw);
    await expect(loadData()).rejects.toThrow("Nothing has been erased");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("does not mistake unavailable storage for first launch", async () => {
    const { loadData } = await import("../src/services/storage");
    storage.getItem.mockRejectedValue(new Error("disk unavailable"));
    await expect(loadData()).rejects.toThrow("has not been reset");
  });
  it("rejects invalid changes before writing anything", async () => {
    const { saveData } = await import("../src/services/storage");
    await expect(
      saveData({ ...blankData(), displayName: "x".repeat(61) }),
    ).rejects.toThrow("invalid");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("serializes writes in invocation order and captures each object immediately", async () => {
    const { saveData } = await import("../src/services/storage");
    let finishFirst!: () => void;
    storage.setItem.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    );
    const original = { ...blankData(), displayName: "First" };
    const first = saveData(original);
    original.displayName = "Mutated";
    const second = saveData({ ...blankData(), displayName: "Second" });
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.setItem.mock.calls[0][1]).displayName).toBe(
      "First",
    );
    finishFirst();
    await Promise.all([first, second]);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.setItem.mock.calls[1][1]).displayName).toBe(
      "Second",
    );
  });
  it("reports a failed write and allows the next save to succeed", async () => {
    const { saveData, loadData } = await import("../src/services/storage");
    storage.setItem.mockRejectedValueOnce(new Error("quota exceeded"));
    await expect(saveData(blankData())).rejects.toThrow("export a backup");
    const next = { ...blankData(), displayName: "Recovered" };
    await expect(saveData(next)).resolves.toBeUndefined();
    storage.getItem.mockResolvedValue(JSON.stringify(next));
    expect(await loadData()).toEqual(next);
  });
});

describe("native storage generations", () => {
  function nativeMap() {
    storage.platform.OS = "android";
    const rows = new Map<string, string>();
    storage.getItem.mockImplementation(async (key) => rows.get(key) ?? null);
    storage.setItem.mockImplementation(async (key, value) => {
      rows.set(key, value);
    });
    storage.removeItem.mockImplementation(async (key) => {
      rows.delete(key);
    });
    return rows;
  }
  async function largeData(count = 250) {
    const { createProject } = await import("../src/domain/projects");
    const project = createProject(
      {
        title: "Big project",
        category: "Art",
        description: "",
        energy: "gentle",
        nextMinutes: 10,
        nextStep: "Begin",
        materials: "",
      },
      "p",
      "2026-09-16T00:00:00.000Z",
    );
    project.checkpoints = Array.from({ length: count }, (_, i) => ({
      ...project.checkpoints[0],
      id: `c${i}`,
      stoppedAt: "🎨".repeat(2000),
      nextStep: "n".repeat(1000),
      materials: "m".repeat(2000),
      blocker: "b".repeat(2000),
    }));
    return { ...blankData(), projects: [project] };
  }
  it("round-trips more than 2 MB of Unicode records with every native row under 256 KiB", async () => {
    const rows = nativeMap();
    const { saveData, loadData, CHUNK_BYTES } =
      await import("../src/services/storage");
    const value = await largeData();
    expect(Buffer.byteLength(JSON.stringify(value))).toBeGreaterThan(2_000_000);
    await saveData(value);
    for (const row of rows.values())
      expect(Buffer.byteLength(row)).toBeLessThanOrEqual(CHUNK_BYTES);
    expect(await loadData()).toEqual(value);
  });
  it("preserves the prior generation on a failed pointer commit and deletes incomplete new chunks", async () => {
    const rows = nativeMap();
    const { saveData, loadData, NATIVE_MANIFEST_KEY } =
      await import("../src/services/storage");
    await saveData({ ...blankData(), displayName: "Previous" });
    const original = new Map(rows);
    storage.setItem.mockImplementation(async (key, value) => {
      if (key === NATIVE_MANIFEST_KEY) throw new Error("Disk full");
      rows.set(key, value);
    });
    await expect(saveData(await largeData())).rejects.toThrow(
      "could not be saved",
    );
    expect(rows).toEqual(original);
    expect((await loadData()).displayName).toBe("Previous");
  });
  it("preserves legacy data until successful migration and removes obsolete rows after commit", async () => {
    const rows = nativeMap();
    const { saveData, loadData, STORAGE_KEY } =
      await import("../src/services/storage");
    rows.set(
      STORAGE_KEY,
      JSON.stringify({ ...blankData(), displayName: "Legacy" }),
    );
    storage.setItem.mockRejectedValueOnce(new Error("Disk full"));
    await expect(saveData(blankData())).rejects.toThrow("could not be saved");
    expect((await loadData()).displayName).toBe("Legacy");
    await saveData(blankData());
    expect(rows.has(STORAGE_KEY)).toBe(false);
    expect(await loadData()).toEqual(blankData());
  });
  it("reports missing chunks without overwriting data, and allows explicit recovery", async () => {
    const rows = nativeMap();
    const { saveData, loadData, NATIVE_MANIFEST_KEY } =
      await import("../src/services/storage");
    await saveData(blankData());
    rows.delete("@unpause/data/v1/g/generation-1/0");
    await expect(loadData()).rejects.toThrow("has not been reset");
    expect(rows.has(NATIVE_MANIFEST_KEY)).toBe(true);
    rows.set(NATIVE_MANIFEST_KEY, "{broken");
    await saveData({ ...blankData(), displayName: "Restored" });
    expect((await loadData()).displayName).toBe("Restored");
  });
  it("enforces the 20 MB total limit before mutating the current workspace", async () => {
    const rows = nativeMap();
    const { saveData, loadData } = await import("../src/services/storage");
    await saveData(blankData());
    const before = new Map(rows);
    await expect(saveData(await largeData(1900))).rejects.toThrow("20 MB");
    expect(rows).toEqual(before);
    expect(await loadData()).toEqual(blankData());
  });
  it("rejects an unexportable photo budget before writing new rows or changing the pointer", async () => {
    const rows = nativeMap();
    const { saveData, loadData } = await import("../src/services/storage");
    await saveData({ ...blankData(), displayName: "Previous" });
    const before = new Map(rows);
    storage.budget.mockRejectedValueOnce(
      new Error("These photos would make your backup too large."),
    );
    await expect(saveData(blankData())).rejects.toThrow("backup too large");
    expect(rows).toEqual(before);
    expect((await loadData()).displayName).toBe("Previous");
  });
});
