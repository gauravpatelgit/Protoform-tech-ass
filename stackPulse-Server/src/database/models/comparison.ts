import { DataTypes, Model } from "@sequelize/core";
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from "@sequelize/core";
import { Attribute, AutoIncrement, CreatedAt, HasMany, NotNull, PrimaryKey, Table, UpdatedAt } from "@sequelize/core/decorators-legacy";
import { ComparisonDeveloper } from "./comparisonDeveloper.js";

@Table({ tableName: "comparisons", underscored: true })
export class Comparison extends Model<InferAttributes<Comparison>, InferCreationAttributes<Comparison>> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.UUID)
  @NotNull
  declare userId: string;

  @Attribute(DataTypes.STRING(100))
  @NotNull
  declare name: string;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;

  @HasMany(() => ComparisonDeveloper, "comparisonId")
  declare members?: NonAttribute<ComparisonDeveloper[]>;
}
