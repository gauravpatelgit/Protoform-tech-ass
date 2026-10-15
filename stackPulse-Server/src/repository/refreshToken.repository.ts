import { Op, type Transaction } from "@sequelize/core";
import { RefreshToken } from "#database/models/index.js";

export const refreshTokenRepository = {
  findByHash: (tokenHash: string) => RefreshToken.findOne({ where: { tokenHash } }),

  create: (values: { id: string; userId: string; tokenHash: string; expiresAt: Date }, transaction?: Transaction) =>
    RefreshToken.create({ ...values, revokedAt: null, replacedBy: null }, { transaction }),

  // Returns true only for the caller that actually flipped the token, which makes rotation race-safe.
  revoke: async (id: string, replacedBy: string | null, transaction?: Transaction) => {
    const [count] = await RefreshToken.update({ revokedAt: new Date(), replacedBy }, { where: { id, revokedAt: { [Op.is]: null } }, transaction });
    return count > 0;
  },

  revokeAllForUser: (userId: string) => RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } }),
};
