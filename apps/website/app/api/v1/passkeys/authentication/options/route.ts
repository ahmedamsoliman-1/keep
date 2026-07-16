import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { envaultRedisKey } from "@envault/redis";

import { successResponse } from "@/lib/api-response";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getPasskeyConfiguration } from "@/lib/passkey-config";

export async function POST() {
  const requestId = crypto.randomUUID();
  const configuration = getPasskeyConfiguration();
  const options = await generateAuthenticationOptions({
    rpID: configuration.rpId,
    userVerification: "required",
  });
  const flowId = crypto.randomUUID();
  await getAdminFirestore().set(
    envaultRedisKey("passkey-challenge", "authentication", flowId),
    { challenge: options.challenge },
    { ex: 300 },
  );
  return successResponse({ flowId, options }, requestId);
}
