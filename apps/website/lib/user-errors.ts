import { EnvaultApiError } from "@envault/api-client";

const apiMessages: Partial<Record<EnvaultApiError["error"]["code"], string>> = {
  UNAUTHENTICATED: "Your session has expired. Sign in again to continue.",
  FORBIDDEN: "You do not have permission to perform this action.",
  EMAIL_NOT_VERIFIED: "Verify your email address before continuing.",
  VAULT_LOCKED: "Unlock or create your vault before continuing.",
  VAULT_ALREADY_EXISTS: "A vault already exists for this account.",
  INVALID_REQUEST:
    "Some submitted information is invalid. Review it and try again.",
  ENVIRONMENT_VERSION_CONFLICT:
    "This environment changed in another session. Refresh before saving again.",
  FIRESTORE_UNAVAILABLE:
    "Envault could not reach its data service. Try again in a moment.",
};

export function getUserFacingError(error: unknown, fallback: string): string {
  if (error instanceof EnvaultApiError) {
    return apiMessages[error.error.code] ?? fallback;
  }
  return fallback;
}
