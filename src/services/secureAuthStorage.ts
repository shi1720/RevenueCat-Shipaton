import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

type Manifest = { generation: string; count: number };
const secureOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
const secureKey = (key: string) =>
  `unpause.${key.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
function parseManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (
    typeof value !== "object" ||
    value === null ||
    !("generation" in value) ||
    !("count" in value) ||
    typeof value.generation !== "string" ||
    !/^[a-zA-Z0-9-]+$/.test(value.generation) ||
    typeof value.count !== "number" ||
    !Number.isInteger(value.count) ||
    value.count < 1 ||
    value.count > 1024
  ) {
    throw new Error(
      "Saved account session could not be read. Your local projects are safe.",
    );
  }
  return { generation: value.generation, count: value.count };
}
async function removeChunks(key: string, manifest: Manifest | null) {
  if (!manifest) return;
  await Promise.allSettled(
    Array.from({ length: manifest.count }, (_, i) =>
      SecureStore.deleteItemAsync(
        `${key}.${manifest.generation}.${i}`,
        secureOptions,
      ),
    ),
  );
}

// Tokens are encrypted by the OS on native. A small atomic manifest switches
// generations only after every chunk is durable, preserving old data on failure.
// 400 Unicode codepoints remain below SecureStore's historical 2048-byte item
// limit and never split a surrogate pair while crossing the native bridge.
export const nativeStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = secureKey(rawKey);
    const manifest = parseManifest(
      await SecureStore.getItemAsync(key, secureOptions),
    );
    if (!manifest) return null;
    const chunks = await Promise.all(
      Array.from({ length: manifest.count }, (_, i) =>
        SecureStore.getItemAsync(
          `${key}.${manifest.generation}.${i}`,
          secureOptions,
        ),
      ),
    );
    if (chunks.some((chunk) => chunk === null))
      throw new Error(
        "Saved account session is incomplete. Your local projects are safe.",
      );
    return chunks.join("");
  },
  async setItem(rawKey: string, value: string): Promise<void> {
    const key = secureKey(rawKey);
    const previous = parseManifest(
      await SecureStore.getItemAsync(key, secureOptions),
    );
    const characters = Array.from(value);
    const manifest = {
      generation: Crypto.randomUUID(),
      count: Math.max(1, Math.ceil(characters.length / 400)),
    };
    if (manifest.count > 1024)
      throw new Error("Account session exceeds secure storage limits.");
    try {
      for (let i = 0; i < manifest.count; i++) {
        await SecureStore.setItemAsync(
          `${key}.${manifest.generation}.${i}`,
          characters.slice(i * 400, (i + 1) * 400).join(""),
          secureOptions,
        );
      }
      await SecureStore.setItemAsync(
        key,
        JSON.stringify(manifest),
        secureOptions,
      );
    } catch (error) {
      await removeChunks(key, manifest);
      throw error;
    }
    await removeChunks(key, previous);
  },
  async removeItem(rawKey: string): Promise<void> {
    const key = secureKey(rawKey);
    const previous = parseManifest(
      await SecureStore.getItemAsync(key, secureOptions),
    );
    await SecureStore.deleteItemAsync(key, secureOptions);
    await removeChunks(key, previous);
  },
};
