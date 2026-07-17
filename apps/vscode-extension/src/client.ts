import { KeepClient } from "@keephq/api-client";
import * as vscode from "vscode";

import { serverUrl, TOKEN_KEY } from "./config";

export async function getAccessToken(
  context: vscode.ExtensionContext,
): Promise<string | null> {
  return (await context.secrets.get(TOKEN_KEY)) ?? null;
}

export function createClient(token: string | null): KeepClient {
  return new KeepClient({
    baseUrl: serverUrl(),
    getAccessToken: () => Promise.resolve(token),
  });
}

/**
 * Resolves an authenticated client, or `null` (after warning the user) when no
 * device credential is stored.
 */
export async function requireClient(
  context: vscode.ExtensionContext,
): Promise<KeepClient | null> {
  const token = await getAccessToken(context);
  if (!token) {
    void vscode.window.showWarningMessage(
      "Sign in to Keep first (Keep: Sign in).",
    );
    return null;
  }
  return createClient(token);
}
