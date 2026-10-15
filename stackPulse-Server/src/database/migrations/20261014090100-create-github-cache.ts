import { DataTypes, type QueryInterface } from "sequelize";

const timestamps = () => ({
  created_at: { type: DataTypes.DATE(3), allowNull: false },
  updated_at: { type: DataTypes.DATE(3), allowNull: false },
});

const tableOptions = { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" };

const id = () => ({ type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false });

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable(
    "developers",
    {
      id: id(),
      github_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      github_username: { type: DataTypes.STRING(39), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(255), allowNull: true },
      bio: { type: DataTypes.TEXT, allowNull: true },
      company: { type: DataTypes.STRING(255), allowNull: true },
      location: { type: DataTypes.STRING(255), allowNull: true },
      blog: { type: DataTypes.STRING(512), allowNull: true },
      html_url: { type: DataTypes.STRING(512), allowNull: false },
      avatar_url: { type: DataTypes.STRING(512), allowNull: false },
      followers: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      following: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      public_repos: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      github_created_at: { type: DataTypes.DATE(3), allowNull: true },
      profile_etag: { type: DataTypes.STRING(255), allowNull: true },
      fetched_at: { type: DataTypes.DATE(3), allowNull: false },
      repos_fetched_at: { type: DataTypes.DATE(3), allowNull: true },
      enrichment_status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "pending" },
      enriched_at: { type: DataTypes.DATE(3), allowNull: true },
      ...timestamps(),
    },
    tableOptions,
  );
  await queryInterface.addIndex("developers", ["fetched_at"], { name: "developers_fetched_at" });

  await queryInterface.createTable(
    "repos",
    {
      id: id(),
      github_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      developer_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "developers", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: DataTypes.STRING(100), allowNull: false },
      full_name: { type: DataTypes.STRING(140), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      html_url: { type: DataTypes.STRING(512), allowNull: false },
      is_fork: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      stars: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      forks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      open_issues: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      primary_language: { type: DataTypes.STRING(64), allowNull: true },
      pushed_at: { type: DataTypes.DATE(3), allowNull: true },
      github_created_at: { type: DataTypes.DATE(3), allowNull: true },
      languages_fetched_at: { type: DataTypes.DATE(3), allowNull: true },
      commits_fetched_at: { type: DataTypes.DATE(3), allowNull: true },
      ...timestamps(),
    },
    tableOptions,
  );
  await queryInterface.addIndex("repos", ["developer_id", "name"], { name: "repos_developer_name", unique: true });
  await queryInterface.addIndex("repos", ["developer_id", "stars"], { name: "repos_developer_stars" });
  await queryInterface.addIndex("repos", ["developer_id", "pushed_at"], { name: "repos_developer_pushed_at" });

  await queryInterface.createTable(
    "repo_languages",
    {
      repo_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        allowNull: false,
        references: { model: "repos", key: "id" },
        onDelete: "CASCADE",
      },
      language: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
      bytes: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    tableOptions,
  );

  await queryInterface.createTable(
    "repo_commit_weeks",
    {
      repo_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        allowNull: false,
        references: { model: "repos", key: "id" },
        onDelete: "CASCADE",
      },
      week_start: { type: DataTypes.DATEONLY, primaryKey: true, allowNull: false },
      commits: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    },
    tableOptions,
  );
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("repo_commit_weeks");
  await queryInterface.dropTable("repo_languages");
  await queryInterface.dropTable("repos");
  await queryInterface.dropTable("developers");
}
