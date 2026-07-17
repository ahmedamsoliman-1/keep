import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { keepRedisKey } from "@keephq/redis";
import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getPasskeyConfiguration } from "@/lib/passkey-config";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  if (!hasTrustedOrigin(request)) {
    return errorResponse(
      { code: "FORBIDDEN", message: "The request origin is not allowed." },
      requestId,
      403,
    );
  }
  const configuration = getPasskeyConfiguration(request);
  const options = await generateAuthenticationOptions({
    rpID: configuration.rpId,
    userVerification: "required",
  });
  const flowId = crypto.randomUUID();
  await getAdminFirestore().set(
    keepRedisKey("passkey-challenge", "authentication", flowId),
    {
      challenge: options.challenge,
      origin: configuration.origin,
      rpId: configuration.rpId,
    },
    { ex: 300 },
  );
  return successResponse({ flowId, options }, requestId);
}
