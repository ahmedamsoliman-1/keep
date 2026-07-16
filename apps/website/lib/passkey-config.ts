import "server-only";

export function getPasskeyConfiguration() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const origin = new URL(configuredUrl).origin;
  return {
    origin,
    rpId: new URL(origin).hostname,
    rpName: process.env.NEXT_PUBLIC_APP_NAME ?? "Envault",
  };
}
