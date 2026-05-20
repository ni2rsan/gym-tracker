import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded string containing IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: IV (12) + encrypted + tag (16), all base64
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Decrypt a base64-encoded string produced by `encrypt()`.
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

/**
 * Attempt to decrypt, but if TOKEN_ENCRYPTION_KEY is not set, return the value as-is.
 * This allows gradual migration: old plaintext tokens still work.
 */
export function decryptOrPassthrough(value: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) return value;
  try {
    return decrypt(value);
  } catch {
    // Value is probably plaintext (pre-encryption migration)
    return value;
  }
}

/**
 * Encrypt only if TOKEN_ENCRYPTION_KEY is set. Otherwise return plaintext.
 * This allows the app to work without encryption configured.
 */
export function encryptIfKeySet(plaintext: string): string {
  if (!process.env.TOKEN_ENCRYPTION_KEY) return plaintext;
  return encrypt(plaintext);
}
