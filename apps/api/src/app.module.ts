import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

import { PrismaInfrastructureModule } from './infrastructure/prisma/prisma-infrastructure.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { ArticlesModule } from './modules/articles/articles.module.js'
import { InternalArticlesModule } from './modules/articles/internal-articles.module.js'
import { InternalSystemModule } from './modules/system/internal-system.module.js'
import { SystemModule } from './modules/system/system.module.js'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      },
    }),
    PrismaInfrastructureModule,
    AuthModule,
    ArticlesModule,
    InternalArticlesModule,
    SystemModule,
    InternalSystemModule,
  ],
})
export class AppModule {}
