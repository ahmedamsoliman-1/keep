import { mfaCodeRequestSchema } from "@envault/api-contract";
import type { NextRequest } from "next/server";

import {
  errorResponse,
  invalidRequestResponse,
  successResponse,
} from "@/lib/api-response";
import { getAdminFirestore, getMfaConfiguration } from "@/lib/firebase-admin";
import { MfaRepository } from "@/lib/mfa-repository";
import { hasTrustedOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!hasTrustedOrigin(request))
    return errorResponse(
      { code: "FORBIDDEN", message: "The request origin is not allowed." },
      requestId,
      403,
    );
  const user = await getSessionUser();
  if (!user)
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      requestId,
      401,
    );
  const parsed = mfaCodeRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return invalidRequestResponse(requestId);
  const repository = new MfaRepository(
    getAdminFirestore(),
    getMfaConfiguration().encryptionKey,
  );
  if (!(await repository.confirm(user.id, parsed.data.code)))
    return errorResponse(
      { code: "INVALID_MFA_CODE", message: "The code is invalid." },
      requestId,
      400,
    );
  return successResponse({ enabled: true as const }, requestId);
}
