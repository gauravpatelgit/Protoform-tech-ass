import { User } from "#database/models/index.js";

export const userRepository = {
  findById: (id: string) => User.findByPk(id),
  findByEmail: (email: string) => User.findOne({ where: { email } }),
  create: (values: { id: string; email: string; passwordHash: string }) => User.create(values),
};
