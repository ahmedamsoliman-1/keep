import { mfaCodeRequestSchema } from "@envault/api-contract";
import type { NextRequest } from "next/server";

import {
  errorResponse,
  invalidRequestResponse,
  successResponse,
} from "@/lib/api-response";
import { createTotpSecret } from "@/lib/custom-totp";
import { getAdminFirestore, getMfaConfiguration } from "@/lib/firebase-admin";
import { MfaRepository } from "@/lib/mfa-repository";
import { hasTrustedOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session";

function repository() {
  return new MfaRepository(
    getAdminFirestore(),
    getMfaConfiguration().encryptionKey,
  );
}

export async function GET() {
  const requestId = crypto.randomUUID();
  const user = await getSessionUser();
  if (!user)
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      requestId,
      401,
    );
  return successResponse(await repository().status(user.id), requestId);
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!hasTrustedOrigin(request))
    return errorResponse(
      { code: "FORBIDDEN", message: "The request origin is not allowed." },
      requestId,
      403,
    );
  const user = await getSessionUser();
  if (!user?.email)
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      requestId,
      401,
    );
  try {
    const secret = createTotpSecret();
    await repository().begin(user.id, secret);
    const label = encodeURIComponent(`Envault:${user.email}`);
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=Envault&algorithm=SHA1&digits=6&period=30`;
    return successResponse({ secret, uri }, requestId, 201);
  } catch {
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "MFA enrollment could not start." },
      requestId,
      503,
    );
  }
}

export async function DELETE(request: NextRequest) {
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
  if (!(await repository().remove(user.id, parsed.data.code)))
    return errorResponse(
      { code: "INVALID_MFA_CODE", message: "The code is invalid." },
      requestId,
      400,
    );
  return successResponse({ enabled: false as const }, requestId);
}
