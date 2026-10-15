import { randomUUID } from "crypto";
import { UniqueConstraintError, type Transaction } from "@sequelize/core";
import { env } from "#config/env.js";
import { sequelize } from "#config/sequelize.js";
import { refreshTokenRepository } from "#repository/refreshToken.repository.js";
import { userRepository } from "#repository/user.repository.js";
import type { LoginInput, SignupInput } from "#schemas/auth.schema.js";
import { ConflictError, UnauthorizedError } from "#utils/app.errors.js";
import { generateOpaqueToken, hashPassword, sha256, verifyPassword } from "#utils/hash.js";
import { signAccessToken } from "#utils/jwt.js";

export interface PublicUser {
  id: string;
  email: string;
}

export interface Session {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

// A second tab may present a token that was rotated a moment ago; that is not treated as theft.
const REUSE_GRACE_MS = 10_000;

const toPublic = (user: { id: string; email: string }): PublicUser => ({ id: user.id, email: user.email });

// Precomputed so unknown emails cost the same as wrong passwords.
const dummyHash = hashPassword("stackpulse-dummy-password");

async function issueRefreshToken(userId: string, transaction?: Transaction) {
  const token = generateOpaqueToken();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 3600 * 1000);
  await refreshTokenRepository.create({ id, userId, tokenHash: sha256(token), expiresAt }, transaction);
  return { id, token, expiresAt };
}

async function startSession(user: { id: string; email: string }): Promise<Session> {
  const refresh = await issueRefreshToken(user.id);
  return {
    user: toPublic(user),
    accessToken: signAccessToken(user.id),
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  };
}

export const authService = {
  async signup({ email, password }: SignupInput): Promise<Session> {
    try {
      const user = await userRepository.create({ id: randomUUID(), email, passwordHash: await hashPassword(password) });
      return await startSession(user);
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new ConflictError("An account with this email already exists");
      throw error;
    }
  },

  async login({ email, password }: LoginInput): Promise<Session> {
    const user = await userRepository.findByEmail(email);
    const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), password);
    if (!user || !valid) throw new UnauthorizedError("Invalid email or password");
    return startSession(user);
  },

  async refresh(rawToken: string | undefined): Promise<Session> {
    if (!rawToken) throw new UnauthorizedError("Missing refresh token");

    const stored = await refreshTokenRepository.findByHash(sha256(rawToken));
    if (!stored) throw new UnauthorizedError("Invalid refresh token");

    if (stored.revokedAt) {
      const recentlyRotated = Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS;
      if (!recentlyRotated) await refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedError("Refresh token is no longer valid");
    }
    if (stored.expiresAt.getTime() <= Date.now()) throw new UnauthorizedError("Refresh token expired");

    const user = await userRepository.findById(stored.userId);
    if (!user) throw new UnauthorizedError("Invalid refresh token");

    const next = await sequelize.transaction(async (transaction) => {
      const rotated = await issueRefreshToken(user.id, transaction);
      const flipped = await refreshTokenRepository.revoke(stored.id, rotated.id, transaction);
      if (!flipped) throw new UnauthorizedError("Refresh token is no longer valid");
      return rotated;
    });

    return {
      user: toPublic(user),
      accessToken: signAccessToken(user.id),
      refreshToken: next.token,
      refreshExpiresAt: next.expiresAt,
    };
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const stored = await refreshTokenRepository.findByHash(sha256(rawToken));
    if (stored) await refreshTokenRepository.revoke(stored.id, null);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError("Account no longer exists");
    return toPublic(user);
  },
};
