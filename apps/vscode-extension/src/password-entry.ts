import type { PasswordItemDto } from "@keephq/api-contract";
import { decryptPasswordItem } from "@keephq/crypto";

import { cryptoProvider } from "./crypto";

/**
 * The decrypted shape of a password entry. The whole object is encrypted
 * client-side into one opaque blob; the server never sees any of these fields.
 * Mirrors the website's `lib/password-entry.ts`, but runs on the Node crypto
 * provider inside the extension host.
 */
export interface PasswordEntry {
  title: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  folder: string | null;
  tags: string[];
  favorite: boolean;
}

function normalizeEntry(value: unknown): PasswordEntry {
  const source = (value ?? {}) as Record<string, unknown>;
  const asString = (input: unknown) => (typeof input === "string" ? input : "");
  return {
    title: asString(source.title),
    url: asString(source.url),
    username: asString(source.username),
    password: asString(source.password),
    notes: asString(source.notes),
    folder: typeof source.folder === "string" ? source.folder : null,
    tags: Array.isArray(source.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    favorite: source.favorite === true,
  };
}

/** Decrypts a password entry locally using the in-memory vault key. */
export async function decryptPasswordEntry(
  vaultKey: Uint8Array,
  dto: PasswordItemDto,
): Promise<PasswordEntry> {
  const json = await decryptPasswordItem(
    cryptoProvider,
    vaultKey,
    {
      version: 1,
      algorithm: "AES-GCM",
      ciphertext: dto.encryptedData,
      iv: dto.encryptionIv,
      additionalDataVersion: 1,
    },
    {
      vaultId: dto.vaultId,
      itemId: dto.id,
      encryptionVersion: dto.encryptionVersion,
    },
  );
  return normalizeEntry(JSON.parse(json));
}
