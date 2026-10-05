/** @type {import("prettier").Config} */
const config = {
  singleQuote: true,
  trailingComma: 'es5',
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '^[./]'],
  importOrderSideEffects: false,
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};

export default config;
