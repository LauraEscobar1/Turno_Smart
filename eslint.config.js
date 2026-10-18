// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    // supabase/functions es código Deno: lo revisan `deno lint` y `deno check`.
    ignores: ['dist/*', '.expo/*', 'coverage/*', 'node_modules/*', 'supabase/functions/**'],
  },
  {
    files: ['app/**/*.tsx'],
    rules: {
      // Las rutas solo componen pantallas; los estilos con color salen de src/theme.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3}){1,2}$|^rgba?\\(/]',
          message: 'No escribas colores a mano en las pantallas: usa `colors` de @/theme.',
        },
      ],
    },
  },
]);
