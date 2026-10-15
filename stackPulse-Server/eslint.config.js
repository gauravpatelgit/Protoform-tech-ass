import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", "logs", "src/config/sequelize.config.cjs"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
);
