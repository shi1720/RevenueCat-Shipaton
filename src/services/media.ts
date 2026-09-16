import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { randomUUID } from "expo-crypto";
import { appDataSchema, parseBackup } from "../domain/projects";
import type { AppData, Project } from "../domain/types";

const MAX_PHOTO_BYTES = 5_000_000;
const MAX_BACKUP_BYTES = 30_000_000;
export const MAX_PORTABLE_BYTES = 28_000_000;
const portablePhoto =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const photosDirectory = () => {
  if (!FileSystem.documentDirectory)
    throw new Error("Photo storage is unavailable on this device.");
  return `${FileSystem.documentDirectory}unpause-photos/`;
};

function referencedPhotos(projects: Project[]): Set<string> {
  return new Set(
    projects
      .flatMap((project) => [
        project.coverUri,
        ...project.checkpoints.map((point) => point.photoUri),
      ])
      .filter((uri): uri is string => Boolean(uri)),
  );
}

function ownedPhoto(uri: string): boolean {
  if (Platform.OS === "web" || !uri.startsWith(photosDirectory())) return false;
  const name = uri.slice(photosDirectory().length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(
    name,
  );
}

async function removeOwnedPhotos(
  uris: Iterable<string>,
  protectedProjects: Project[],
): Promise<void> {
  if (Platform.OS === "web") return;
  const protectedPhotos = referencedPhotos(protectedProjects);
  const targets = [...new Set(uris)].filter(
    (uri) => ownedPhoto(uri) && !protectedPhotos.has(uri),
  );
  const results = await Promise.allSettled(
    targets.map((uri) => FileSystem.deleteAsync(uri, { idempotent: true })),
  );
  if (results.some((result) => result.status === "rejected"))
    throw new Error(
      "Some unused photos could not be removed from this device. Your saved project records are unchanged. Free some storage and try the cleanup again.",
    );
}

/** Call only after a successful, explicit delete/erase/import record commit. */
export async function clearUnusedPhotos(projects: Project[]): Promise<void> {
  if (Platform.OS === "web") return;
  const directory = photosDirectory();
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) return;
  const files = await FileSystem.readDirectoryAsync(directory);
  await removeOwnedPhotos(
    files.map((name) => `${directory}${name}`),
    projects,
  );
}

/** Discard a canceled/failed import's unique new files; preserve every current reference. */
export async function discardImportedPhotos(
  imported: AppData,
  protectedProjects: Project[],
): Promise<void> {
  await removeOwnedPhotos(
    referencedPhotos(imported.projects),
    protectedProjects,
  );
}

/** Use when a draft is abandoned or its newly picked photo is replaced. */
export async function discardUnusedPhoto(
  uri: string | undefined,
  protectedProjects: Project[],
): Promise<void> {
  if (uri) await removeOwnedPhotos([uri], protectedProjects);
}

async function saveEmbeddedPhoto(uri: string): Promise<string> {
  if (!portablePhoto.test(uri))
    throw new Error("A backup photo has an unsupported or damaged format.");
  const directory = photosDirectory();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const extension =
    uri.slice(11, uri.indexOf(";")) === "jpeg"
      ? "jpg"
      : uri.slice(11, uri.indexOf(";"));
  const path = `${directory}${randomUUID()}.${extension}`;
  try {
    await FileSystem.writeAsStringAsync(path, uri.slice(uri.indexOf(",") + 1), {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (error) {
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(
      () => undefined,
    );
    throw error;
  }
  return path;
}

async function compressWebPhoto(
  asset: ImagePicker.ImagePickerAsset,
): Promise<string> {
  if (asset.file && asset.file.size > 25_000_000)
    throw new Error("Choose an image smaller than 25 MB.");
  const source = asset.file ? URL.createObjectURL(asset.file) : asset.uri;
  try {
    const photo = new Image();
    await new Promise<void>((resolve, reject) => {
      photo.onload = () => resolve();
      photo.onerror = () =>
        reject(
          new Error("This image could not be opened. Try a JPEG or PNG photo."),
        );
      photo.src = source;
    });
    const scale = Math.min(
      1,
      1600 / Math.max(photo.naturalWidth, photo.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } finally {
    if (asset.file) URL.revokeObjectURL(source);
  }
}

export async function pickPhoto(
  source: "library" | "camera" = "library",
): Promise<string | null> {
  // The system's selected-photo picker avoids asking for access to the whole library.
  if (source === "camera") {
    if (Platform.OS === "web")
      throw new Error(
        "Camera capture is available in the mobile app. Choose a photo from your library here.",
      );
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Camera permission is off. You can enable it in Settings or choose a photo instead.",
      );
  }
  const launch =
    source === "camera"
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
  const result = await launch({
    mediaTypes: ["images"],
    quality: 0.6,
    base64: Platform.OS !== "web",
    exif: false,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const embedded =
    Platform.OS === "web"
      ? await compressWebPhoto(asset)
      : asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : null;
  if (!embedded)
    throw new Error(
      "This photo could not be prepared. Try a JPEG or PNG image.",
    );
  if (embedded.length * 0.75 > MAX_PHOTO_BYTES)
    throw new Error(
      "This photo is still larger than 5 MB after compression. Choose a smaller photo.",
    );
  return Platform.OS === "web" ? embedded : saveEmbeddedPhoto(embedded);
}

function byteLength(value: string): number {
  // No browser-only TextEncoder dependency or extra full-size buffer on mobile.
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** Reserve room for a complete portable backup before committing native records.
 * Count repeated cover/history references because v1 JSON embeds each reference.
 * Only stat file sizes; never read full photo buffers just to check capacity.
 */
export async function assertPortableBudget(data: AppData): Promise<void> {
  if (Platform.OS === "web") return; // Web's complete embedded record has a stricter 20 MB storage limit.
  let bytes = byteLength(JSON.stringify(data));
  const encoded = new Map<string, number>();
  for (const project of data.projects) {
    for (const uri of [
      project.coverUri,
      ...project.checkpoints.map((point) => point.photoUri),
    ]) {
      if (!uri || uri.startsWith("data:")) continue;
      let replacement = encoded.get(uri);
      if (replacement === undefined) {
        if (!ownedPhoto(uri))
          throw new Error(
            "A project photo is not in durable Unpause storage. Replace or remove it before saving.",
          );
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.isDirectory || !Number.isFinite(info.size))
          throw new Error(
            "A saved project photo is missing. Replace or remove it before saving.",
          );
        if (info.size > MAX_PHOTO_BYTES)
          throw new Error(
            "A project photo exceeds the 5 MB limit. Choose a smaller photo.",
          );
        const extension = uri.split(".").pop()?.toLowerCase();
        const mime =
          extension === "png" ? "png" : extension === "webp" ? "webp" : "jpeg";
        replacement =
          4 * Math.ceil(info.size / 3) +
          `data:image/${mime};base64,`.length +
          2;
        encoded.set(uri, replacement);
      }
      bytes += replacement - byteLength(JSON.stringify(uri));
    }
  }
  if (bytes > MAX_PORTABLE_BYTES)
    throw new Error(
      "These photos would make your backup too large. Use a smaller photo or remove an older one. Your previous saved projects have not changed.",
    );
}

async function downloadOrShare(
  text: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  if (Platform.OS === "web") {
    const uri = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const anchor = document.createElement("a");
    anchor.href = uri;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Give browsers time to read the object URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(uri), 60_000);
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, text, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: "Save or share from Unpause",
    UTI: mimeType === "application/json" ? "public.json" : "public.plain-text",
  });
}

async function embedPhoto(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith("data:")) {
    if (!portablePhoto.test(uri))
      throw new Error(
        "A photo is damaged. Replace that photo before exporting.",
      );
    return uri;
  }
  if (uri.startsWith("https://"))
    throw new Error(
      "Backups must contain photos, not remote links. Reattach this photo from your library.",
    );
  if (
    Platform.OS === "web" ||
    !uri.startsWith(photosDirectory()) ||
    uri.includes("/../")
  )
    throw new Error(
      "A photo is not in durable Unpause storage. Reattach it before exporting your backup.",
    );
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory)
    throw new Error(
      "A saved photo is missing. Reattach it before exporting your backup.",
    );
  if (info.size > MAX_PHOTO_BYTES)
    throw new Error("A saved photo exceeds the 5 MB backup limit.");
  const extension = uri.split(".").pop()?.toLowerCase();
  const mime =
    extension === "png" ? "png" : extension === "webp" ? "webp" : "jpeg";
  return `data:image/${mime};base64,${await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })}`;
}

export async function exportBackup(data: AppData): Promise<void> {
  const safe = parseBackup(JSON.stringify(appDataSchema.parse(data)));
  const memo = new Map<string, string>();
  let embeddedBytes = 0;
  const photo = async (uri?: string) => {
    if (!uri) return undefined;
    const value = memo.get(uri) || (await embedPhoto(uri));
    if (value) {
      memo.set(uri, value);
      embeddedBytes += value.length;
    }
    if (embeddedBytes > MAX_BACKUP_BYTES)
      throw new Error(
        "Your backup exceeds 30 MB. Remove a large cover or checkpoint photo, then try exporting again.",
      );
    return value;
  };
  for (const project of safe.projects) {
    project.coverUri = await photo(project.coverUri);
    for (const checkpoint of project.checkpoints)
      checkpoint.photoUri = await photo(checkpoint.photoUri);
  }
  const serialized = JSON.stringify(safe);
  if (byteLength(serialized) > MAX_BACKUP_BYTES)
    throw new Error(
      "Your backup exceeds the 30 MB limit. Reduce attached photos and try again.",
    );
  await downloadOrShare(
    serialized,
    `unpause-backup-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
  );
}

export async function importBackup(): Promise<AppData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
    base64: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if ((asset.size ?? asset.file?.size ?? 0) > MAX_BACKUP_BYTES)
    throw new Error(
      "This backup is larger than 30 MB. Choose a smaller Unpause backup.",
    );
  const raw =
    Platform.OS === "web"
      ? asset.file
        ? await asset.file.text()
        : await (await fetch(asset.uri)).text()
      : await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
  if (byteLength(raw) > MAX_BACKUP_BYTES)
    throw new Error("This backup is larger than 30 MB.");
  let data: AppData;
  try {
    data = parseBackup(raw);
  } catch {
    throw new Error(
      "This file is not a valid Unpause backup. Your existing projects have not been changed.",
    );
  }
  for (const project of data.projects) {
    const allPhotos = [
      project.coverUri,
      ...project.checkpoints.map((c) => c.photoUri),
    ].filter((uri): uri is string => !!uri);
    if (allPhotos.some((uri) => !portablePhoto.test(uri)))
      throw new Error(
        "This backup contains photos that only exist on another device. Export a fresh portable backup from that device. Your projects have not changed.",
      );
    if (
      allPhotos.some(
        (uri) =>
          Math.ceil((uri.length - uri.indexOf(",") - 1) * 0.75) >
          MAX_PHOTO_BYTES,
      )
    )
      throw new Error(
        "A backup photo exceeds the 5 MB photo limit. Your existing projects have not changed.",
      );
  }
  // Native SQLite-backed AsyncStorage has per-row limits. Keep binary images out of it.
  // Create new uniquely named photo files; never overwrite any current workspace files.
  if (Platform.OS !== "web") {
    const restored = new Map<string, string>();
    const restorePhoto = async (uri?: string) => {
      if (!uri?.startsWith("data:")) return uri;
      const existing = restored.get(uri);
      if (existing) return existing;
      const path = await saveEmbeddedPhoto(uri);
      restored.set(uri, path);
      return path;
    };
    try {
      for (const project of data.projects) {
        project.coverUri = await restorePhoto(project.coverUri);
        for (const checkpoint of project.checkpoints)
          checkpoint.photoUri = await restorePhoto(checkpoint.photoUri);
      }
    } catch {
      await Promise.allSettled(
        [...restored.values()].map((uri) =>
          FileSystem.deleteAsync(uri, { idempotent: true }),
        ),
      );
      throw new Error(
        "Backup photos could not be restored. Free some device storage and try again. Your existing projects have not changed.",
      );
    }
  }
  // Return validated data only. The caller explicitly decides when to replace its workspace.
  return data;
}

export async function exportProject(project: Project): Promise<void> {
  const latest = project.checkpoints[0];
  const text = [
    `${project.title} — Unpause project handoff`,
    "",
    `${project.category} · ${project.status}`,
    project.description,
    "",
    "START HERE",
    `Next step: ${latest?.nextStep || "Choose a small next step."}`,
    `Time: ${project.nextMinutes} minutes · Energy: ${project.energy}`,
    `Materials: ${latest?.materials || "None noted"}`,
    `Blocker: ${latest?.blocker || "None noted"}`,
    "",
    "PROJECT TRAIL",
    ...project.checkpoints.flatMap((c) => [
      new Date(c.createdAt).toLocaleString(),
      `Where I stopped: ${c.stoppedAt || "Not noted"}`,
      `Next: ${c.nextStep}`,
      `Materials: ${c.materials || "None noted"}`,
      `Blocker: ${c.blocker || "None noted"}`,
      `Session: ${c.minutes} minutes`,
      "",
    ]),
    `${project.sessionCount} sessions · ${project.totalMinutes} minutes made`,
    "Exported from Unpause. Photos are included in workspace backups, not this text handoff.",
  ].join("\n");
  const slug =
    project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "project";
  await downloadOrShare(text, `unpause-${slug}.txt`, "text/plain");
}
