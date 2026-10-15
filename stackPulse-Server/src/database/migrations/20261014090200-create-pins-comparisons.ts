import { DataTypes, type QueryInterface } from "sequelize";

const timestamps = () => ({
  created_at: { type: DataTypes.DATE(3), allowNull: false },
  updated_at: { type: DataTypes.DATE(3), allowNull: false },
});

const tableOptions = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const id = () => ({ type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false });

const userId = () => ({
  type: DataTypes.UUID,
  allowNull: false,
  references: { model: "users", key: "id" },
  onDelete: "CASCADE",
});

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable(
    "pins",
    {
      id: id(),
      user_id: userId(),
      repo_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "repos", key: "id" },
        onDelete: "CASCADE",
      },
      note: { type: DataTypes.TEXT, allowNull: true },
      // JSON array of lowercase strings; MySQL has no array type.
      tags: { type: DataTypes.JSON, allowNull: false },
      ...timestamps(),
    },
    tableOptions,
  );
  await queryInterface.addIndex("pins", ["user_id", "repo_id"], { name: "pins_user_repo", unique: true });
  await queryInterface.addIndex("pins", ["user_id", "created_at"], { name: "pins_user_created_at" });

  await queryInterface.createTable(
    "comparisons",
    {
      id: id(),
      user_id: userId(),
      name: { type: DataTypes.STRING(100), allowNull: false },
      ...timestamps(),
    },
    tableOptions,
  );
  await queryInterface.addIndex("comparisons", ["user_id", "name"], { name: "comparisons_user_name", unique: true });
  await queryInterface.addIndex("comparisons", ["user_id", "created_at"], { name: "comparisons_user_created_at" });

  await queryInterface.createTable(
    "comparison_developers",
    {
      comparison_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        allowNull: false,
        references: { model: "comparisons", key: "id" },
        onDelete: "CASCADE",
      },
      developer_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        allowNull: false,
        references: { model: "developers", key: "id" },
        onDelete: "CASCADE",
      },
      position: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    },
    tableOptions,
  );
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("comparison_developers");
  await queryInterface.dropTable("comparisons");
  await queryInterface.dropTable("pins");
}
