import { DataTypes, Model } from "@sequelize/core";
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from "@sequelize/core";
import {
  AutoIncrement,
  Attribute,
  CreatedAt,
  Default,
  HasMany,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from "@sequelize/core/decorators-legacy";
import { Repo } from "./repo.js";

export type EnrichmentStatus = "pending" | "running" | "ready" | "partial" | "failed";

@Table({ tableName: "developers", underscored: true })
export class Developer extends Model<InferAttributes<Developer>, InferCreationAttributes<Developer>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Unique
  declare githubId: number;

  @Attribute(DataTypes.STRING(39))
  @NotNull
  @Unique
  declare githubUsername: string;

  @Attribute(DataTypes.STRING(255))
  declare name: string | null;

  @Attribute(DataTypes.TEXT)
  declare bio: string | null;

  @Attribute(DataTypes.STRING(255))
  declare company: string | null;

  @Attribute(DataTypes.STRING(255))
  declare location: string | null;

  @Attribute(DataTypes.STRING(512))
  declare blog: string | null;

  @Attribute(DataTypes.STRING(512))
  @NotNull
  declare htmlUrl: string;

  @Attribute(DataTypes.STRING(512))
  @NotNull
  declare avatarUrl: string;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Default(0)
  declare followers: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Default(0)
  declare following: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  @Default(0)
  declare publicRepos: CreationOptional<number>;

  @Attribute(DataTypes.DATE(3))
  declare githubCreatedAt: Date | null;

  @Attribute(DataTypes.STRING(255))
  declare profileEtag: string | null;

  @Attribute(DataTypes.STRING(255))
  declare reposEtag: string | null;

  @Attribute(DataTypes.DATE(3))
  @NotNull
  declare fetchedAt: Date;

  @Attribute(DataTypes.DATE(3))
  declare reposFetchedAt: Date | null;

  @Attribute(DataTypes.STRING(16))
  @NotNull
  @Default("pending")
  declare enrichmentStatus: CreationOptional<EnrichmentStatus>;

  @Attribute(DataTypes.DATE(3))
  declare enrichedAt: Date | null;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;

  @HasMany(() => Repo, "developerId")
  declare repos?: NonAttribute<Repo[]>;
}
