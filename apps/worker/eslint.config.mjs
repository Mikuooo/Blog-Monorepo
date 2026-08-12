import baseConfig from '@blog/eslint-config/base'

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@blog/database',
                '@blog/database/*',
                '@prisma/*',
                '@blog/api',
                '@blog/api/*',
              ],
              message:
                'Worker processors use generated internal contracts and never API implementation code.',
            },
          ],
        },
      ],
    },
  },
]
