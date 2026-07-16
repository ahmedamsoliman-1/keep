import { EnvaultApiError } from "@envault/api-client";
import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "./auth-errors";

describe("authentication error messages", () => {
  it("turns invalid email codes into actionable copy", () => {
    expect(
      getAuthErrorMessage(
        new FirebaseError("auth/invalid-email", "Firebase internal message"),
        "login",
      ),
    ).toBe("Enter a valid email address.");
  });

  it("does not reveal whether an account exists", () => {
    const unknownUser = getAuthErrorMessage(
      new FirebaseError("auth/user-not-found", "Firebase internal message"),
      "login",
    );
    const wrongPassword = getAuthErrorMessage(
      new FirebaseError("auth/wrong-password", "Firebase internal message"),
      "login",
    );

    expect(unknownUser).toBe("The email or password is incorrect.");
    expect(wrongPassword).toBe(unknownUser);
  });

  it("does not expose API implementation details", () => {
    const error = new EnvaultApiError(
      401,
      { code: "UNAUTHENTICATED", message: "Internal authentication detail" },
      "request-id",
    );

    expect(getAuthErrorMessage(error, "session")).toBe(
      "Your secure session could not be established. Sign in again.",
    );
  });
});
