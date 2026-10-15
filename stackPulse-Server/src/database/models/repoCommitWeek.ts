import { DataTypes, Model } from "@sequelize/core";
import type { InferAttributes, InferCreationAttributes } from "@sequelize/core";
import { Attribute, NotNull, PrimaryKey, Table } from "@sequelize/core/decorators-legacy";

@Table({ tableName: "repo_commit_weeks", underscored: true, timestamps: false })
export class RepoCommitWeek extends Model<InferAttributes<RepoCommitWeek>, InferCreationAttributes<RepoCommitWeek>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  declare repoId: number;

  // YYYY-MM-DD, Monday (UTC).
  @Attribute(DataTypes.DATEONLY)
  @PrimaryKey
  declare weekStart: string;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @NotNull
  declare commits: number;
}
