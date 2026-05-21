// =============================================================================
// src/lib/nanoid.ts — Lightweight ID Generator (no external dependency)
// =============================================================================
// Generates URL-safe random strings for bank reference codes.
// Uses Node.js crypto for secure randomness.
// =============================================================================

import { randomBytes } from "crypto";

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function nanoid(size: number = 21): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
