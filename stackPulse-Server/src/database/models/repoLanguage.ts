import { DataTypes, Model } from "@sequelize/core";
import type { InferAttributes, InferCreationAttributes } from "@sequelize/core";
import { Attribute, NotNull, PrimaryKey, Table } from "@sequelize/core/decorators-legacy";

@Table({ tableName: "repo_languages", underscored: true, timestamps: false })
export class RepoLanguage extends Model<InferAttributes<RepoLanguage>, InferCreationAttributes<RepoLanguage>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  declare repoId: number;

  @Attribute(DataTypes.STRING(64))
  @PrimaryKey
  declare language: string;

  // BIGINT comes back from MySQL as a string; always wrap reads in Number().
  @Attribute(DataTypes.BIGINT.UNSIGNED)
  @NotNull
  declare bytes: number | string;
}
