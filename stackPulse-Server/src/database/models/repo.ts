import { DataTypes, Model } from "@sequelize/core";
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from "@sequelize/core";
import {
  Attribute,
  AutoIncrement,
  BelongsTo,
  CreatedAt,
  Default,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "@sequelize/core/decorators-legacy";
import { Developer } from "./developer.js";

@Table({ tableName: "repos", underscored: true })
export class Repo extends Model<InferAttributes<Repo>, InferCreationAttributes<Repo>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Unique
  declare githubId: number;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  declare developerId: number;

  @Attribute(DataTypes.STRING(100))
  @NotNull
  declare name: string;

  @Attribute(DataTypes.STRING(140))
  @NotNull
  declare fullName: string;

  @Attribute(DataTypes.TEXT)
  declare description: string | null;

  @Attribute(DataTypes.STRING(512))
  @NotNull
  declare htmlUrl: string;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(false)
  declare isFork: CreationOptional<boolean>;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(false)
  declare isArchived: CreationOptional<boolean>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Default(0)
  declare stars: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Default(0)
  declare forks: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Default(0)
  declare openIssues: CreationOptional<number>;

  @Attribute(DataTypes.STRING(64))
  declare primaryLanguage: string | null;

  @Attribute(DataTypes.DATE(3))
  declare pushedAt: Date | null;

  @Attribute(DataTypes.DATE(3))
  declare githubCreatedAt: Date | null;

  @Attribute(DataTypes.DATE(3))
  declare languagesFetchedAt: Date | null;

  @Attribute(DataTypes.DATE(3))
  declare commitsFetchedAt: Date | null;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;

  @BelongsTo(() => Developer, "developerId")
  declare developer?: NonAttribute<Developer>;
}
