import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

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
    SystemModule,
    InternalSystemModule,
  ],
})
export class AppModule {}
