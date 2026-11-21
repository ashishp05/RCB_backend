import eslintPluginNode from 'eslint-plugin-node';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginSecurity from 'eslint-plugin-security';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';

let eslintPluginUnicorn = null;
try {
  eslintPluginUnicorn = (await import('eslint-plugin-unicorn')).default;
} catch {
  // eslint-plugin-unicorn uses Node 20+ features (/v regex flag)
}

const pluginsMap = {
  node: eslintPluginNode,
  '@typescript-eslint': typescriptEslintPlugin,
  prettier: eslintPluginPrettier,
  import: eslintPluginImport,
  'simple-import-sort': eslintPluginSimpleImportSort,
  security: eslintPluginSecurity,
};

const rulesMap = {
  // Prettier integration
  'prettier/prettier': 'error',

  // Import sorting
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',

  // TypeScript-specific rules
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-explicit-any': 'warn',

  // Node.js rules
  'node/no-process-env': 'error',

  // Relaxed rules for flexibility
  'security/detect-object-injection': 'off',

  // Import rules
  'import/extensions': 'off',
};

if (eslintPluginUnicorn) {
  pluginsMap['unicorn'] = eslintPluginUnicorn;
  rulesMap['unicorn/prefer-module'] = 'off';
  rulesMap['unicorn/no-array-reduce'] = 'off';
  rulesMap['unicorn/filename-case'] = [
    'error',
    {
      case: 'kebabCase',
      ignore: ['README.md'],
    },
  ];
}

export default [
  // Ignore patterns
  {
    ignores: ['dist', 'node_modules', 'prisma', 'prisma.config.ts'],
  },
  // Base config for TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: pluginsMap,
    rules: rulesMap,
  },
  // Turn off ESLint rules that conflict with Prettier
  eslintConfigPrettier,
];
