import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankData, createProject } from "../src/domain/projects";

const mocks = vi.hoisted(() => ({
  platform: { OS: "android" },
  files: new Map<string, string>(),
  generation: 0,
  pickDocument: vi.fn(),
  pickImage: vi.fn(),
  camera: vi.fn(),
  permission: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  info: vi.fn(),
  readDir: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo-crypto", () => ({
  randomUUID: () =>
    `00000000-0000-4000-8000-${String(++mocks.generation).padStart(12, "0")}`,
}));
vi.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: mocks.pickImage,
  launchCameraAsync: mocks.camera,
  requestCameraPermissionsAsync: mocks.permission,
}));
vi.mock("expo-document-picker", () => ({
  getDocumentAsync: mocks.pickDocument,
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///app/documents/",
  cacheDirectory: "file:///app/cache/",
  EncodingType: { Base64: "base64", UTF8: "utf8" },
  makeDirectoryAsync: vi.fn(),
  readAsStringAsync: mocks.read,
  writeAsStringAsync: mocks.write,
  deleteAsync: mocks.remove,
  getInfoAsync: mocks.info,
  readDirectoryAsync: mocks.readDir,
}));
const directory = "file:///app/documents/unpause-photos/";
const photoPath = (i: number) =>
  `${directory}00000000-0000-4000-8000-${String(i).padStart(12, "0")}.jpg`;
const embedded = "data:image/jpeg;base64,/9j/AA==";
const project = () =>
  createProject(
    {
      title: "Tote",
      category: "Sewing",
      description: "",
      energy: "gentle",
      nextMinutes: 10,
      nextStep: "Pin straps",
      materials: "",
    },
    "p",
    "2026-09-16T00:00:00.000Z",
  );

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.platform.OS = "android";
  mocks.files.clear();
  mocks.generation = 0;
  mocks.write.mockImplementation(async (uri, data) => {
    mocks.files.set(uri, data);
  });
  mocks.remove.mockImplementation(async (uri) => {
    mocks.files.delete(uri);
  });
  mocks.info.mockImplementation(async (uri) => ({
    exists: uri === directory || mocks.files.has(uri),
    isDirectory: uri === directory,
    size: 10,
  }));
  mocks.readDir.mockImplementation(async () =>
    [...mocks.files.keys()]
      .filter((uri) => uri.startsWith(directory))
      .map((uri) => uri.slice(directory.length)),
  );
  mocks.pickDocument.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///app/cache/backup.json", size: 1000 }],
  });
});

describe("portable media and scoped cleanup", () => {
  it("deletes only owned unused UUID files and preserves cover/history references and other files", async () => {
    const p = project();
    p.coverUri = photoPath(1);
    p.checkpoints[0].photoUri = photoPath(2);
    for (const uri of [
      photoPath(1),
      photoPath(2),
      photoPath(3),
      `${directory}unrelated.txt`,
      "file:///app/documents/other.jpg",
    ])
      mocks.files.set(uri, "photo");
    const { clearUnusedPhotos } = await import("../src/services/media");
    await clearUnusedPhotos([p]);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(photoPath(3), {
      idempotent: true,
    });
    expect(mocks.files.size).toBe(4);
  });
  it("cannot delete paths outside the owned directory or traverse out of it", async () => {
    const { discardUnusedPhoto } = await import("../src/services/media");
    for (const uri of [
      "file:///private/credentials.jpg",
      `${directory}../other.jpg`,
      `${directory}%2e%2e/other.jpg`,
      `${directory}arbitrary.jpg`,
    ])
      await discardUnusedPhoto(uri, []);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("protects current projects when abandoning imported files or draft photos", async () => {
    const current = project();
    current.coverUri = photoPath(1);
    const candidate = project();
    candidate.coverUri = photoPath(2);
    candidate.checkpoints[0].photoUri = photoPath(1);
    const { discardImportedPhotos, discardUnusedPhoto } =
      await import("../src/services/media");
    await discardImportedPhotos({ ...blankData(), projects: [candidate] }, [
      current,
    ]);
    await discardUnusedPhoto(photoPath(1), [current]);
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(photoPath(2), {
      idempotent: true,
    });
  });
  it("reports cleanup failures rather than claiming images were erased", async () => {
    mocks.files.set(photoPath(1), "photo");
    mocks.remove.mockRejectedValue(new Error("Permission denied"));
    const { clearUnusedPhotos } = await import("../src/services/media");
    await expect(clearUnusedPhotos([])).rejects.toThrow("could not be removed");
    expect(mocks.files.has(photoPath(1))).toBe(true);
  });
  it("validates the entire backup before materializing any native photo", async () => {
    const good = project();
    good.coverUri = embedded;
    const bad = {
      ...project(),
      id: "bad",
      coverUri: "file:///private/other-device.jpg",
    };
    mocks.read.mockResolvedValue(
      JSON.stringify({ ...blankData(), projects: [good, bad] }),
    );
    const { importBackup } = await import("../src/services/media");
    await expect(importBackup()).rejects.toThrow("another device");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("materializes shared embedded photos once and exposes explicit cancellation cleanup", async () => {
    const p = project();
    p.coverUri = embedded;
    p.checkpoints[0].photoUri = embedded;
    mocks.read.mockResolvedValue(
      JSON.stringify({ ...blankData(), projects: [p] }),
    );
    const { importBackup, discardImportedPhotos } =
      await import("../src/services/media");
    const imported = await importBackup();
    expect(imported?.projects[0].coverUri).toBe(photoPath(1));
    expect(imported?.projects[0].checkpoints[0].photoUri).toBe(photoPath(1));
    expect(mocks.write).toHaveBeenCalledOnce();
    await discardImportedPhotos(imported!, []);
    expect(mocks.files.size).toBe(0);
  });
  it("cleans both completed and partially written files after a restore fails", async () => {
    const p = project();
    p.coverUri = embedded;
    p.checkpoints[0].photoUri = "data:image/jpeg;base64,/9j/BB==";
    mocks.read.mockResolvedValue(
      JSON.stringify({ ...blankData(), projects: [p] }),
    );
    mocks.write.mockImplementation(async (uri, data) => {
      mocks.files.set(uri, data);
      if (uri === photoPath(2)) throw new Error("Disk full");
    });
    const { importBackup } = await import("../src/services/media");
    await expect(importBackup()).rejects.toThrow("could not be restored");
    expect(mocks.files.size).toBe(0);
  });
  it("rejects per-photo and overall oversize imports before writing files", async () => {
    const p = project();
    p.coverUri = "data:image/jpeg;base64," + "A".repeat(6_700_000);
    mocks.read.mockResolvedValue(
      JSON.stringify({ ...blankData(), projects: [p] }),
    );
    const { importBackup } = await import("../src/services/media");
    await expect(importBackup()).rejects.toThrow("5 MB");
    mocks.pickDocument.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///app/cache/backup.json", size: 30_000_001 }],
    });
    await expect(importBackup()).rejects.toThrow("larger than 30 MB");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("treats picker cancellation and declined camera permission honestly", async () => {
    mocks.pickImage.mockResolvedValue({ canceled: true });
    mocks.permission.mockResolvedValue({ granted: false });
    const { pickPhoto } = await import("../src/services/media");
    expect(await pickPhoto()).toBeNull();
    await expect(pickPhoto("camera")).rejects.toThrow(
      "Camera permission is off",
    );
    expect(mocks.camera).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("makes cleanup a no-op on web, where photos live inside the replaced record", async () => {
    mocks.platform.OS = "web";
    const { clearUnusedPhotos, discardUnusedPhoto } =
      await import("../src/services/media");
    await clearUnusedPhotos([]);
    await discardUnusedPhoto(photoPath(1), []);
    expect(mocks.readDir).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("counts repeated cover/history references toward portable capacity but stats each photo once", async () => {
    const p = project();
    p.coverUri = photoPath(1);
    p.checkpoints = Array.from({ length: 4 }, (_, i) => ({
      ...p.checkpoints[0],
      id: `c${i}`,
      photoUri: photoPath(1),
    }));
    mocks.info.mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 5_000_000,
    });
    const { assertPortableBudget } = await import("../src/services/media");
    await expect(
      assertPortableBudget({ ...blankData(), projects: [p] }),
    ).rejects.toThrow("backup too large");
    expect(mocks.info).toHaveBeenCalledOnce();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("accepts a portable archive below 28 MB and rejects missing native photos", async () => {
    const p = project();
    p.coverUri = photoPath(1);
    p.checkpoints[0].photoUri = photoPath(1);
    mocks.info.mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 5_000_000,
    });
    const { assertPortableBudget } = await import("../src/services/media");
    await expect(
      assertPortableBudget({ ...blankData(), projects: [p] }),
    ).resolves.toBeUndefined();
    mocks.info.mockResolvedValue({ exists: false });
    await expect(
      assertPortableBudget({ ...blankData(), projects: [p] }),
    ).rejects.toThrow("photo is missing");
  });
});
