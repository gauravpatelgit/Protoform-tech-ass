import { DataTypes, type QueryInterface } from "sequelize";

const timestamps = () => ({
  created_at: { type: DataTypes.DATE(3), allowNull: false },
  updated_at: { type: DataTypes.DATE(3), allowNull: false },
});

const tableOptions = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable(
    "users",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      // The utf8mb4_0900_ai_ci collation makes the unique index case-insensitive.
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      ...timestamps(),
    },
    tableOptions,
  );

  await queryInterface.createTable(
    "refresh_tokens",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE(3), allowNull: false },
      revoked_at: { type: DataTypes.DATE(3), allowNull: true },
      replaced_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE(3), allowNull: false },
    },
    tableOptions,
  );
  await queryInterface.addIndex("refresh_tokens", ["user_id"], { name: "refresh_tokens_user_id" });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("refresh_tokens");
  await queryInterface.dropTable("users");
}
