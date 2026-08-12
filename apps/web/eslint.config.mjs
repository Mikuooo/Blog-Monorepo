import nextConfig from '@blog/eslint-config/next'

const config = [
  ...nextConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@blog/database',
                '@blog/database/*',
                '@blog/internal-api-client',
                '@blog/internal-api-client/*',
                '@blog/event-contracts',
                '@blog/event-contracts/*',
                '@prisma/*',
              ],
              message:
                'Public web code may only consume public transport and presentation packages.',
            },
          ],
        },
      ],
    },
  },
]

export default config
