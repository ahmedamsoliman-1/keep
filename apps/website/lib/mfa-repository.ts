import "server-only";

import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { decryptMfaSecret, encryptMfaSecret, verifyTotp } from "./custom-totp";

interface MfaDocument {
  encryptedSecret: string;
  enabled: boolean;
  lastUsedCounter: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class MfaRepository {
  public constructor(
    private readonly firestore: Firestore,
    private readonly encryptionKey: string,
  ) {}

  private reference(userId: string) {
    return this.firestore
      .collection("users")
      .doc(userId)
      .collection("security")
      .doc("mfa");
  }

  public async status(userId: string) {
    const document = await this.reference(userId).get();
    return { enabled: document.exists && document.get("enabled") === true };
  }

  public async begin(userId: string, secret: string) {
    const now = Timestamp.now();
    await this.reference(userId).set({
      encryptedSecret: encryptMfaSecret(secret, this.encryptionKey),
      enabled: false,
      lastUsedCounter: null,
      createdAt: now,
      updatedAt: now,
    } satisfies MfaDocument);
  }

  public async confirm(userId: string, code: string) {
    return this.verify(userId, code, true);
  }

  public async verify(userId: string, code: string, enable = false) {
    const reference = this.reference(userId);
    return this.firestore.runTransaction(async (transaction) => {
      const document = await transaction.get(reference);
      if (!document.exists) return false;
      const value = document.data() as MfaDocument;
      if (!enable && !value.enabled) return false;
      const secret = decryptMfaSecret(
        value.encryptedSecret,
        this.encryptionKey,
      );
      const counter = verifyTotp(secret, code);
      if (counter === null || counter === value.lastUsedCounter) return false;
      transaction.update(reference, {
        enabled: enable ? true : value.enabled,
        lastUsedCounter: counter,
        updatedAt: Timestamp.now(),
      });
      return true;
    });
  }

  public async remove(userId: string, code: string) {
    if (!(await this.verify(userId, code))) return false;
    await this.reference(userId).delete();
    return true;
  }
}
