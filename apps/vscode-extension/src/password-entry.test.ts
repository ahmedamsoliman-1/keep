import type { PasswordItemDto } from "@keephq/api-contract";
import { encryptPasswordItem } from "@keephq/crypto";
import { getNodeCryptoProvider } from "@keephq/crypto/node";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decryptPasswordEntry, type PasswordEntry } from "./password-entry";

const provider = getNodeCryptoProvider();

async function makeDto(
  vaultKey: Uint8Array,
  entry: PasswordEntry,
): Promise<PasswordItemDto> {
  const vaultId = randomUUID();
  const itemId = randomUUID();
  const payload = await encryptPasswordItem(
    provider,
    vaultKey,
    JSON.stringify(entry),
    { vaultId, itemId, encryptionVersion: 1 },
  );
  return {
    id: itemId,
    vaultId,
    version: 0,
    encryptedData: payload.ciphertext,
    encryptionIv: payload.iv,
    encryptionVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("decryptPasswordEntry", () => {
  const vaultKey = new Uint8Array(32).fill(7);

  it("round-trips a full entry through the node provider", async () => {
    const entry: PasswordEntry = {
      title: "GitHub",
      url: "https://github.com",
      username: "octocat",
      password: "s3cr3t!",
      notes: "work account",
      folder: "dev",
      tags: ["vcs", "work"],
      favorite: true,
    };
    const dto = await makeDto(vaultKey, entry);
    await expect(decryptPasswordEntry(vaultKey, dto)).resolves.toEqual(entry);
  });

  it("normalizes missing fields to safe defaults", async () => {
    const dto = await makeDto(vaultKey, {
      title: "Only title",
      url: "",
      username: "",
      password: "",
      notes: "",
      folder: null,
      tags: [],
      favorite: false,
    });
    const decrypted = await decryptPasswordEntry(vaultKey, dto);
    expect(decrypted.folder).toBeNull();
    expect(decrypted.tags).toEqual([]);
    expect(decrypted.favorite).toBe(false);
  });

  it("rejects when the vault key is wrong (AAD/GCM tag mismatch)", async () => {
    const dto = await makeDto(vaultKey, {
      title: "x",
      url: "",
      username: "",
      password: "p",
      notes: "",
      folder: null,
      tags: [],
      favorite: false,
    });
    const wrongKey = new Uint8Array(32).fill(9);
    await expect(decryptPasswordEntry(wrongKey, dto)).rejects.toBeDefined();
  });
});
