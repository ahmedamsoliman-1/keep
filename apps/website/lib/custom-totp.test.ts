import { describe, expect, it } from "vitest";

import { encodeBase32, generateTotp } from "./custom-totp";

describe("custom TOTP", () => {
  it("matches an RFC 6238 SHA-1 test vector", () => {
    const secret = encodeBase32(Buffer.from("12345678901234567890"));
    expect(generateTotp(secret, 59_000, 8)).toBe("94287082");
  });
});
