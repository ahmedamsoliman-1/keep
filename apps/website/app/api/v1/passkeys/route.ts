import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { PasskeyRepository } from "@/lib/passkey-repository";
import { hasTrustedOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const requestId = crypto.randomUUID();
  const user = await getSessionUser();
  if (!user) {
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      requestId,
      401,
    );
  }
  const credentials = await new PasskeyRepository(getAdminFirestore()).list(
    user.id,
  );
  return successResponse(
    credentials.map(({ id, name, createdAt, lastUsedAt, backedUp }) => ({
      id,
      name,
      createdAt,
      lastUsedAt,
      backedUp,
    })),
    requestId,
  );
}

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!hasTrustedOrigin(request)) {
    return errorResponse(
      { code: "FORBIDDEN", message: "The request origin is not allowed." },
      requestId,
      403,
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      requestId,
      401,
    );
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return errorResponse(
      { code: "INVALID_REQUEST", message: "A passkey ID is required." },
      requestId,
      400,
    );
  }
  const removed = await new PasskeyRepository(getAdminFirestore()).remove(
    user.id,
    id,
  );
  if (!removed) {
    return errorResponse(
      { code: "INVALID_REQUEST", message: "The passkey was not found." },
      requestId,
      404,
    );
  }
  return successResponse({ removed: true as const }, requestId);
}
