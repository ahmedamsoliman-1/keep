import { updateProfileRequestSchema } from "@keephq/api-contract";
import type { NextRequest } from "next/server";

import {
  errorResponse,
  invalidRequestResponse,
  successResponse,
} from "@/lib/api-response";
import { getAdminAuth } from "@/lib/firebase-admin";
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
  return successResponse(user, requestId);
}

export async function PATCH(request: NextRequest) {
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
  const parsed = updateProfileRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return invalidRequestResponse(requestId);

  try {
    const updated = await getAdminAuth().updateUser(user.id, {
      displayName: parsed.data.displayName,
    });
    return successResponse(
      {
        id: updated.uid,
        email: updated.email ?? null,
        displayName: updated.displayName ?? null,
        emailVerified: updated.emailVerified,
        mfaEnabled: (updated.multiFactor?.enrolledFactors.length ?? 0) > 0,
      },
      requestId,
    );
  } catch {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "The profile could not be updated." },
      requestId,
      500,
    );
  }
}
