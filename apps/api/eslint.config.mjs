import baseConfig from '@blog/eslint-config/base'

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/infrastructure/**/*.ts', 'src/modules/**/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@blog/database', '@blog/database/*', '@prisma/*'],
              message:
                'Application and transport code must depend on repository contracts, not Prisma.',
            },
          ],
        },
      ],
    },
  },
]
