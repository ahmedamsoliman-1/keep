import "server-only";

import type {
  AuthenticatorTransportFuture,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import type { WrappedVaultKeyV1 } from "@envault/crypto";
import { envaultRedisKey, type EnvaultRedis } from "@envault/redis";

export interface BiometricVaultBinding {
  salt: string;
  wrappedKey: WrappedVaultKeyV1;
  createdAt: string;
}

export interface StoredPasskey {
  id: string;
  userId: string;
  name: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  vaultBindings?: Record<string, BiometricVaultBinding>;
}

const credentialKey = (id: string) => envaultRedisKey("passkey", id);
const userIndexKey = (userId: string) =>
  envaultRedisKey("user", userId, "passkeys");

export class PasskeyRepository {
  public constructor(private readonly redis: EnvaultRedis) {}

  public async list(userId: string) {
    const ids = (await this.redis.get<string[]>(userIndexKey(userId))) ?? [];
    const credentials = await Promise.all(
      ids.map((id) => this.redis.get<StoredPasskey>(credentialKey(id))),
    );
    return credentials.filter(
      (credential): credential is StoredPasskey =>
        credential?.userId === userId,
    );
  }

  public async find(id: string) {
    return this.redis.get<StoredPasskey>(credentialKey(id));
  }

  public async create(
    userId: string,
    name: string,
    credential: WebAuthnCredential,
    deviceType: string,
    backedUp: boolean,
  ) {
    const existing = await this.find(credential.id);
    if (existing) throw new Error("PASSKEY_ALREADY_REGISTERED");
    const timestamp = new Date().toISOString();
    const stored: StoredPasskey = {
      id: credential.id,
      userId,
      name,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports,
      deviceType,
      backedUp,
      createdAt: timestamp,
      lastUsedAt: null,
    };
    const ids = (await this.redis.get<string[]>(userIndexKey(userId))) ?? [];
    await this.redis.set(credentialKey(credential.id), stored);
    await this.redis.set(userIndexKey(userId), [
      ...new Set([...ids, credential.id]),
    ]);
    return stored;
  }

  public async updateCounter(id: string, counter: number) {
    const stored = await this.find(id);
    if (!stored) return;
    await this.redis.set(credentialKey(id), {
      ...stored,
      counter,
      lastUsedAt: new Date().toISOString(),
    } satisfies StoredPasskey);
  }

  public async setVaultBinding(
    id: string,
    vaultId: string,
    binding: BiometricVaultBinding,
  ) {
    const stored = await this.find(id);
    if (!stored) return false;
    await this.redis.set(credentialKey(id), {
      ...stored,
      vaultBindings: { ...stored.vaultBindings, [vaultId]: binding },
    } satisfies StoredPasskey);
    return true;
  }

  public async remove(userId: string, id: string) {
    const stored = await this.find(id);
    if (!stored || stored.userId !== userId) return false;
    const ids = (await this.redis.get<string[]>(userIndexKey(userId))) ?? [];
    await this.redis.del(credentialKey(id));
    await this.redis.set(
      userIndexKey(userId),
      ids.filter((value) => value !== id),
    );
    return true;
  }

  public toWebAuthnCredential(stored: StoredPasskey): WebAuthnCredential {
    return {
      id: stored.id,
      publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
      counter: stored.counter,
      transports: stored.transports,
    };
  }
}
