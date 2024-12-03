import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import stylisticTs from "@stylistic/eslint-plugin-ts";

export default [{
    ignores: ["**/out", "**/dist", "**/*.d.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@stylistic/ts": stylisticTs,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 6,
        sourceType: "module",
    },

    files: ["**/*.ts"],

    rules: {
        "@typescript-eslint/naming-convention": "warn",
        "@stylistic/ts/semi": "warn",
        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "off",
    },
}];