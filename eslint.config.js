import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // A camada de dados mora em src/data/. Componentes consomem os hooks de lá
      // em vez de falar com o banco direto.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/integrations/supabase/client", "@/integrations/supabase/client"],
              message:
                "Importe os hooks de @/data/* em vez do client do Supabase. Acesso ao banco só dentro de src/data/.",
            },
          ],
        },
      ],
    },
  },
  {
    // src/data/ É a camada de dados. AuthContext e ResetPassword só usam
    // `supabase.auth` (sessão/senha), nunca tabelas.
    files: [
      "src/data/**/*.{ts,tsx}",
      "src/contexts/AuthContext.tsx",
      "src/pages/ResetPassword.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
);
