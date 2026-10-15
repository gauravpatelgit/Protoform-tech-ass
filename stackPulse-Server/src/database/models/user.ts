import { DataTypes, Model } from "@sequelize/core";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "@sequelize/core";
import { Attribute, CreatedAt, NotNull, PrimaryKey, Table, Unique, UpdatedAt } from "@sequelize/core/decorators-legacy";

@Table({ tableName: "users", underscored: true })
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  @Attribute(DataTypes.UUID)
  @PrimaryKey
  declare id: string;

  @Attribute(DataTypes.STRING(255))
  @NotNull
  @Unique
  declare email: string;

  @Attribute(DataTypes.STRING(255))
  @NotNull
  declare passwordHash: string;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;
}
