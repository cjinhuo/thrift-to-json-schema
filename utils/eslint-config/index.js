const config = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.lint.json',
  },
  reportUnusedDisableDirectives: true,
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  plugins: ['@typescript-eslint', 'html', 'sonarjs', 'import'],
  extends: [
    'plugin:import/recommended',
    'plugin:sonarjs/recommended',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/ban-types': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/no-unused-vars': [
      2,
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    eqeqeq: [2, 'always', { null: 'ignore' }],
    'import/no-unresolved': [0, { commonjs: true, amd: true }],
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal'],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    '@typescript-eslint/no-misused-promises': 2,
    '@typescript-eslint/ban-ts-comment': [
      2,
      {
        'ts-expect-error': false,
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': false,
      },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 0,
    // don't use for in operator
    '@typescript-eslint/no-for-in-array': 2,
    '@typescript-eslint/prefer-for-of': 2,
    // 避免非必要的布尔值比较
    '@typescript-eslint/no-unnecessary-boolean-literal-compare': 2,
    // switch 语句需要覆盖所有可能情况
    '@typescript-eslint/switch-exhaustiveness-check': 2,
    // 禁止将没有 await 的函数标记为 async
    '@typescript-eslint/require-await': 2,
    // 不允许给能自动推断出类型的 primitive 类型变量额外添加类型声明
    '@typescript-eslint/no-inferrable-types': 2,
    // 不允许在范型和返回值之外的地方使用 void 类型
    '@typescript-eslint/no-invalid-void-type': 2,
    // 不可变的私有属性标记成 readonly
    '@typescript-eslint/prefer-readonly': ['error', { onlyInlineLambdas: true }],
  },
}

module.exports = config
