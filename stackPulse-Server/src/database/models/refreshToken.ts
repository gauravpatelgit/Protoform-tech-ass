import { DataTypes, Model } from "@sequelize/core";
import type { CreationOptional, InferAttributes, InferCreationAttributes } from "@sequelize/core";
import { Attribute, CreatedAt, NotNull, PrimaryKey, Table, Unique } from "@sequelize/core/decorators-legacy";

@Table({ tableName: "refresh_tokens", underscored: true, updatedAt: false })
export class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  @Attribute(DataTypes.UUID)
  @PrimaryKey
  declare id: string;

  @Attribute(DataTypes.UUID)
  @NotNull
  declare userId: string;

  @Attribute(DataTypes.STRING(64))
  @NotNull
  @Unique
  declare tokenHash: string;

  @Attribute(DataTypes.DATE(3))
  @NotNull
  declare expiresAt: Date;

  @Attribute(DataTypes.DATE(3))
  declare revokedAt: Date | null;

  @Attribute(DataTypes.UUID)
  declare replacedBy: string | null;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;
}
