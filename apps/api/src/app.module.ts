import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

import { PrismaInfrastructureModule } from './infrastructure/prisma/prisma-infrastructure.module.js'
import { AccessControlModule } from './modules/access-control/access-control.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { ArticlesModule } from './modules/articles/articles.module.js'
import { InternalArticlesModule } from './modules/articles/internal-articles.module.js'
import { SettingsModule } from './modules/settings/settings.module.js'
import { InternalSystemModule } from './modules/system/internal-system.module.js'
import { SystemModule } from './modules/system/system.module.js'
import { TaxonomiesModule } from './modules/taxonomies/taxonomies.module.js'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      },
    }),
    PrismaInfrastructureModule,
    AccessControlModule,
    AuthModule,
    ArticlesModule,
    InternalArticlesModule,
    SettingsModule,
    SystemModule,
    InternalSystemModule,
    TaxonomiesModule,
  ],
})
export class AppModule {}
