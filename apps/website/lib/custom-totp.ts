import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(value: string): Buffer {
  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("INVALID_BASE32");
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotp(
  secret: string,
  timestamp = Date.now(),
  digits = 6,
): string {
  const counter = Math.floor(timestamp / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(message)
    .digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/u.test(code)) return null;
  for (const offset of [-1, 0, 1]) {
    const timestamp = now + offset * 30_000;
    const expected = Buffer.from(generateTotp(secret, timestamp));
    const received = Buffer.from(code);
    if (
      expected.length === received.length &&
      timingSafeEqual(expected, received)
    ) {
      return Math.floor(timestamp / 30_000);
    }
  }
  return null;
}

function encryptionKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("INVALID_MFA_ENCRYPTION_KEY");
  return key;
}

export function encryptMfaSecret(secret: string, base64Key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(base64Key), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptMfaSecret(payload: string, base64Key: string): string {
  const [iv, tag, ciphertext] = payload.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("INVALID_MFA_SECRET");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(base64Key),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createTotpSecret() {
  return encodeBase32(randomBytes(20));
}
