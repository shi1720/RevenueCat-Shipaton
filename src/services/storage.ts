import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { randomUUID } from "expo-crypto";
import { appDataSchema, blankData } from "../domain/projects";
import type { AppData } from "../domain/types";

export const STORAGE_KEY = "@unpause/data/v1";
export const NATIVE_MANIFEST_KEY = `${STORAGE_KEY}/manifest`;
export const MAX_DATA_BYTES = 20_000_000;
export const CHUNK_BYTES = 256 * 1024;
const CHUNK_PREFIX = `${STORAGE_KEY}/g/`;
let writes: Promise<void> = Promise.resolve();
type Manifest = {
  version: 1;
  generation: string;
  count: number;
  bytes: number;
};

function byteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0)!;
    bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4;
  }
  return bytes;
}
function chunksFor(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  let position = 0;
  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0)!;
    const size = point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4;
    if (bytes + size > CHUNK_BYTES) {
      chunks.push(text.slice(start, position));
      start = position;
      bytes = 0;
    }
    bytes += size;
    position += char.length;
  }
  chunks.push(text.slice(start));
  return chunks;
}
function manifestFrom(raw: string | null): Manifest | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object")
    throw new Error("Invalid storage manifest");
  const m = value as Partial<Manifest>;
  if (
    m.version !== 1 ||
    typeof m.generation !== "string" ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(m.generation) ||
    typeof m.count !== "number" ||
    !Number.isInteger(m.count) ||
    m.count < 1 ||
    m.count > 100 ||
    typeof m.bytes !== "number" ||
    !Number.isInteger(m.bytes) ||
    m.bytes < 1 ||
    m.bytes > MAX_DATA_BYTES
  )
    throw new Error("Invalid storage manifest");
  return m as Manifest;
}
const chunkKey = (manifest: Manifest, index: number) =>
  `${CHUNK_PREFIX}${manifest.generation}/${index}`;

async function readNative(): Promise<string | null> {
  const manifest = manifestFrom(
    await AsyncStorage.getItem(NATIVE_MANIFEST_KEY),
  );
  if (!manifest) return AsyncStorage.getItem(STORAGE_KEY);
  const chunks: string[] = [];
  for (let i = 0; i < manifest.count; i++) {
    const chunk = await AsyncStorage.getItem(chunkKey(manifest, i));
    if (chunk === null || byteLength(chunk) > CHUNK_BYTES)
      throw new Error("Missing or invalid storage chunk");
    chunks.push(chunk);
  }
  const text = chunks.join("");
  if (byteLength(text) !== manifest.bytes)
    throw new Error("Incomplete storage generation");
  return text;
}
async function removeGeneration(manifest: Manifest): Promise<void> {
  await Promise.allSettled(
    Array.from({ length: manifest.count }, (_, index) =>
      AsyncStorage.removeItem(chunkKey(manifest, index)),
    ),
  );
}
async function writeNative(serialized: string, bytes: number): Promise<void> {
  let previous: Manifest | null = null;
  const previousRaw = await AsyncStorage.getItem(NATIVE_MANIFEST_KEY);
  // Explicit recovery can replace malformed manifests; old unknown chunks stay untouched.
  try {
    previous = manifestFrom(previousRaw);
  } catch {
    /* retain unknown old data */
  }
  const chunks = chunksFor(serialized);
  const next: Manifest = {
    version: 1,
    generation: randomUUID(),
    count: chunks.length,
    bytes,
  };
  try {
    for (let i = 0; i < chunks.length; i++)
      await AsyncStorage.setItem(chunkKey(next, i), chunks[i]);
    // The small atomic pointer is the commit. Until then the previous generation
    // or legacy row remains readable. Never overwrite existing chunks in place.
    await AsyncStorage.setItem(NATIVE_MANIFEST_KEY, JSON.stringify(next));
  } catch (error) {
    await removeGeneration(next);
    throw error;
  }
  if (previous) await removeGeneration(previous);
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}
export async function loadData(): Promise<AppData> {
  await writes;
  let raw: string | null;
  try {
    raw =
      Platform.OS === "web"
        ? await AsyncStorage.getItem(STORAGE_KEY)
        : await readNative();
  } catch {
    throw new Error(
      "Your projects could not be read. Check available device storage and reopen Unpause. Your saved data has not been reset. Restore a valid backup if the saved record is damaged.",
    );
  }
  if (raw === null) return blankData();
  try {
    return appDataSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error(
      "Your saved projects could not be opened because the data is damaged or from an unsupported version. Nothing has been erased. Restore a valid Unpause backup or contact support before clearing app storage.",
    );
  }
}
export function saveData(data: AppData): Promise<void> {
  let serialized: string;
  let snapshot: AppData;
  try {
    snapshot = appDataSchema.parse(data);
    serialized = JSON.stringify(snapshot);
  } catch {
    return Promise.reject(
      new Error(
        "These project changes are invalid and were not saved. Your previous saved data is unchanged.",
      ),
    );
  }
  const bytes = byteLength(serialized);
  if (bytes > MAX_DATA_BYTES)
    return Promise.reject(
      new Error(
        "Your project data exceeds the 20 MB workspace limit. Export a backup and reduce older content before saving. Your previous saved data is unchanged.",
      ),
    );
  const next = writes.then(async () => {
    if (Platform.OS !== "web") {
      const { assertPortableBudget } = await import("./media");
      await assertPortableBudget(snapshot);
    }
    try {
      if (Platform.OS === "web")
        await AsyncStorage.setItem(STORAGE_KEY, serialized);
      else await writeNative(serialized, bytes);
    } catch {
      throw new Error(
        "Your latest changes could not be saved. Free some device storage and try again. Keep Unpause open and export a backup to preserve your latest work.",
      );
    }
  });
  writes = next.catch(() => undefined);
  return next;
}
