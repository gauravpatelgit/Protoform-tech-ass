import { DataTypes, Model } from "@sequelize/core";
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from "@sequelize/core";
import { Attribute, AutoIncrement, BelongsTo, CreatedAt, NotNull, PrimaryKey, Table, UpdatedAt } from "@sequelize/core/decorators-legacy";
import { Repo } from "./repo.js";

@Table({ tableName: "pins", underscored: true })
export class Pin extends Model<InferAttributes<Pin>, InferCreationAttributes<Pin>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.UUID)
  @NotNull
  declare userId: string;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  declare repoId: number;

  @Attribute(DataTypes.TEXT)
  declare note: string | null;

  @Attribute(DataTypes.JSON)
  @NotNull
  declare tags: string[];

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Repo, "repoId")
  declare repo?: NonAttribute<Repo>;
}
