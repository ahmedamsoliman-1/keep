import "server-only";

import type {
  CreateEnvironmentRequest,
  CreateVariableRequest,
  EnvironmentDto,
  VariableDto,
} from "@envault/api-contract";
import { type Firestore, Timestamp } from "firebase-admin/firestore";

interface EnvironmentDocument {
  ownerId: string;
  vaultId: string;
  projectId: string;
  name: string;
  kind: EnvironmentDto["kind"];
  version: number;
  contentRevision: string;
  archivedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface VariableDocument {
  ownerId: string;
  vaultId: string;
  projectId: string;
  environmentId: string;
  key: string;
  normalizedKey: string;
  encryptedValue: string;
  encryptionIv: string;
  encryptionVersion: number;
  visibility: VariableDto["visibility"];
  tags: string[];
  description: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function environmentDto(
  id: string,
  value: EnvironmentDocument,
): EnvironmentDto {
  return {
    id,
    vaultId: value.vaultId,
    projectId: value.projectId,
    name: value.name,
    kind: value.kind,
    version: value.version,
    contentRevision: value.contentRevision,
    archivedAt: value.archivedAt?.toDate().toISOString() ?? null,
    createdAt: value.createdAt.toDate().toISOString(),
    updatedAt: value.updatedAt.toDate().toISOString(),
  };
}

function variableDto(id: string, value: VariableDocument): VariableDto {
  return {
    id,
    vaultId: value.vaultId,
    projectId: value.projectId,
    environmentId: value.environmentId,
    key: value.key,
    encryptedValue: value.encryptedValue,
    encryptionIv: value.encryptionIv,
    encryptionVersion: value.encryptionVersion,
    visibility: value.visibility,
    tags: value.tags,
    description: value.description,
    createdAt: value.createdAt.toDate().toISOString(),
    updatedAt: value.updatedAt.toDate().toISOString(),
  };
}

export class FirestoreEnvironmentRepository {
  public constructor(private readonly firestore: Firestore) {}

  async #vaultId(ownerId: string) {
    const user = await this.firestore.collection("users").doc(ownerId).get();
    return (user.get("vaultId") as string | undefined) ?? null;
  }

  public async list(ownerId: string, projectId: string) {
    const vaultId = await this.#vaultId(ownerId);
    if (!vaultId) return [];
    const snapshot = await this.firestore
      .collection("vaults")
      .doc(vaultId)
      .collection("environments")
      .where("projectId", "==", projectId)
      .get();
    return snapshot.docs
      .map((item) =>
        environmentDto(item.id, item.data() as EnvironmentDocument),
      )
      .filter((item) => item.archivedAt === null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public async create(
    ownerId: string,
    projectId: string,
    input: CreateEnvironmentRequest,
  ) {
    const vaultId = await this.#vaultId(ownerId);
    if (!vaultId) return null;
    const reference = this.firestore
      .collection("vaults")
      .doc(vaultId)
      .collection("environments")
      .doc();
    const now = Timestamp.now();
    const value: EnvironmentDocument = {
      ownerId,
      vaultId,
      projectId,
      name: input.name,
      kind: input.kind,
      version: 0,
      contentRevision: crypto.randomUUID(),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await reference.create(value);
    return environmentDto(reference.id, value);
  }

  public async listVariables(ownerId: string, environmentId: string) {
    const vaultId = await this.#vaultId(ownerId);
    if (!vaultId) return null;
    const environmentReference = this.firestore
      .collection("vaults")
      .doc(vaultId)
      .collection("environments")
      .doc(environmentId);
    const [environment, variables] = await Promise.all([
      environmentReference.get(),
      this.firestore
        .collection("vaults")
        .doc(vaultId)
        .collection("variables")
        .where("environmentId", "==", environmentId)
        .get(),
    ]);
    if (!environment.exists || environment.get("ownerId") !== ownerId)
      return null;
    return {
      variables: variables.docs.map((item) =>
        variableDto(item.id, item.data() as VariableDocument),
      ),
      version: environment.get("version") as number,
    };
  }

  public async createVariable(
    ownerId: string,
    environmentId: string,
    input: CreateVariableRequest,
  ) {
    const vaultId = await this.#vaultId(ownerId);
    if (!vaultId) return null;
    const environmentReference = this.firestore
      .collection("vaults")
      .doc(vaultId)
      .collection("environments")
      .doc(environmentId);
    const variableReference = this.firestore
      .collection("vaults")
      .doc(vaultId)
      .collection("variables")
      .doc(input.id);

    return this.firestore.runTransaction(async (transaction) => {
      const environment = await transaction.get(environmentReference);
      if (!environment.exists || environment.get("ownerId") !== ownerId)
        return null;
      const currentVersion = environment.get("version") as number;
      if (currentVersion !== input.expectedVersion) {
        return { conflictVersion: currentVersion };
      }
      const existingKey = await transaction.get(
        this.firestore
          .collection("vaults")
          .doc(vaultId)
          .collection("variables")
          .where("environmentId", "==", environmentId),
      );
      if (
        existingKey.docs.some(
          (document) =>
            document.get("normalizedKey") === input.key.toUpperCase(),
        )
      ) {
        return { duplicate: true as const };
      }

      const now = Timestamp.now();
      const value: VariableDocument = {
        ownerId,
        vaultId,
        projectId: input.projectId,
        environmentId,
        key: input.key,
        normalizedKey: input.key.toUpperCase(),
        encryptedValue: input.encryptedValue,
        encryptionIv: input.encryptionIv,
        encryptionVersion: input.encryptionVersion,
        visibility: input.visibility,
        tags: input.tags,
        description: input.description,
        createdAt: now,
        updatedAt: now,
      };
      transaction.create(variableReference, value);
      transaction.update(environmentReference, {
        version: currentVersion + 1,
        contentRevision: crypto.randomUUID(),
        updatedAt: now,
      });
      return {
        variable: variableDto(variableReference.id, value),
        version: currentVersion + 1,
      };
    });
  }
}
