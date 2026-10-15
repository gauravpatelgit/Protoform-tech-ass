import argon2 from "argon2";
import { createHash, randomBytes } from "crypto";

export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });

export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password).catch(() => false);

// Opaque refresh tokens are stored only as a SHA-256 digest.
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const generateOpaqueToken = () => randomBytes(32).toString("base64url");
