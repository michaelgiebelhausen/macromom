// ESLint 9 flat config (replaces .eslintrc.js — eslintrc format was removed in ESLint 9).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'supabase/functions/**'],
  },
]);
