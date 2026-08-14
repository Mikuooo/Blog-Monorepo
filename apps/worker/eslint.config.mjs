import baseConfig from '@blog/eslint-config/base'

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    ignores: [
      'src/infrastructure/**/*.ts',
      // This file is the documented, dedicated Outbox persistence adapter.
      'src/jobs/scheduled-publication-dispatcher.ts',
    ],
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
