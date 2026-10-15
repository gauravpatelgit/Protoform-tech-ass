import { DataTypes, type QueryInterface } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.addColumn("developers", "repos_etag", { type: DataTypes.STRING(255), allowNull: true });
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("developers", "repos_etag");
}
