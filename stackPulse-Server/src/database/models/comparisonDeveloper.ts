import { DataTypes, Model } from "@sequelize/core";
import type { InferAttributes, InferCreationAttributes, NonAttribute } from "@sequelize/core";
import { Attribute, BelongsTo, NotNull, PrimaryKey, Table } from "@sequelize/core/decorators-legacy";
import { Developer } from "./developer.js";

@Table({ tableName: "comparison_developers", underscored: true, timestamps: false })
export class ComparisonDeveloper extends Model<InferAttributes<ComparisonDeveloper>, InferCreationAttributes<ComparisonDeveloper>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  declare comparisonId: number;

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  declare developerId: number;

  @Attribute(DataTypes.SMALLINT.UNSIGNED)
  @NotNull
  declare position: number;

  @BelongsTo(() => Developer, "developerId")
  declare developer?: NonAttribute<Developer>;
}
