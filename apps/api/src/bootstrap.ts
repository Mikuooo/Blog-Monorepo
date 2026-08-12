import { ValidationPipe, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module.js'
import { InternalSystemModule } from './modules/system/internal-system.module.js'
import { SystemModule } from './modules/system/system.module.js'

export type CreateApplicationOptions = {
  disableLogger?: boolean
}

export async function createApplication(options: CreateApplicationOptions = {}) {
  const app = options.disableLogger
    ? await NestFactory.create(AppModule, { logger: false })
    : await NestFactory.create(AppModule, { bufferLogs: true })

  if (!options.disableLogger) app.useLogger(app.get(Logger))
  app.enableCors()
  app.enableShutdownHooks()
  app.setGlobalPrefix('api')
  app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI })
  app.use(helmet())
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )

  const publicDocument = createPublicOpenApiDocument(app)
  SwaggerModule.setup('docs', app, publicDocument)
  return app
}

export function createPublicOpenApiDocument(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  const config = new DocumentBuilder()
    .setTitle('Blog Platform Public API')
    .setDescription('Public and administration HTTP contract.')
    .setVersion('1.0.0')
    .build()
  return SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    include: [SystemModule],
  })
}

export function createInternalOpenApiDocument(app: Awaited<ReturnType<typeof NestFactory.create>>) {
  const config = new DocumentBuilder()
    .setTitle('Blog Platform Internal API')
    .setDescription('Private workload-to-API command contract.')
    .setVersion('1.0.0')
    .addBearerAuth(
      { bearerFormat: 'workload-token', scheme: 'bearer', type: 'http' },
      'internal-workload',
    )
    .build()
  return SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    include: [InternalSystemModule],
  })
}
